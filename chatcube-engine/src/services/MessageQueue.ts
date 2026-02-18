import Redis from "ioredis";
import { randomUUID } from "crypto";
import pino from "pino";
import { config } from "../config";
import { QueuedMessage, SendMessagePayload, MessageResult } from "../types";

const logger = pino({ name: "message-queue" });

const REDIS_KEY_PREFIX = "chatcube:queue:";
const MAX_QUEUE_SIZE = config.maxQueueSize;
const MAX_RETRIES = config.maxMessageRetries;
const RETRY_DELAY_MS = 5000;

type SenderFn = (jid: string, content: SendMessagePayload) => Promise<MessageResult>;

interface RegisteredSender {
  sender: SenderFn;
  delay: number;
}

/**
 * Per-instance message queue with Redis persistence and retry logic.
 *
 * Each WhatsApp instance gets its own sequential queue to enforce
 * rate limiting (anti-ban delay between messages). Failed messages
 * are retried up to MAX_RETRIES times before being dropped.
 *
 * Queue state is persisted to Redis so messages survive engine restarts.
 */
export class MessageQueue {
  private redis: Redis;
  private queues: Map<string, QueuedMessage[]> = new Map();
  private senders: Map<string, RegisteredSender> = new Map();
  private processing: Map<string, boolean> = new Map();
  // Tracks last recipient JID per instance for inter-conversation delay (anti-ban)
  private lastJid: Map<string, string> = new Map();

