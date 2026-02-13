import { Pool } from "pg";
import pino from "pino";
import { EngineFactory } from "../engines/EngineFactory";
import { BaileysEngine } from "../engines/BaileysEngine";
import { CloudApiEngine } from "../engines/CloudApiEngine";
import { WebhookDispatcher } from "./WebhookDispatcher";
import { MessageQueue } from "./MessageQueue";
import { config } from "../config";
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

// Health check interval: 60 seconds
const HEALTH_CHECK_INTERVAL_MS = 60000;

/**
 * Singleton that manages all WhatsApp engine instances.
 * Provides CRUD operations, event wiring, lifecycle management,
 * auto-restore on startup, and periodic health monitoring.
 */
export class InstanceManager {
  private static instance: InstanceManager;
  private instances: Map<string, EngineInstance> = new Map();
  private configs: Map<string, InstanceConfig> = new Map();
  private webhookDispatcher: WebhookDispatcher;
  private messageQueue: MessageQueue;
  private pgPool: Pool | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

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
   * Set the PostgreSQL pool for auth state persistence
   */
  setPgPool(pool: Pool): void {
    this.pgPool = pool;
    logger.info("PostgreSQL pool set for auth state persistence");
  }

  /**
   * Restore all previously connected Baileys instances on startup.
   * Queries the Django database for active instances that have auth state.
   */
  async restoreInstances(): Promise<void> {
    if (!this.pgPool) {
      logger.warn("No PostgreSQL pool - cannot restore instances");
      return;
    }

    try {
      // Query Django's whatsapp instance table for active baileys instances
      const result = await this.pgPool.query(`
        SELECT wi.engine_instance_id, wi.name, wi.engine, wi.phone_number,
               wi.phone_number_id, wi.access_token
        FROM chatcube_whatsappinstance wi
        INNER JOIN chatcube_auth_creds ac ON wi.engine_instance_id = ac.instance_id
        WHERE wi.engine = 'baileys'
          AND wi.engine_instance_id IS NOT NULL
          AND wi.engine_instance_id != ''
      `);

      if (result.rows.length === 0) {
        logger.info("No Baileys instances to restore");
        return;
      }

      logger.info({ count: result.rows.length }, "Restoring Baileys instances from database");

      for (const row of result.rows) {
        const instanceId = row.engine_instance_id;
        const name = row.name || `restored-${instanceId}`;

        if (this.instances.has(instanceId)) {
          logger.debug({ instanceId }, "Instance already exists, skipping restore");
          continue;
        }

        try {
          const instanceConfig: InstanceConfig = {
            id: instanceId,
            name,
            engine: "baileys",
          };

          const engine = new BaileysEngine(instanceId, instanceConfig, this.pgPool!);
          this.wireEvents(engine);
          this.messageQueue.registerSender(
            instanceId,
            (jid: string, content: SendMessagePayload) => engine.sendMessage(jid, content),
            instanceConfig.messageDelay
          );

          this.instances.set(instanceId, engine);
          this.configs.set(instanceId, instanceConfig);

          // Connect in background (don't block other restorations)
          engine.connect().catch((error: unknown) => {
            const errMsg = error instanceof Error ? error.message : "Unknown error";
            logger.warn({ instanceId, error: errMsg }, "Restored instance initial connection failed (will auto-retry)");
          });

          logger.info({ instanceId, name }, "Instance restored");
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          logger.error({ instanceId, error: errMsg }, "Failed to restore instance");
        }
      }

      // Also try to restore Cloud API instances
      const cloudResult = await this.pgPool.query(`
        SELECT engine_instance_id, name, phone_number, phone_number_id, access_token
        FROM chatcube_whatsappinstance
        WHERE engine = 'cloud_api'
          AND engine_instance_id IS NOT NULL
          AND engine_instance_id != ''
          AND phone_number_id IS NOT NULL
          AND access_token IS NOT NULL
      `);

      if (cloudResult.rows.length > 0) {
        logger.info({ count: cloudResult.rows.length }, "Restoring Cloud API instances");

        for (const row of cloudResult.rows) {
          const instanceId = row.engine_instance_id;
          if (this.instances.has(instanceId)) continue;

          try {
            const instanceConfig: InstanceConfig = {
              id: instanceId,
              name: row.name || `cloud-${instanceId}`,
              engine: "cloud_api",
              phoneNumberId: row.phone_number_id,
              accessToken: row.access_token,
            };

            const engine = EngineFactory.create(instanceId, instanceConfig) as EngineInstance;
            this.wireEvents(engine);
            this.messageQueue.registerSender(
              instanceId,
              (jid: string, content: SendMessagePayload) => engine.sendMessage(jid, content),
              instanceConfig.messageDelay
            );

            this.instances.set(instanceId, engine);
            this.configs.set(instanceId, instanceConfig);

            engine.connect().catch((error: unknown) => {
              const errMsg = error instanceof Error ? error.message : "Unknown error";
              logger.warn({ instanceId, error: errMsg }, "Cloud API instance connection failed");
            });

            logger.info({ instanceId }, "Cloud API instance restored");
          } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : "Unknown error";
            logger.error({ instanceId, error: errMsg }, "Failed to restore Cloud API instance");
          }
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ error: errMsg }, "Failed to restore instances from database");
    }
  }

  /**
   * Start periodic health monitoring.
   * Checks all connected instances every 60 seconds.
   * Reconnects zombie connections automatically.
   */
  startHealthMonitor(): void {
    if (this.healthCheckTimer) return;

    logger.info({ intervalMs: HEALTH_CHECK_INTERVAL_MS }, "Starting health monitor");

    this.healthCheckTimer = setInterval(async () => {
      for (const [id, engine] of this.instances) {
        if (engine instanceof BaileysEngine) {
          // Check if engine claims connected but socket is dead
          if (engine.status === "connected" && !engine.isAlive()) {
            logger.warn({ id }, "Health check: zombie connection detected, forcing reconnect");
            try {
              await engine.disconnect();
              await engine.connect();
            } catch (error: unknown) {
              const errMsg = error instanceof Error ? error.message : "Unknown error";
              logger.error({ id, error: errMsg }, "Health check: reconnect failed");
            }
          }
        }
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    // Don't keep process alive just for health checks
    this.healthCheckTimer.unref();
  }

  /**
   * Stop the health monitor
   */
  stopHealthMonitor(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.info("Health monitor stopped");
    }
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

    let engine: EngineInstance;

    if (engineType === "baileys" && this.pgPool) {
      engine = new BaileysEngine(id, instanceConfig, this.pgPool);
    } else {
      engine = EngineFactory.create(id, instanceConfig) as EngineInstance;
    }

    this.wireEvents(engine);
    this.messageQueue.registerSender(
      id,
      (jid: string, content: SendMessagePayload) => engine.sendMessage(jid, content),
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
      logger.warn({ id, error: errMsg }, "Instance created but initial connection failed");
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
    } catch {
      logger.warn({ id }, "Error during disconnect on delete");
    }

    engine.removeAllListeners();
    this.messageQueue.unregisterSender(id);
    this.instances.delete(id);
    this.configs.delete(id);

    logger.info({ id }, "Instance deleted");
  }

  /**
   * Logout an instance (disconnect + clear session).
   * Requires new QR code to reconnect.
   */
  async logoutInstance(id: string): Promise<void> {
    const engine = this.instances.get(id);
    if (!engine) {
      throw new Error(`Instance ${id} not found`);
    }

    if (engine instanceof BaileysEngine) {
      await engine.logout();
    } else {
      await engine.disconnect();
    }

    logger.info({ id }, "Instance logged out");
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
   * Reconnect a specific instance (preserves session)
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
   * Disconnect a specific instance (without deleting, preserves session)
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
      return { success: false, error: `Instance ${instanceId} not found` };
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
  async getPairingCode(instanceId: string, phone: string): Promise<string | null> {
    const engine = this.instances.get(instanceId);
    if (!engine) return null;
    return engine.getPairingCode(phone);
  }

  /**
   * Graceful shutdown of all instances (preserves sessions)
   */
  async shutdownAll(): Promise<void> {
    logger.info({ count: this.instances.size }, "Shutting down all instances");
    this.stopHealthMonitor();

    const promises: Promise<void>[] = [];
    for (const [id, engine] of this.instances) {
      promises.push(
        engine.disconnect().catch(() => {
          logger.error({ id }, "Error disconnecting during shutdown");
        })
      );
    }

    await Promise.allSettled(promises);
    this.instances.clear();
    this.configs.clear();
    logger.info("All instances shut down (sessions preserved)");
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
            logger.error({ instanceId, error: err }, "Failed to dispatch message_received");
          });
      }
    );

    engine.on(
      "message_status_update",
      (instanceId: string, data: Record<string, unknown>) => {
        this.webhookDispatcher
          .dispatch("message_status_update", instanceId, data)
          .catch((err: unknown) => {
            logger.error({ instanceId, error: err }, "Failed to dispatch message_status_update");
          });
      }
    );

    engine.on(
      "status_change",
      (instanceId: string, data: Record<string, unknown>) => {
        this.webhookDispatcher
          .dispatch("instance_status_change", instanceId, data)
          .catch((err: unknown) => {
            logger.error({ instanceId, error: err }, "Failed to dispatch instance_status_change");
          });
      }
    );

    engine.on("qr", (instanceId: string, qrCode: string) => {
      this.webhookDispatcher
        .dispatch("qr_code_update", instanceId, { qrCode })
        .catch((err: unknown) => {
          logger.error({ instanceId, error: err }, "Failed to dispatch qr_code_update");
        });
    });
  }
}
