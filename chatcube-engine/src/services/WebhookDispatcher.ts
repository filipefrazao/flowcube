import axios, { AxiosInstance } from "axios";
import pino from "pino";
import { config } from "../config";
import { WebhookEvent, WebhookEventType } from "../types";

const logger = pino({ name: "webhook-dispatcher" });

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Dispatches webhook events to the Django backend via HTTP POST.
 * Includes retry with exponential backoff.
 */
export class WebhookDispatcher {
  private client: AxiosInstance;
  private webhookUrl: string;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || config.djangoWebhookUrl;
    this.client = axios.create({
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "X-Engine-Key": config.engineApiKey,
        "X-Forwarded-Proto": "https",
      },
    });
  }

  /**
   * Dispatch an event to the Django backend
   */
  async dispatch(
    event: WebhookEventType,
    instanceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const payload: WebhookEvent = {
      event,
      instanceId,
      timestamp: Date.now(),
      data,
    };

    await this.sendWithRetry(payload, 0);
  }

  /**
   * Send webhook with exponential backoff retry
   */
  private async sendWithRetry(
    payload: WebhookEvent,
    attempt: number
  ): Promise<void> {
    try {
      const response = await this.client.post(this.webhookUrl, payload);
      logger.debug(
        {
          event: payload.event,
          instanceId: payload.instanceId,
          status: response.status,
        },
        "Webhook dispatched successfully"
      );
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error";
      
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(
          {
            event: payload.event,
            instanceId: payload.instanceId,
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            nextRetryMs: delay,
            error: errMsg,
          },
          "Webhook dispatch failed, retrying..."
        );
        await this.sleep(delay);
        await this.sendWithRetry(payload, attempt + 1);
      } else {
        logger.error(
          {
            event: payload.event,
            instanceId: payload.instanceId,
            attempts: attempt + 1,
            error: errMsg,
          },
          "Webhook dispatch failed after all retries"
        );
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