  constructor() {
    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number): number | null {
        if (times > 10) {
          logger.error("Redis retry limit reached, giving up");
          return null;
        }
        return Math.min(times * 200, 5000);
      },
      lazyConnect: false,
    });

    this.redis.on("connect", () => {
      logger.info("Redis connected for message queue");
    });

    this.redis.on("error", (err: Error) => {
      logger.error({ error: err.message }, "Redis connection error");
    });
  }

  /**
   * Register a send function for a specific instance.
   * Also restores any persisted queue items from Redis.
   *
   * @param instanceId - The WhatsApp instance ID
   * @param sender - Async function that actually sends the message
   * @param delay - Minimum ms between sequential messages (anti-ban). Defaults to config.defaultMessageDelay
   */
  registerSender(
    instanceId: string,
    sender: SenderFn,
    delay?: number
  ): void {
    this.senders.set(instanceId, {
      sender,
      delay: delay ?? config.defaultMessageDelay,
    });

    // Restore any persisted queue from Redis
    this.loadQueue(instanceId)
      .then((items) => {
        if (items.length > 0) {
          this.queues.set(instanceId, items);
          logger.info(
            { instanceId, count: items.length },
            "Restored queued messages from Redis"
          );
          // Resume processing the restored queue
          this.processQueue(instanceId);
        }
      })
      .catch((err: Error) => {
        logger.error(
          { instanceId, error: err.message },
          "Failed to restore queue from Redis"
        );
      });
  }

  /**
   * Unregister a sender and clean up its queue state.
   * Persists any remaining items to Redis before removing from memory.
   */
  unregisterSender(instanceId: string): void {
    const queue = this.queues.get(instanceId);
    if (queue && queue.length > 0) {
      // Persist remaining items before cleanup
      this.persistQueue(instanceId).catch((err: Error) => {
        logger.error(
          { instanceId, error: err.message },
          "Failed to persist queue during unregister"
        );
      });
    }

    this.senders.delete(instanceId);
    this.queues.delete(instanceId);
    this.processing.delete(instanceId);

    logger.debug({ instanceId }, "Sender unregistered");
  }

  /**
   * Enqueue a message for rate-limited sending.
   * Returns immediately with a message ID -- the actual send happens asynchronously.
   *
   * @returns MessageResult with success=true and the queued messageId, or success=false if queue is full
   */
  enqueue(
    instanceId: string,
    jid: string,
    content: SendMessagePayload
  ): MessageResult {
    if (!this.senders.has(instanceId)) {
      return {
        success: false,
        error: `No sender registered for instance ${instanceId}`,
      };
    }

    let queue = this.queues.get(instanceId);
    if (!queue) {
      queue = [];
      this.queues.set(instanceId, queue);
    }

    if (queue.length >= MAX_QUEUE_SIZE) {
      logger.warn(
        { instanceId, queueSize: queue.length },
        "Queue is full, rejecting message"
      );
      return {
        success: false,
        error: `Queue full for instance ${instanceId} (max ${MAX_QUEUE_SIZE})`,
      };
    }

    const messageId = randomUUID();
    const item: QueuedMessage = {
      id: messageId,
      instanceId,
      jid,
      content,
      addedAt: Date.now(),
      retries: 0,
    };

    queue.push(item);

    // Persist updated queue to Redis (fire-and-forget)
    this.persistQueue(instanceId).catch((err: Error) => {
      logger.error(
        { instanceId, error: err.message },
        "Failed to persist queue after enqueue"
      );
    });

    // Kick off processing if not already running
    this.processQueue(instanceId);

    logger.debug(
      { instanceId, messageId, jid, queueSize: queue.length },
      "Message enqueued"
    );

    return {
      success: true,
      messageId,
      timestamp: Date.now(),
    };
  }

  /**
   * Get the current queue length for an instance
   */
  getQueueSize(instanceId: string): number {
    const queue = this.queues.get(instanceId);
    return queue ? queue.length : 0;
  }

  /**
   * Graceful shutdown: persist all queues and disconnect Redis
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down message queue...");

    // Persist all in-memory queues
    const persistPromises: Promise<void>[] = [];
    for (const instanceId of this.queues.keys()) {
      persistPromises.push(
        this.persistQueue(instanceId).catch((err: Error) => {
          logger.error(
            { instanceId, error: err.message },
            "Failed to persist queue during shutdown"
          );
        })
      );
    }
    await Promise.allSettled(persistPromises);

    // Disconnect Redis
    try {
      await this.redis.quit();
      logger.info("Redis disconnected");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      logger.error({ error: errMsg }, "Error disconnecting Redis");
    }
  }

  // ---------- Private Methods ----------

  /**
   * Process messages in the queue sequentially.
   * Enforces the per-instance delay between sends (anti-ban).
   * Retries failed messages up to MAX_RETRIES times.
   */
  private async processQueue(instanceId: string): Promise<void> {
    // Prevent concurrent processing for the same instance
    if (this.processing.get(instanceId)) {
      return;
    }

    this.processing.set(instanceId, true);

    try {
      const queue = this.queues.get(instanceId);
      const registration = this.senders.get(instanceId);

      if (!queue || !registration) {
        this.processing.set(instanceId, false);
        return;
      }

      while (queue.length > 0) {
        const item = queue[0];

        try {
          const result = await registration.sender(item.jid, item.content);

          if (result.success) {
            // Success: remove from queue
            queue.shift();
            logger.debug(
              { instanceId, messageId: item.id, jid: item.jid },
              "Message sent successfully"
            );
          } else {
            // Sender returned failure (not an exception)
            item.retries += 1;

            if (item.retries >= MAX_RETRIES) {
              queue.shift();
              logger.error(
                {
                  instanceId,
                  messageId: item.id,
                  jid: item.jid,
                  retries: item.retries,
                  error: result.error,
                },
                "Message dropped after max retries"
              );
            } else {
              logger.warn(
                {
                  instanceId,
                  messageId: item.id,
                  jid: item.jid,
                  retry: item.retries,
                  maxRetries: MAX_RETRIES,
                  error: result.error,
                },
                "Message send failed, will retry"
              );
              await this.sleep(RETRY_DELAY_MS);
              continue; // Retry immediately (skip the inter-message delay)
            }
          }
        } catch (err) {
          // Exception thrown during send
          item.retries += 1;
          const errMsg = err instanceof Error ? err.message : "Unknown error";

          if (item.retries >= MAX_RETRIES) {
            queue.shift();
            logger.error(
              {
                instanceId,
                messageId: item.id,
                jid: item.jid,
                retries: item.retries,
                error: errMsg,
              },
              "Message dropped after max retries (exception)"
            );
          } else {
            logger.warn(
              {
                instanceId,
                messageId: item.id,
                jid: item.jid,
                retry: item.retries,
                maxRetries: MAX_RETRIES,
                error: errMsg,
              },
              "Message send threw exception, will retry"
            );
            await this.sleep(RETRY_DELAY_MS);
            continue; // Retry immediately
          }
        }

        // Persist after each processed message
        await this.persistQueue(instanceId).catch((persistErr: Error) => {
          logger.error(
            { instanceId, error: persistErr.message },
            "Failed to persist queue after processing"
          );
        });

        // Anti-ban delay: randomized base delay + extra pause between conversations
        if (queue.length > 0) {
          const nextItem = queue[0];
          const lastJid = this.lastJid.get(instanceId);
          const isDifferentConversation = !!lastJid && lastJid !== item.jid;

          // Jitter: base * [0.7 .. 1.5]
          const jitter = registration.delay * 0.8 * Math.random();
          const baseDelay = registration.delay + jitter;

          // Extra pause when switching to a new conversation (2–5s)
          const interConvExtra = isDifferentConversation
            ? 2000 + Math.random() * 3000
            : 0;

          if (interConvExtra > 0) {
            logger.debug({ instanceId, extraMs: Math.round(interConvExtra) }, "Anti-ban: inter-conversation pause");
          }

          await this.sleep(Math.round(baseDelay + interConvExtra));
        }

        this.lastJid.set(instanceId, item.jid);
      }
    } finally {
      this.processing.set(instanceId, false);
    }
  }

  /**
   * Promise-based sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Persist the current in-memory queue for an instance to a Redis list.
   * Replaces the entire list atomically using a pipeline.
   */
  private async persistQueue(instanceId: string): Promise<void> {
    const key = `${REDIS_KEY_PREFIX}${instanceId}`;
    const queue = this.queues.get(instanceId);

    if (!queue || queue.length === 0) {
      // Clear the Redis key if queue is empty
      await this.redis.del(key);
      return;
    }

    const pipeline = this.redis.pipeline();
    pipeline.del(key);

    for (const item of queue) {
      pipeline.rpush(key, JSON.stringify(item));
    }

    // Set TTL of 24 hours to auto-cleanup stale queues
    pipeline.expire(key, 86400);

    await pipeline.exec();

    logger.debug(
      { instanceId, count: queue.length },
      "Queue persisted to Redis"
    );
  }

  /**
   * Load a persisted queue from Redis.
   * Returns the deserialized items (or empty array if none exist).
   */
  private async loadQueue(instanceId: string): Promise<QueuedMessage[]> {
    const key = `${REDIS_KEY_PREFIX}${instanceId}`;
    const items = await this.redis.lrange(key, 0, -1);

    if (!items || items.length === 0) {
      return [];
    }

    const parsed: QueuedMessage[] = [];

    for (const raw of items) {
      try {
        const item = JSON.parse(raw) as QueuedMessage;
        parsed.push(item);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        logger.warn(
          { instanceId, error: errMsg },
          "Skipping corrupt queue item from Redis"
        );
      }
    }

    // Clear from Redis after loading (will be re-persisted by processQueue)
    await this.redis.del(key);

    logger.debug(
      { instanceId, loaded: parsed.length, skipped: items.length - parsed.length },
      "Queue loaded from Redis"
    );

    return parsed;
  }
}
