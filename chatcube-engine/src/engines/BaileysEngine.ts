import { EventEmitter } from "events";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  ConnectionState,
  BaileysEventMap,
  proto,
} from "@whiskeysockets/baileys";
import { Pool } from "pg";
import * as QRCode from "qrcode";
import pino from "pino";
import path from "path";
import fs from "fs";
import { Boom } from "@hapi/boom";
import {
  IEngine,
  InstanceConfig,
  InstanceStatus,
  SendMessagePayload,
  MessageResult,
  MessageType,
  GroupMetadata,
} from "../types";
import { config } from "../config";
import {
  usePostgresAuthState,
  deletePostgresAuthState,
} from "../services/usePostgresAuthState";

const baileysLogger = pino({ level: "warn", name: "baileys" });

// Maximum backoff delay: 5 minutes
const MAX_RECONNECT_DELAY_MS = 300000;

/**
 * BaileysEngine - Wraps @whiskeysockets/baileys for WhatsApp Web connections.
 * Each instance manages a single WhatsApp connection.
 *
 * Stability features:
 * - PostgreSQL auth state (survives container restarts)
 * - Infinite reconnection with exponential backoff (cap 5min)
 * - Separate disconnect (pause) vs logout (clear session)
 * - @lid JID support
 */
export class BaileysEngine extends EventEmitter implements IEngine {
  public instanceId: string;
  public status: InstanceStatus = "disconnected";

  private socket: WASocket | null = null;
  private instanceConfig: InstanceConfig;
  private pgPool: Pool | null = null;
  private qrCode: string | null = null;
  private phoneNumber: string | null = null;
  private pushName: string | null = null;
  private connectedAt: string | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private intentionalDisconnect: boolean = false;
  private logger: pino.Logger;

  constructor(instanceId: string, instanceConfig: InstanceConfig, pgPool?: Pool) {
    super();
    this.instanceId = instanceId;
    this.instanceConfig = instanceConfig;
    this.pgPool = pgPool || null;
    this.logger = pino({ name: `baileys-engine:${instanceId}` });
  }

