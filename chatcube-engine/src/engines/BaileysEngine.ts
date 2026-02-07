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
} from "../types";
import { config } from "../config";

const baileysLogger = pino({ level: "warn", name: "baileys" });

/**
 * BaileysEngine - Wraps @whiskeysockets/baileys for WhatsApp Web connections.
 * Each instance manages a single WhatsApp connection.
 */
export class BaileysEngine extends EventEmitter implements IEngine {
  public instanceId: string;
  public status: InstanceStatus = "disconnected";

  private socket: WASocket | null = null;
  private instanceConfig: InstanceConfig;
  private qrCode: string | null = null;
  private phoneNumber: string | null = null;
  private pushName: string | null = null;
  private connectedAt: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectRetries: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private intentionalDisconnect: boolean = false;
  private logger: pino.Logger;

  constructor(instanceId: string, instanceConfig: InstanceConfig) {
    super();
    this.instanceId = instanceId;
    this.instanceConfig = instanceConfig;
    this.maxReconnectRetries =
      instanceConfig.maxReconnectRetries || config.maxReconnectRetries;
    this.logger = pino({ name: `baileys-engine:${instanceId}` });
  }

  /**
   * Connect to WhatsApp using Baileys
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
      const sessionDir = path.join(config.sessionsDir, this.instanceId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
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

          // Connection opened
          if (connection === "open") {
            this.status = "connected";
            this.qrCode = null;
            this.reconnectAttempts = 0;
            this.connectedAt = new Date().toISOString();

            // Extract phone number and push name from socket
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
              { statusCode, shouldReconnect },
              "Connection closed"
            );

            this.status = "disconnected";
            this.socket = null;

            if (statusCode === DisconnectReason.loggedOut) {
              // Clear session on logout
              this.logger.info("Logged out, clearing session");
              const sessionDir = path.join(
                config.sessionsDir,
                this.instanceId
              );
              if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
              }
              this.emitStatusChange("disconnected", "logged_out");
            } else if (shouldReconnect) {
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
          if (msg.key.fromMe) continue; // Skip own messages

          const from = msg.key.remoteJid || "";
          const isGroup = from.endsWith("@g.us");
          const participant = msg.key.participant || "";
          const senderJid = isGroup ? participant : from;

          // Extract text content
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
            groupId: isGroup ? from : undefined,
            timestamp: msg.messageTimestamp
              ? typeof msg.messageTimestamp === "number"
                ? msg.messageTimestamp * 1000
                : Number(msg.messageTimestamp) * 1000
              : Date.now(),
          };

          this.logger.info(
            {
              from: eventData.from,
              type: msgType,
              isGroup,
            },
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
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error({ error: errMsg }, "Failed to connect");
      this.status = "disconnected";
      this.emitStatusChange("disconnected", errMsg);
      throw error;
    }
  }

  /**
   * Disconnect from WhatsApp
   */
  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();

    if (this.socket) {
      try {
        await this.socket.logout();
      } catch {
        // Ignore logout errors, just end the connection
      }
      try {
        this.socket.end(undefined);
      } catch {
        // Ignore
      }
      this.socket = null;
    }

