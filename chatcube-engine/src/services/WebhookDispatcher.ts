import axios, { AxiosInstance } from "axios";
import Redis from "ioredis";
import pino from "pino";
import { config } from "../config";
import { WebhookEvent, WebhookEventType } from "../types";

const logger = pino({ name: "webhook-dispatcher" });

const DEAD_LETTER_KEY = "chatcube:dead_letter_queue";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;

interface WebhookPayload {
  event: WebhookEventType;
  instanceId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export class WebhookDispatcher {
  private readonly webhookUrl: string;
  private readonly client: AxiosInstance;
  private readonly redis: Redis;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || config.djangoWebhookUrl;

    this.client = axios.create({
      baseURL: this.webhookUrl,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        "X-Engine-Key": config.engineApiKey,
        "X-Forwarded-Proto": "https",
      },
    });

    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on("error", (err) => {
      logger.error({ err }, "Redis connection error (dead letter queue)");
    });

    this.redis.connect().catch((err) => {
      logger.error({ err }, "Failed to connect to Redis for dead letter queue");
    });
  }

  /**
   * Dispatch a webhook event to the Django backend with retry logic.
   * After all retries are exhausted the event is pushed to the dead letter queue.
   */
  async dispatch(
    event: WebhookEventType,
    instanceId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const payload: WebhookPayload = {
      event,
      instanceId,
      timestamp: Date.now(),
      data,
    };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.debug(
          { event, instanceId, attempt },
          "Dispatching webhook event",
        );

        await this.client.post("", payload);

        logger.info(
          { event, instanceId, attempt },
          "Webhook dispatched successfully",
        );
        return true;
      } catch (err: any) {
        const status = err?.response?.status;
        const message = err?.message || "Unknown error";

        logger.warn(
          { event, instanceId, attempt, status, message },
          "Webhook dispatch failed",
        );

        if (attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.debug(
            { delayMs, nextAttempt: attempt + 1 },
            "Waiting before retry",
          );
          await this.sleep(delayMs);
        }
      }
    }

    // All retries exhausted -- push to dead letter queue
    logger.error(
      { event, instanceId },
      "All retries exhausted, pushing to dead letter queue",
    );
    await this.pushToDeadLetterQueue(payload);
    return false;
  }

  /**
   * Return the number of events currently sitting in the dead letter queue.
   */
  async getDeadLetterCount(): Promise<number> {
    return this.redis.llen(DEAD_LETTER_KEY);
  }

  /**
   * Re-process every event in the dead letter queue by attempting to dispatch
   * each one again (with the same retry logic). Events that still fail are
   * pushed back to the queue after all successful ones have been removed.
   */
  async reprocessDeadLetterQueue(): Promise<{
    total: number;
    succeeded: number;
    failed: number;
  }> {
    const count = await this.redis.llen(DEAD_LETTER_KEY);
    if (count === 0) {
      logger.info("Dead letter queue is empty, nothing to reprocess");
      return { total: 0, succeeded: 0, failed: 0 };
    }

    logger.info({ count }, "Starting dead letter queue reprocessing");

    // Drain the entire queue atomically
    const items: string[] = [];
    for (let i = 0; i < count; i++) {
      const item = await this.redis.lpop(DEAD_LETTER_KEY);
      if (item) items.push(item);
    }

    let succeeded = 0;
    let failed = 0;

    for (const raw of items) {
      try {
        const payload: WebhookPayload = JSON.parse(raw);

        const ok = await this.dispatchWithRetry(payload);
        if (ok) {
          succeeded++;
        } else {
          // Push back -- dispatchWithRetry already logged the failure
          await this.redis.rpush(DEAD_LETTER_KEY, raw);
          failed++;
        }
      } catch (err) {
        logger.error({ err, raw }, "Failed to parse dead letter item");
        // Push the unparseable item back so it is not silently lost
        await this.redis.rpush(DEAD_LETTER_KEY, raw);
        failed++;
      }
    }

    logger.info(
      { total: items.length, succeeded, failed },
      "Dead letter queue reprocessing complete",
    );
    return { total: items.length, succeeded, failed };
  }

  /**
   * Gracefully disconnect from Redis.
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down webhook dispatcher");
    await this.redis.quit();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Attempt to deliver a payload with the standard retry policy.
   * Returns true on success, false after all retries are exhausted.
   * Does NOT push to the dead letter queue on failure (caller decides).
   */
  private async dispatchWithRetry(payload: WebhookPayload): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.client.post("", payload);
        logger.info(
          { event: payload.event, instanceId: payload.instanceId, attempt },
          "Dead letter event re-dispatched successfully",
        );
        return true;
      } catch (err: any) {
        const status = err?.response?.status;
        const message = err?.message || "Unknown error";
        logger.warn(
          {
            event: payload.event,
            instanceId: payload.instanceId,
            attempt,
            status,
            message,
          },
          "Dead letter re-dispatch failed",
        );

        if (attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await this.sleep(delayMs);
        }
      }
    }
    return false;
  }

  private async pushToDeadLetterQueue(payload: WebhookPayload): Promise<void> {
    try {
      const serialized = JSON.stringify(payload);
      await this.redis.rpush(DEAD_LETTER_KEY, serialized);
      logger.info(
        { event: payload.event, instanceId: payload.instanceId },
        "Event pushed to dead letter queue",
      );
    } catch (err) {
      logger.error(
        { err, event: payload.event, instanceId: payload.instanceId },
        "Failed to push event to dead letter queue -- event is lost",
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
