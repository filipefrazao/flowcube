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
  phoneNumberId?: string;
  accessToken?: string;
  webhookUrl?: string;
  messageDelay?: number;
  autoReconnect?: boolean;
  maxReconnectRetries?: number;
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

export type WebhookEventType =
  | "message_received"
  | "message_sent"
  | "message_status_update"
  | "instance_status_change"
  | "qr_code_update"
  | "history_sync"
  | "group_update";

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
  isLid?: boolean;
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

export interface AuthState {
  instanceId: string;
  creds: string;
  keys: string;
  updatedAt: Date;
}

export interface QueuedMessage {
  id: string;
  instanceId: string;
  jid: string;
  content: SendMessagePayload;
  addedAt: number;
  retries: number;
}


export interface GroupMetadata {
  id: string;
  subject: string;
  description?: string;
  owner?: string;
  participants: Array<{
    id: string;
    admin?: "admin" | "superadmin" | null;
  }>;
  creation?: number;
  inviteCode?: string;
}

export interface IEngine {
  instanceId: string;
  status: InstanceStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  logout(): Promise<void>;
  getStatus(): InstanceStatus;
  getQRCode(): Promise<string | null>;
  getPairingCode(phone: string): Promise<string | null>;
  sendMessage(jid: string, content: SendMessagePayload): Promise<MessageResult>;
  getContacts(): Promise<Array<{ id: string; name?: string; notify?: string }>>;
  getGroups(): Promise<Array<{ id: string; subject: string; participants: number }>>;
  isAlive(): boolean;
  // Group management
  groupCreate(subject: string, participants: string[]): Promise<{ id: string; subject: string }>;
  groupUpdateSubject(jid: string, subject: string): Promise<void>;
  groupUpdateDescription(jid: string, description: string): Promise<void>;
  groupParticipantsUpdate(jid: string, participants: string[], action: "add" | "remove" | "promote" | "demote"): Promise<Array<{ jid: string; status: string }>>;
  groupMetadata(jid: string): Promise<GroupMetadata>;
  groupInviteCode(jid: string): Promise<string>;
  groupLeave(jid: string): Promise<void>;
  // History
  fetchHistory(jid: string, count?: number): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeAllListeners(): void;
}

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