  /**
   * Connect to WhatsApp using Baileys.
   * Uses PostgreSQL auth state if pgPool is available, falls back to file-based.
   */
  async connect(): Promise<void> {
    if (this.status === "connected" || this.status === "connecting") {
      this.logger.warn("Already connected or connecting");
      return;
    }

    this.intentionalDisconnect = false;
    this.status = "connecting";
    this.emitStatusChange("connecting");

    try {
      // Load auth state from PostgreSQL or filesystem
      let state: any;
      let saveCreds: () => Promise<void>;

      if (this.pgPool) {
        const authResult = await usePostgresAuthState(this.pgPool, this.instanceId);
        state = authResult.state;
        saveCreds = authResult.saveCreds;
        this.logger.info("Using PostgreSQL auth state");
      } else {
        const sessionDir = path.join(config.sessionsDir, this.instanceId);
        if (!fs.existsSync(sessionDir)) {
          fs.mkdirSync(sessionDir, { recursive: true });
        }
        const authResult = await useMultiFileAuthState(sessionDir);
        state = authResult.state;
        saveCreds = authResult.saveCreds;
        this.logger.info("Using file-based auth state (fallback)");
      }

      const { version } = await fetchLatestBaileysVersion();
      this.logger.info({ version }, "Creating WASocket");

      this.socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
        },
        logger: baileysLogger,
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: true,
      });

      // --- Connection Update Handler ---
      this.socket.ev.on(
        "connection.update",
        async (update: Partial<ConnectionState>) => {
          const { connection, lastDisconnect, qr } = update;

          // QR Code received
          if (qr) {
            this.status = "qr_ready";
            try {
              this.qrCode = await QRCode.toDataURL(qr);
            } catch {
              this.qrCode = qr;
            }
            this.logger.info("QR code generated");
            this.emit("qr", this.instanceId, this.qrCode);
            this.emitStatusChange("qr_ready");
          }

          // Connection opened successfully
          if (connection === "open") {
            this.status = "connected";
            this.qrCode = null;
            this.reconnectAttempts = 0; // Reset on successful connection
            this.connectedAt = new Date().toISOString();

            const me = this.socket?.user;
            if (me) {
              this.phoneNumber = me.id.split(":")[0] || me.id.split("@")[0];
              this.pushName = me.name || null;
            }

            this.logger.info(
              { phoneNumber: this.phoneNumber, pushName: this.pushName },
              "Connected to WhatsApp"
            );
            this.emitStatusChange("connected");
          }

          // Connection closed
          if (connection === "close") {
            const statusCode = (lastDisconnect?.error as Boom)?.output
              ?.statusCode;
            const shouldReconnect =
              statusCode !== DisconnectReason.loggedOut &&
              !this.intentionalDisconnect;

            this.logger.warn(
              { statusCode, shouldReconnect, intentional: this.intentionalDisconnect },
              "Connection closed"
            );

            this.status = "disconnected";
            this.socket = null;

            if (statusCode === DisconnectReason.loggedOut && !this.intentionalDisconnect) {
              // Server-side logout (not user-initiated) - clear auth state
              this.logger.info("Logged out by WhatsApp server, clearing auth state");
              await this.clearAuthState();
              this.emitStatusChange("disconnected", "logged_out");
            } else if (shouldReconnect) {
              // Auto-reconnect with infinite backoff
              this.scheduleReconnect();
            } else {
              this.emitStatusChange("disconnected", "intentional");
            }
          }
        }
      );

      // --- Save Credentials Handler ---
      this.socket.ev.on("creds.update", saveCreds);

      // --- Messages Received Handler ---
      this.socket.ev.on("messages.upsert", (m: BaileysEventMap["messages.upsert"]) => {
        const { messages, type } = m;
        if (type !== "notify") return;

        for (const msg of messages) {
          if (!msg.message) continue;
          if (msg.key.fromMe) continue;

          const from = msg.key.remoteJid || "";
          const isGroup = from.endsWith("@g.us");
          const isLid = from.endsWith("@lid");
          const participant = msg.key.participant || "";
          const senderJid = isGroup ? participant : from;

          let content = "";
          let msgType: MessageType = "text";

          if (msg.message.conversation) {
            content = msg.message.conversation;
          } else if (msg.message.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
          } else if (msg.message.imageMessage) {
            msgType = "image";
            content = msg.message.imageMessage.caption || "";
          } else if (msg.message.videoMessage) {
            msgType = "video";
            content = msg.message.videoMessage.caption || "";
          } else if (msg.message.audioMessage) {
            msgType = "audio";
          } else if (msg.message.documentMessage) {
            msgType = "document";
            content = msg.message.documentMessage.fileName || "";
          }

          const eventData = {
            messageId: msg.key.id || "",
            from: senderJid,
            fromName: msg.pushName || "",
            to: isGroup ? from : this.phoneNumber || "",
            type: msgType,
            content,
            isGroup,
            isLid,
            groupId: isGroup ? from : undefined,
            timestamp: msg.messageTimestamp
              ? typeof msg.messageTimestamp === "number"
                ? msg.messageTimestamp * 1000
                : Number(msg.messageTimestamp) * 1000
              : Date.now(),
          };

          this.logger.info(
            { from: eventData.from, type: msgType, isGroup, isLid },
            "Message received"
          );

          this.emit("message_received", this.instanceId, eventData);
        }
      });

      // --- Message Status Update Handler ---
      this.socket.ev.on("messages.update", (updates: BaileysEventMap["messages.update"]) => {
        for (const update of updates) {
          if (!update.update.status) continue;

          const statusMap: Record<number, string> = {
            2: "sent",
            3: "delivered",
            4: "read",
          };

          const status = statusMap[update.update.status] || "unknown";

          const eventData = {
            messageId: update.key.id || "",
            status,
            from: update.key.remoteJid || "",
            timestamp: Date.now(),
          };

          this.emit("message_status_update", this.instanceId, eventData);
        }
      });

      // --- History Sync Handler ---
      this.socket.ev.on("messaging-history.set", ({ chats, contacts, messages, isLatest }) => {
        this.logger.info({ messages: messages.length, chats: chats.length }, "History sync received");

        // Emit one event per historical message batch
        this.emit("history_sync", this.instanceId, {
          isLatest: Boolean(isLatest),
          messages: messages.map((m: any) => ({
            messageId: m.key?.id || "",
            fromMe: Boolean(m.key?.fromMe),
            remoteJid: m.key?.remoteJid || "",
            participant: m.key?.participant || "",
            pushName: m.pushName || "",
            messageType: Object.keys(m.message || {}).filter((k: string) => k !== "messageContextInfo" && k !== "senderKeyDistributionMessage")[0] || "conversation",
            message: m.message || {},
            messageTimestamp: typeof m.messageTimestamp === "number" ? m.messageTimestamp : Number(m.messageTimestamp) || 0,
          })),
          chats: chats.map((c: any) => ({
            id: c.id,
            name: c.name || "",
            unreadCount: c.unreadCount || 0,
          })),
        });
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error({ error: errMsg }, "Failed to connect");
      this.status = "disconnected";
      this.emitStatusChange("disconnected", errMsg);
      throw error;
    }
  }

  /**
   * Disconnect from WhatsApp WITHOUT clearing session.
   * The session is preserved so reconnect works without new QR code.
   */
  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();

    if (this.socket) {
      try {
        this.socket.end(undefined);
      } catch {
        // Ignore end errors
      }
      this.socket = null;
    }

    this.status = "disconnected";
    this.qrCode = null;
    this.emitStatusChange("disconnected", "intentional");
    this.logger.info("Disconnected (session preserved)");
  }

  /**
   * Logout from WhatsApp AND clear session.
   * After logout, a new QR code scan is required.
   */
  async logout(): Promise<void> {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();

    if (this.socket) {
      try {
        await this.socket.logout();
      } catch {
        // Ignore logout errors
      }
      try {
        this.socket.end(undefined);
      } catch {
        // Ignore
      }
      this.socket = null;
    }

    // Clear auth state from storage
    await this.clearAuthState();

    this.status = "disconnected";
    this.qrCode = null;
    this.emitStatusChange("disconnected", "logged_out");
    this.logger.info("Logged out (session cleared)");
  }

  /**
   * Get current status
   */
  getStatus(): InstanceStatus {
    return this.status;
  }

  /**
   * Get QR code as base64 data URL
   */
  async getQRCode(): Promise<string | null> {
    return this.qrCode;
  }

  /**
   * Get pairing code for phone number linking
   */
  async getPairingCode(phone: string): Promise<string | null> {
    if (!this.socket) {
      this.logger.warn("Socket not available for pairing code");
      return null;
    }

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const code = await this.socket.requestPairingCode(cleanPhone);
      this.logger.info({ phone: cleanPhone }, "Pairing code generated");
      return code;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error({ error: errMsg }, "Failed to get pairing code");
      return null;
    }
  }

  /**
   * Send a message (text, image, video, audio, document)
   */
  async sendMessage(
    jid: string,
    content: SendMessagePayload
  ): Promise<MessageResult> {
    if (!this.socket || this.status !== "connected") {
      return { success: false, error: "Not connected to WhatsApp" };
    }

    try {
      const normalizedJid = this.normalizeJid(jid);
      let sentMsg: proto.WebMessageInfo;

      switch (content.type) {
        case "text":
          sentMsg = await this.socket.sendMessage(normalizedJid, {
            text: content.content,
          });
          break;

        case "image":
          if (!content.mediaUrl) {
            return { success: false, error: "Media URL required for image" };
          }
          sentMsg = await this.socket.sendMessage(normalizedJid, {
            image: { url: content.mediaUrl },
            caption: content.caption || content.content || "",
          });
          break;

        case "video":
          if (!content.mediaUrl) {
            return { success: false, error: "Media URL required for video" };
          }
          sentMsg = await this.socket.sendMessage(normalizedJid, {
            video: { url: content.mediaUrl },
            caption: content.caption || content.content || "",
          });
          break;

        case "audio":
          if (!content.mediaUrl) {
            return { success: false, error: "Media URL required for audio" };
          }
          sentMsg = await this.socket.sendMessage(normalizedJid, {
            audio: { url: content.mediaUrl },
            ptt: true,
          });
          break;

        case "document":
          if (!content.mediaUrl) {
            return { success: false, error: "Media URL required for document" };
          }
          sentMsg = await this.socket.sendMessage(normalizedJid, {
            document: { url: content.mediaUrl },
            fileName: content.fileName || "document",
            mimetype: content.mimetype || "application/octet-stream",
          });
          break;

        default:
          return { success: false, error: `Unsupported message type: ${content.type}` };
      }

      this.logger.info(
        { jid: normalizedJid, type: content.type, messageId: sentMsg?.key?.id },
        "Message sent"
      );

      return {
        success: true,
        messageId: sentMsg?.key?.id || undefined,
        timestamp: Date.now(),
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error({ error: errMsg, jid, type: content.type }, "Failed to send message");
      return { success: false, error: errMsg };
    }
  }

  /**
   * Get contacts list
   */
  async getContacts(): Promise<Array<{ id: string; name?: string; notify?: string }>> {
    if (!this.socket || this.status !== "connected") return [];

    try {
      const store = (this.socket as any).store;
      if (store?.contacts) {
        return Object.entries(store.contacts).map(
          ([id, contact]: [string, any]) => ({
            id,
            name: contact.name,
            notify: contact.notify,
          })
        );
      }
      return [];
    } catch {
      this.logger.error("Failed to get contacts");
      return [];
    }
  }

  /**
   * Get groups list
   */
  async getGroups(): Promise<Array<{ id: string; subject: string; participants: number }>> {
    if (!this.socket || this.status !== "connected") return [];

    try {
      const groups = await this.socket.groupFetchAllParticipating();
      return Object.entries(groups).map(([id, group]: [string, any]) => ({
        id,
        subject: group.subject || "",
        participants: group.participants?.length || 0,
      }));
    } catch {
      this.logger.error("Failed to get groups");
      return [];
    }
  }


  // ---------- Group Management Methods ----------

  async groupCreate(subject: string, participants: string[]): Promise<{ id: string; subject: string }> {
    if (!this.socket || this.status !== "connected") throw new Error("Not connected");
    const result = await this.socket.groupCreate(subject, participants);
    return { id: result.id, subject: result.subject || subject };
  }

  async groupUpdateSubject(jid: string, subject: string): Promise<void> {
    if (!this.socket || this.status !== "connected") throw new Error("Not connected");
    await this.socket.groupUpdateSubject(jid, subject);
  }

  async groupUpdateDescription(jid: string, description: string): Promise<void> {
    if (!this.socket || this.status !== "connected") throw new Error("Not connected");
    await this.socket.groupUpdateDescription(jid, description);
  }

  async groupParticipantsUpdate(jid: string, participants: string[], action: "add" | "remove" | "promote" | "demote"): Promise<Array<{ jid: string; status: string }>> {
    if (!this.socket || this.status !== "connected") throw new Error("Not connected");
    const results = await this.socket.groupParticipantsUpdate(jid, participants, action);
    return (results || []).map((r: any) => ({
      jid: r.jid || (typeof r === "string" ? r : ""),
      status: r.status || "ok",
    }));
  }

  async groupMetadata(jid: string): Promise<GroupMetadata> {
    if (!this.socket || this.status !== "connected") throw new Error("Not connected");
    const meta = await this.socket.groupMetadata(jid);
    return {
      id: meta.id,
      subject: meta.subject || "",
      description: meta.desc || "",
      owner: meta.owner || "",
      participants: (meta.participants || []).map((p: any) => ({
        id: p.id,
        admin: p.admin || null,
      })),
      creation: meta.creation,
    };
  }

  async groupInviteCode(jid: string): Promise<string> {
    if (!this.socket || this.status !== "connected") throw new Error("Not connected");
    const code = await this.socket.groupInviteCode(jid);
    return code || "";
  }

  async groupLeave(jid: string): Promise<void> {
    if (!this.socket || this.status !== "connected") throw new Error("Not connected");
    await this.socket.groupLeave(jid);
  }

  async fetchHistory(jid: string, count: number = 50): Promise<void> {
    if (!this.socket || this.status !== "connected") throw new Error("Not connected");
    // History sync happens passively on connect via messaging-history.set event.
    // This method triggers a manual fetch request for a specific chat.
    try {
      const msgs = await (this.socket as any).loadMessages?.(jid, 1, undefined);
      const oldestKey = msgs?.[0]?.key;
      if (oldestKey) {
        await (this.socket as any).fetchMessageHistory?.(count, oldestKey, Date.now().toString());
      } else {
        await (this.socket as any).chatModify?.({ clear: false }, jid);
      }
    } catch (err) {
      this.logger.warn({ jid, err }, "fetchHistory: could not get cursor, trying direct fetch");
      try {
        await (this.socket as any).fetchMessageHistory?.(count, { remoteJid: jid, id: "", fromMe: false }, Date.now().toString());
      } catch {
        this.logger.info({ jid }, "fetchHistory: will receive history passively");
      }
    }
  }

  /**
   * Get instance info
   */
  getInfo(): {
    id: string;
    name: string;
    status: InstanceStatus;
    phoneNumber: string | null;
    pushName: string | null;
    connectedAt: string | null;
  } {
    return {
      id: this.instanceId,
      name: this.instanceConfig.name,
      status: this.status,
      phoneNumber: this.phoneNumber,
      pushName: this.pushName,
      connectedAt: this.connectedAt,
    };
  }

  /**
   * Check if the socket is alive and responsive
   */
  isAlive(): boolean {
    return this.socket !== null && this.status === "connected";
  }

  // ---------- Private Methods ----------

  /**
   * Normalize JID to proper format.
   * Handles @s.whatsapp.net, @g.us, and @lid formats.
   */
  private normalizeJid(jid: string): string {
    if (jid.includes("@")) return jid;
    const clean = jid.replace(/\D/g, "");
    return `${clean}@s.whatsapp.net`;
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(status: InstanceStatus, reason?: string): void {
    this.emit("status_change", this.instanceId, { status, reason });
  }

  /**
   * Schedule auto-reconnect with exponential backoff.
   * NO maximum retry limit - reconnects indefinitely with cap at 5 minutes.
   */
  private scheduleReconnect(): void {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY_MS
    );
    this.reconnectAttempts++;

    this.logger.info(
      { attempt: this.reconnectAttempts, delayMs: delay },
      "Scheduling reconnect (infinite retry)"
    );

    this.emitStatusChange("disconnected", `reconnecting_attempt_${this.reconnectAttempts}`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        this.logger.error({ error: errMsg, attempt: this.reconnectAttempts }, "Reconnect attempt failed");
        // connect() failure triggers connection.close, which calls scheduleReconnect again
      }
    }, delay);
  }

  /**
   * Clear any pending reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Clear auth state from PostgreSQL or filesystem
   */
  private async clearAuthState(): Promise<void> {
    try {
      if (this.pgPool) {
        await deletePostgresAuthState(this.pgPool, this.instanceId);
      } else {
        const sessionDir = path.join(config.sessionsDir, this.instanceId);
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      this.logger.error({ error }, "Failed to clear auth state");
    }
  }
}
