import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";
import { QueuedMessage, SendMessagePayload, MessageResult } from "../types";

const logger = pino({ name: "message-queue" });

type SendFunction = (
  jid: string,
  content: SendMessagePayload
) => Promise<MessageResult>;

/**
 * Per-instance message queue with rate limiting (anti-ban).
 * Ensures a configurable delay between messages sent from the same instance.
 */
export class MessageQueue {
  private queues: Map<string, QueuedMessage[]> = new Map();
  private processing: Map<string, boolean> = new Map();
  private senders: Map<string, SendFunction> = new Map();
  private delays: Map<string, number> = new Map();

  /**
   * Register a sender function for an instance
   */
  registerSender(
    instanceId: string,
    sender: SendFunction,
    delay?: number
  ): void {
    this.senders.set(instanceId, sender);
    this.delays.set(instanceId, delay || config.defaultMessageDelay);
    if (!this.queues.has(instanceId)) {
      this.queues.set(instanceId, []);
    }
    logger.debug(
      { instanceId, delay: this.delays.get(instanceId) },
      "Sender registered"
    );
  }

  /**
   * Unregister a sender (on instance deletion)
   */
  unregisterSender(instanceId: string): void {
    this.senders.delete(instanceId);
    this.delays.delete(instanceId);
    this.queues.delete(instanceId);
    this.processing.delete(instanceId);
    logger.debug({ instanceId }, "Sender unregistered");
  }

  /**
   * Enqueue a message for sending
   */
  async enqueue(
    instanceId: string,
    jid: string,
    content: SendMessagePayload
  ): Promise<MessageResult> {
    const sender = this.senders.get(instanceId);
    if (!sender) {
      return {
        success: false,
        error: `No sender registered for instance ${instanceId}`,
      };
    }

    const queuedMsg: QueuedMessage = {
      id: uuidv4(),
      instanceId,
      jid,
      content,
      addedAt: Date.now(),
      retries: 0,
    };

    let queue = this.queues.get(instanceId);
    if (!queue) {
      queue = [];
      this.queues.set(instanceId, queue);
    }
    queue.push(queuedMsg);

    logger.debug(
      {
        instanceId,
        messageId: queuedMsg.id,
        queueLength: queue.length,
      },
      "Message enqueued"
    );

    // Start processing if not already running
    if (!this.processing.get(instanceId)) {
      this.processQueue(instanceId);
    }

    // Return immediately with a queued status
    return {
      success: true,
      messageId: queuedMsg.id,
      timestamp: queuedMsg.addedAt,
    };
  }

  /**
   * Process the queue for an instance sequentially with delay
   */
  private async processQueue(instanceId: string): Promise<void> {
    if (this.processing.get(instanceId)) return;
    this.processing.set(instanceId, true);

    const queue = this.queues.get(instanceId);
    const sender = this.senders.get(instanceId);
    const delay = this.delays.get(instanceId) || config.defaultMessageDelay;

    if (!queue || !sender) {
      this.processing.set(instanceId, false);
      return;
    }

    while (queue.length > 0) {
      const msg = queue.shift();
      if (!msg) break;

      try {
        const result = await sender(msg.jid, msg.content);
        logger.info(
          {
            instanceId,
            messageId: msg.id,
            jid: msg.jid,
            success: result.success,
          },
          "Message sent from queue"
        );
      } catch (error: unknown) {
        const errMsg =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(
          {
            instanceId,
            messageId: msg.id,
            jid: msg.jid,
            error: errMsg,
          },
          "Failed to send message from queue"
        );
      }

      // Wait between messages (anti-ban)
      if (queue.length > 0) {
        await this.sleep(delay);
      }
    }

    this.processing.set(instanceId, false);
  }

  /**
   * Get queue size for an instance
   */
  getQueueSize(instanceId: string): number {
    return this.queues.get(instanceId)?.length || 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
