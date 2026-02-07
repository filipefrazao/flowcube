import pino from "pino";
import { EngineFactory } from "../engines/EngineFactory";
import { BaileysEngine } from "../engines/BaileysEngine";
import { CloudApiEngine } from "../engines/CloudApiEngine";
import { WebhookDispatcher } from "./WebhookDispatcher";
import { MessageQueue } from "./MessageQueue";
import {
  IEngine,
  InstanceConfig,
  InstanceInfo,
  InstanceStatus,
  SendMessagePayload,
  MessageResult,
} from "../types";

const logger = pino({ name: "instance-manager" });

type EngineInstance = BaileysEngine | CloudApiEngine;

/**
 * Singleton that manages all WhatsApp engine instances.
 * Provides CRUD operations, event wiring, and lifecycle management.
 */
export class InstanceManager {
  private static instance: InstanceManager;
  private instances: Map<string, EngineInstance> = new Map();
  private configs: Map<string, InstanceConfig> = new Map();
  private webhookDispatcher: WebhookDispatcher;
  private messageQueue: MessageQueue;

  private constructor() {
    this.webhookDispatcher = new WebhookDispatcher();
    this.messageQueue = new MessageQueue();
  }

  /**
   * Get or create the singleton instance
   */
  static getInstance(): InstanceManager {
    if (!InstanceManager.instance) {
      InstanceManager.instance = new InstanceManager();
    }
    return InstanceManager.instance;
  }

  /**
   * Create and register a new instance
   */
  async createInstance(
    id: string,
    name: string,
    engineType: string,
    extraConfig?: Partial<InstanceConfig>
  ): Promise<InstanceInfo> {
    if (this.instances.has(id)) {
      throw new Error(`Instance ${id} already exists`);
    }

    const instanceConfig: InstanceConfig = {
      id,
      name,
      engine: engineType as any,
      ...extraConfig,
    };

    const engine = EngineFactory.create(id, instanceConfig) as EngineInstance;

    // Wire up events to webhook dispatcher
    this.wireEvents(engine);

    // Register message sender in the queue
    this.messageQueue.registerSender(
      id,
      (jid: string, content: SendMessagePayload) =>
        engine.sendMessage(jid, content),
      instanceConfig.messageDelay
    );

    this.instances.set(id, engine);
    this.configs.set(id, instanceConfig);

    logger.info({ id, name, engine: engineType }, "Instance created");

    // Auto-connect
    try {
      await engine.connect();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      logger.warn(
        { id, error: errMsg },
        "Instance created but initial connection failed"
      );
    }

    return this.getInstanceInfo(id)!;
  }

  /**
   * Get an instance by ID
   */
  getEngine(id: string): EngineInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * Get instance info
   */
  getInstanceInfo(id: string): InstanceInfo | null {
    const engine = this.instances.get(id);
    const cfg = this.configs.get(id);
    if (!engine || !cfg) return null;

    const info: InstanceInfo = {
      id: cfg.id,
      name: cfg.name,
      engine: cfg.engine,
      status: engine.status,
    };

    if (engine instanceof BaileysEngine) {
      const baileysInfo = engine.getInfo();
      info.phoneNumber = baileysInfo.phoneNumber || undefined;
      info.pushName = baileysInfo.pushName || undefined;
      info.connectedAt = baileysInfo.connectedAt || undefined;
    } else if (engine instanceof CloudApiEngine) {
      const cloudInfo = engine.getInfo();
      info.phoneNumber = cloudInfo.phoneNumber || undefined;
      info.pushName = cloudInfo.pushName || undefined;
      info.connectedAt = cloudInfo.connectedAt || undefined;
    }

    return info;
  }

  /**
   * Delete an instance (disconnect and remove)
   */
  async deleteInstance(id: string): Promise<void> {
    const engine = this.instances.get(id);
    if (!engine) {
      throw new Error(`Instance ${id} not found`);
    }

    try {
      await engine.disconnect();
    } catch (error: unknown) {
      logger.warn({ id }, "Error during disconnect on delete");
    }

    engine.removeAllListeners();
    this.messageQueue.unregisterSender(id);
    this.instances.delete(id);
    this.configs.delete(id);

    logger.info({ id }, "Instance deleted");
  }

  /**
   * Get all instances info
   */
  getAllInstances(): InstanceInfo[] {
    const result: InstanceInfo[] = [];
    for (const id of this.instances.keys()) {
      const info = this.getInstanceInfo(id);
      if (info) result.push(info);
    }
    return result;
  }

