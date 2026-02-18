import { EventEmitter } from "events";
import axios, { AxiosInstance } from "axios";
import pino from "pino";
import {
  IEngine,
  InstanceConfig,
  InstanceStatus,
  SendMessagePayload,
  MessageResult,
  GroupMetadata,
} from "../types";

const logger = pino({ name: "cloud-api-engine" });

const GRAPH_API_VERSION = "v24.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * CloudApiEngine - WhatsApp Cloud API (Meta Graph API) integration.
 */
export class CloudApiEngine extends EventEmitter implements IEngine {
  public instanceId: string;
  public status: InstanceStatus = "disconnected";

  private instanceConfig: InstanceConfig;
  private phoneNumberId: string;
  private accessToken: string;
  private client: AxiosInstance;
  private phoneNumber: string | null = null;
  private displayName: string | null = null;
  private qualityRating: string | null = null;
  private connectedAt: string | null = null;

  constructor(instanceId: string, instanceConfig: InstanceConfig) {
    super();
    this.instanceId = instanceId;
    this.instanceConfig = instanceConfig;
    this.phoneNumberId = instanceConfig.phoneNumberId || "";
    this.accessToken = instanceConfig.accessToken || "";

    this.client = axios.create({
      baseURL: GRAPH_API_BASE,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  async connect(): Promise<void> {
    if (!this.phoneNumberId || !this.accessToken) {
      this.status = "disconnected";
      this.emitStatusChange("disconnected", "Missing phoneNumberId or accessToken");
      throw new Error("Cloud API requires phoneNumberId and accessToken");
    }

    this.status = "connecting";
    this.emitStatusChange("connecting");

    try {
      const response = await this.client.get(`/${this.phoneNumberId}`, {
        params: {
          fields: "verified_name,code_verification_status,display_phone_number,quality_rating,id",
        },
      });

      const data = response.data;
      this.phoneNumber = data.display_phone_number || null;
      this.displayName = data.verified_name || null;
      this.qualityRating = data.quality_rating || null;
      this.connectedAt = new Date().toISOString();
      this.status = "connected";

      logger.info(
        { instanceId: this.instanceId, phoneNumber: this.phoneNumber, displayName: this.displayName },
        "Connected to WhatsApp Cloud API"
      );
      this.emitStatusChange("connected");
    } catch (error: unknown) {
      this.status = "disconnected";
      let detail = error instanceof Error ? error.message : "Unknown error";
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const apiError = error.response.data.error;
        detail = `${apiError.message} (code: ${apiError.code}, type: ${apiError.type})`;
      }
      logger.error({ instanceId: this.instanceId, error: detail }, "Cloud API connection failed");
      this.emitStatusChange("disconnected", detail);
      throw new Error(`Cloud API: ${detail}`);
    }
  }

  async disconnect(): Promise<void> {
    this.status = "disconnected";
    this.emitStatusChange("disconnected", "intentional");
    logger.info({ instanceId: this.instanceId }, "Disconnected from Cloud API");
  }

  /**
   * Logout - for Cloud API, same as disconnect (no local session to clear)
   */
  async logout(): Promise<void> {
    await this.disconnect();
  }

  getStatus(): InstanceStatus {
    return this.status;
  }

  /**
   * Check if engine is alive. Cloud API is stateless, so alive = connected status.
   */
  isAlive(): boolean {
    return this.status === "connected";
  }

  async getQRCode(): Promise<string | null> {
    return null;
  }

  async getPairingCode(_phone: string): Promise<string | null> {
    return null;
  }

  async sendMessage(jid: string, content: SendMessagePayload): Promise<MessageResult> {
    if (this.status !== "connected") {
      return { success: false, error: "Not connected to Cloud API" };
    }

    try {
      const to = jid.replace(/@.*$/, "").replace(/\D/g, "");
      let messagePayload: Record<string, unknown>;

      switch (content.type) {
        case "text":
          messagePayload = {
            messaging_product: "whatsapp", recipient_type: "individual", to,
            type: "text", text: { body: content.content },
          };
          break;
        case "image":
          messagePayload = {
            messaging_product: "whatsapp", recipient_type: "individual", to,
            type: "image", image: { link: content.mediaUrl, caption: content.caption || content.content || undefined },
          };
          break;
        case "video":
          messagePayload = {
            messaging_product: "whatsapp", recipient_type: "individual", to,
            type: "video", video: { link: content.mediaUrl, caption: content.caption || content.content || undefined },
          };
          break;
        case "audio":
          messagePayload = {
            messaging_product: "whatsapp", recipient_type: "individual", to,
            type: "audio", audio: { link: content.mediaUrl },
          };
          break;
        case "document":
          messagePayload = {
            messaging_product: "whatsapp", recipient_type: "individual", to,
            type: "document", document: { link: content.mediaUrl, filename: content.fileName || "document" },
          };
          break;
        default:
          return { success: false, error: `Unsupported message type: ${content.type}` };
      }

      const response = await this.client.post(`/${this.phoneNumberId}/messages`, messagePayload);
      const messageId = response.data?.messages?.[0]?.id;

      logger.info({ instanceId: this.instanceId, to, type: content.type, messageId }, "Cloud API message sent");
      return { success: true, messageId: messageId || undefined, timestamp: Date.now() };
    } catch (error: unknown) {
      let errMsg = error instanceof Error ? error.message : "Unknown error";
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        const apiError = error.response.data.error;
        errMsg = `${apiError.message} (code: ${apiError.code})`;
      }
      logger.error({ instanceId: this.instanceId, jid, type: content.type, error: errMsg }, "Cloud API send failed");
      return { success: false, error: errMsg };
    }
  }

  async getContacts(): Promise<Array<{ id: string; name?: string; notify?: string }>> {
    return [];
  }

  async getGroups(): Promise<Array<{ id: string; subject: string; participants: number }>> {
    return [];
  }


  // ---------- Group Management (not supported by Cloud API) ----------

  async groupCreate(_subject: string, _participants: string[]): Promise<{ id: string; subject: string }> {
    throw new Error("Group management is not supported by Cloud API engine");
  }

  async groupUpdateSubject(_jid: string, _subject: string): Promise<void> {
    throw new Error("Group management is not supported by Cloud API engine");
  }

  async groupUpdateDescription(_jid: string, _description: string): Promise<void> {
    throw new Error("Group management is not supported by Cloud API engine");
  }

  async groupParticipantsUpdate(_jid: string, _participants: string[], _action: "add" | "remove" | "promote" | "demote"): Promise<Array<{ jid: string; status: string }>> {
    throw new Error("Group management is not supported by Cloud API engine");
  }

  async groupMetadata(_jid: string): Promise<GroupMetadata> {
    throw new Error("Group management is not supported by Cloud API engine");
  }

  async groupInviteCode(_jid: string): Promise<string> {
    throw new Error("Group management is not supported by Cloud API engine");
  }

  async groupLeave(_jid: string): Promise<void> {
    throw new Error("Group management is not supported by Cloud API engine");
  }

  async fetchHistory(_jid: string, _count?: number): Promise<void> {
    throw new Error("History fetch is not supported by Cloud API engine");
  }

  getInfo(): {
    id: string; name: string; status: InstanceStatus;
    phoneNumber: string | null; pushName: string | null;
    connectedAt: string | null; qualityRating: string | null;
  } {
    return {
      id: this.instanceId, name: this.instanceConfig.name, status: this.status,
      phoneNumber: this.phoneNumber, pushName: this.displayName,
      connectedAt: this.connectedAt, qualityRating: this.qualityRating,
    };
  }

  processIncomingWebhook(entry: Record<string, unknown>): void {
    const changes = (entry as any).changes || [];
    for (const change of changes) {
      const value = change.value || {};
      const metadata = value.metadata || {};
      if (metadata.phone_number_id && metadata.phone_number_id !== this.phoneNumberId) continue;

      const messages = value.messages || [];
      for (const msg of messages) {
        const eventData = {
          messageId: msg.id || "", from: msg.from || "",
          fromName: value.contacts?.[0]?.profile?.name || "",
          to: this.phoneNumber || metadata.display_phone_number || "",
          type: msg.type || "text", content: this.extractContent(msg),
          isGroup: false, timestamp: msg.timestamp ? parseInt(msg.timestamp) * 1000 : Date.now(),
        };
        this.emit("message_received", this.instanceId, eventData);
      }

      const statuses = value.statuses || [];
      for (const st of statuses) {
        const eventData = {
          messageId: st.id || "", status: st.status || "unknown",
          from: st.recipient_id || "", timestamp: st.timestamp ? parseInt(st.timestamp) * 1000 : Date.now(),
        };
        this.emit("message_status_update", this.instanceId, eventData);
      }
    }
  }

  on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  removeAllListeners(): this {
    return super.removeAllListeners();
  }

  private extractContent(msg: Record<string, unknown>): string {
    const type = msg.type as string;
    switch (type) {
      case "text": return (msg.text as any)?.body || "";
      case "image": return (msg.image as any)?.caption || "[Image]";
      case "video": return (msg.video as any)?.caption || "[Video]";
      case "audio": return "[Audio]";
      case "document": return (msg.document as any)?.filename || "[Document]";
      case "sticker": return "[Sticker]";
      case "location": { const loc = msg.location as any; return `[Location: ${loc?.latitude},${loc?.longitude}]`; }
      case "contacts": return "[Contact]";
      case "reaction": return (msg.reaction as any)?.emoji || "[Reaction]";
      case "button": return (msg.button as any)?.text || "[Button]";
      case "interactive": return (msg.interactive as any)?.button_reply?.title || (msg.interactive as any)?.list_reply?.title || "[Interactive]";
      default: return `[${type}]`;
    }
  }

  private emitStatusChange(status: InstanceStatus, reason?: string): void {
    this.emit("status_change", this.instanceId, { status, reason });
  }
}
