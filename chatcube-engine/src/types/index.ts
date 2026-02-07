// ==========================================
// ChatCube Engine - TypeScript Types
// ==========================================

// ---------- Instance Types ----------

export type EngineType = "baileys" | "cloud_api";

export type InstanceStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "qr_ready"
  | "pairing"
  | "closing";

export interface InstanceConfig {
  id: string;
  name: string;
  engine: EngineType;
  phoneNumberId?: string;       // For Cloud API
  accessToken?: string;          // For Cloud API
  webhookUrl?: string;           // Override per-instance webhook
  messageDelay?: number;         // Override per-instance message delay (ms)
  autoReconnect?: boolean;       // Default true
  maxReconnectRetries?: number;  // Default 5
}

export interface InstanceInfo {
  id: string;
  name: string;
  engine: EngineType;
  status: InstanceStatus;
  phoneNumber?: string;
  pushName?: string;
  connectedAt?: string;
  qrCode?: string;
}

// ---------- Message Types ----------

export type MessageType = "text" | "image" | "video" | "audio" | "document";

export interface SendMessagePayload {
  to: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  fileName?: string;
  caption?: string;
  mimetype?: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp?: number;
}

// ---------- Webhook Event Types ----------

export type WebhookEventType =
  | "message_received"
  | "message_sent"
  | "message_status_update"
  | "instance_status_change"
  | "qr_code_update";

export interface WebhookEvent {
  event: WebhookEventType;
  instanceId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface MessageReceivedData {
  messageId: string;
  from: string;
  fromName?: string;
  to?: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  isGroup: boolean;
  groupId?: string;
  groupName?: string;
  timestamp: number;
  raw?: Record<string, unknown>;
}

export interface MessageStatusData {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  from?: string;
  timestamp: number;
}

export interface InstanceStatusData {
  status: InstanceStatus;
  phoneNumber?: string;
  pushName?: string;
  reason?: string;
}

export interface QRCodeData {
  qrCode: string;
  expiresAt?: number;
}

// ---------- Auth Store Types ----------

export interface AuthState {
  instanceId: string;
  creds: string;       // JSON-serialized creds
  keys: string;        // JSON-serialized keys
  updatedAt: Date;
}

// ---------- Queue Types ----------

export interface QueuedMessage {
  id: string;
  instanceId: string;
  jid: string;
  content: SendMessagePayload;
  addedAt: number;
  retries: number;
}

// ---------- Engine Interface ----------

export interface IEngine {
  instanceId: string;
  status: InstanceStatus;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): InstanceStatus;
  getQRCode(): Promise<string | null>;
  getPairingCode(phone: string): Promise<string | null>;
  sendMessage(jid: string, content: SendMessagePayload): Promise<MessageResult>;
  getContacts(): Promise<Array<{ id: string; name?: string; notify?: string }>>;
  getGroups(): Promise<Array<{ id: string; subject: string; participants: number }>>;

  on(event: string, listener: (...args: unknown[]) => void): void;
  removeAllListeners(): void;
}

// ---------- API Types ----------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  instances: number;
  version: string;
  nodeEnv: string;
}

export interface CreateInstanceBody {
  id: string;
  name: string;
  engine: EngineType;
  config?: Partial<InstanceConfig>;
}

export interface PairingCodeBody {
  phone: string;
}

export interface SendMessageBody extends SendMessagePayload {}