  /**
   * Get instance count
   */
  getInstanceCount(): number {
    return this.instances.size;
  }

  /**
   * Reconnect a specific instance
   */
  async reconnectInstance(id: string): Promise<void> {
    const engine = this.instances.get(id);
    if (!engine) {
      throw new Error(`Instance ${id} not found`);
    }

    logger.info({ id }, "Reconnecting instance");
    try {
      await engine.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    await engine.connect();
  }

  /**
   * Disconnect a specific instance (without deleting)
   */
  async disconnectInstance(id: string): Promise<void> {
    const engine = this.instances.get(id);
    if (!engine) {
      throw new Error(`Instance ${id} not found`);
    }
    await engine.disconnect();
  }

  /**
   * Enqueue a message for rate-limited sending
   */
  async sendMessage(
    instanceId: string,
    jid: string,
    content: SendMessagePayload
  ): Promise<MessageResult> {
    const engine = this.instances.get(instanceId);
    if (!engine) {
      return {
        success: false,
        error: `Instance ${instanceId} not found`,
      };
    }

    if (engine.status !== "connected") {
      return {
        success: false,
        error: `Instance ${instanceId} is not connected (status: ${engine.status})`,
      };
    }

    return this.messageQueue.enqueue(instanceId, jid, content);
  }

  /**
   * Get contacts for an instance
   */
  async getContacts(
    instanceId: string
  ): Promise<Array<{ id: string; name?: string; notify?: string }>> {
    const engine = this.instances.get(instanceId);
    if (!engine) return [];
    return engine.getContacts();
  }

  /**
   * Get groups for an instance
   */
  async getGroups(
    instanceId: string
  ): Promise<Array<{ id: string; subject: string; participants: number }>> {
    const engine = this.instances.get(instanceId);
    if (!engine) return [];
    return engine.getGroups();
  }

  /**
   * Get QR code for an instance
   */
  async getQRCode(instanceId: string): Promise<string | null> {
    const engine = this.instances.get(instanceId);
    if (!engine) return null;
    return engine.getQRCode();
  }

  /**
   * Get pairing code for an instance
   */
  async getPairingCode(
    instanceId: string,
    phone: string
  ): Promise<string | null> {
    const engine = this.instances.get(instanceId);
    if (!engine) return null;
    return engine.getPairingCode(phone);
  }

  /**
   * Graceful shutdown of all instances
   */
  async shutdownAll(): Promise<void> {
    logger.info(
      { count: this.instances.size },
      "Shutting down all instances"
    );

    const promises: Promise<void>[] = [];
    for (const [id, engine] of this.instances) {
      promises.push(
        engine.disconnect().catch((error: unknown) => {
          logger.error({ id }, "Error disconnecting during shutdown");
        })
      );
    }

    await Promise.allSettled(promises);
    this.instances.clear();
    this.configs.clear();
    logger.info("All instances shut down");
  }

  // ---------- Private Methods ----------

  /**
   * Wire engine events to the webhook dispatcher
   */
  private wireEvents(engine: EngineInstance): void {
    engine.on(
      "message_received",
      (instanceId: string, data: Record<string, unknown>) => {
        this.webhookDispatcher
          .dispatch("message_received", instanceId, data)
          .catch((err: unknown) => {
            logger.error(
              { instanceId, error: err },
              "Failed to dispatch message_received"
            );
          });
      }
    );

    engine.on(
      "message_status_update",
      (instanceId: string, data: Record<string, unknown>) => {
        this.webhookDispatcher
          .dispatch("message_status_update", instanceId, data)
          .catch((err: unknown) => {
            logger.error(
              { instanceId, error: err },
              "Failed to dispatch message_status_update"
            );
          });
      }
    );

    engine.on(
      "status_change",
      (instanceId: string, data: Record<string, unknown>) => {
        this.webhookDispatcher
          .dispatch("instance_status_change", instanceId, data)
          .catch((err: unknown) => {
            logger.error(
              { instanceId, error: err },
              "Failed to dispatch instance_status_change"
            );
          });
      }
    );

    engine.on("qr", (instanceId: string, qrCode: string) => {
      this.webhookDispatcher
        .dispatch("qr_code_update", instanceId, { qrCode })
        .catch((err: unknown) => {
          logger.error(
            { instanceId, error: err },
            "Failed to dispatch qr_code_update"
          );
        });
    });
  }
}