    this.status = "disconnected";
    this.qrCode = null;
    this.emitStatusChange("disconnected", "intentional");
    this.logger.info("Disconnected");
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
      // Remove non-numeric characters
      const cleanPhone = phone.replace(/\D/g, "");
      const code = await this.socket.requestPairingCode(cleanPhone);
      this.logger.info({ phone: cleanPhone }, "Pairing code generated");
      return code;
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error";
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
      return {
        success: false,
        error: "Not connected to WhatsApp",
      };
    }

    try {
      let messageContent: proto.IMessage;
      const normalizedJid = this.normalizeJid(jid);

      switch (content.type) {
        case "text":
          messageContent = { conversation: content.content };
          break;

        case "image":
          messageContent = {
            imageMessage: {
              url: content.mediaUrl || "",
              caption: content.caption || content.content || "",
              mimetype: content.mimetype || "image/jpeg",
            } as any,
          };
          break;

        case "video":
          messageContent = {
            videoMessage: {
              url: content.mediaUrl || "",
              caption: content.caption || content.content || "",
              mimetype: content.mimetype || "video/mp4",
            } as any,
          };
          break;

        case "audio":
          messageContent = {
            audioMessage: {
              url: content.mediaUrl || "",
              mimetype: content.mimetype || "audio/mpeg",
              ptt: true,
            } as any,
          };
          break;

        case "document":
          messageContent = {
            documentMessage: {
              url: content.mediaUrl || "",
              fileName: content.fileName || "document",
              mimetype:
                content.mimetype || "application/octet-stream",
            } as any,
          };
          break;

        default:
          return {
            success: false,
            error: `Unsupported message type: ${content.type}`,
          };
      }

      let sentMsg: proto.WebMessageInfo;

      if (content.type === "text") {
        sentMsg = await this.socket.sendMessage(normalizedJid, {
          text: content.content,
        });
      } else if (content.type === "image" && content.mediaUrl) {
        sentMsg = await this.socket.sendMessage(normalizedJid, {
          image: { url: content.mediaUrl },
          caption: content.caption || content.content || "",
        });
      } else if (content.type === "video" && content.mediaUrl) {
        sentMsg = await this.socket.sendMessage(normalizedJid, {
          video: { url: content.mediaUrl },
          caption: content.caption || content.content || "",
        });
      } else if (content.type === "audio" && content.mediaUrl) {
        sentMsg = await this.socket.sendMessage(normalizedJid, {
          audio: { url: content.mediaUrl },
          ptt: true,
        });
      } else if (content.type === "document" && content.mediaUrl) {
        sentMsg = await this.socket.sendMessage(normalizedJid, {
          document: { url: content.mediaUrl },
          fileName: content.fileName || "document",
          mimetype: content.mimetype || "application/octet-stream",
        });
      } else {
        return {
          success: false,
          error: "Media URL required for non-text messages",
        };
      }

      this.logger.info(
        {
          jid: normalizedJid,
          type: content.type,
          messageId: sentMsg?.key?.id,
        },
        "Message sent"
      );

      return {
        success: true,
        messageId: sentMsg?.key?.id || undefined,
        timestamp: Date.now(),
      };
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        { error: errMsg, jid, type: content.type },
        "Failed to send message"
      );
      return {
        success: false,
        error: errMsg,
      };
    }
  }

  /**
   * Get contacts list
   */
  async getContacts(): Promise<
    Array<{ id: string; name?: string; notify?: string }>
  > {
    if (!this.socket || this.status !== "connected") {
      return [];
    }

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
    } catch (error: unknown) {
      this.logger.error("Failed to get contacts");
      return [];
    }
  }

  /**
   * Get groups list
   */
  async getGroups(): Promise<
    Array<{ id: string; subject: string; participants: number }>
  > {
    if (!this.socket || this.status !== "connected") {
      return [];
    }

    try {
      const groups = await this.socket.groupFetchAllParticipating();
      return Object.entries(groups).map(([id, group]: [string, any]) => ({
        id,
        subject: group.subject || "",
        participants: group.participants?.length || 0,
      }));
    } catch (error: unknown) {
      this.logger.error("Failed to get groups");
      return [];
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

  // ---------- Private Methods ----------

  /**
   * Normalize JID to proper format
   */
  private normalizeJid(jid: string): string {
    // Already a valid JID
    if (jid.includes("@")) return jid;

    // Clean phone number
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
   * Schedule auto-reconnect with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectRetries) {
      this.logger.error(
        {
          attempts: this.reconnectAttempts,
          max: this.maxReconnectRetries,
        },
        "Max reconnect attempts reached"
      );
      this.emitStatusChange("disconnected", "max_retries_reached");
      return;
    }

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      60000
    );
    this.reconnectAttempts++;

    this.logger.info(
      {
        attempt: this.reconnectAttempts,
        delayMs: delay,
      },
      "Scheduling reconnect"
    );

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error: unknown) {
        this.logger.error("Reconnect attempt failed");
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
}
