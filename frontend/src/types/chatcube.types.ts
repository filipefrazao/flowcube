// ============================================================================
// ChatCube Types - WhatsApp Instance Management
// ============================================================================

export type EngineType = 'baileys' | 'cloud_api';

export type InstanceStatus = 'connected' | 'connecting' | 'disconnected' | 'banned' | 'timeout';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'template';

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'failed';

export interface WhatsAppInstance {
  id: string;
  name: string;
  phone_number: string;
  engine: EngineType;
  status: InstanceStatus;
  quality_rating: 'green' | 'yellow' | 'red' | 'unknown';
  profile_picture: string | null;
  webhook_url: string;
  created_at: string;
  updated_at: string;
  last_connected_at: string | null;
  messages_sent_today: number;
  messages_received_today: number;
  is_warmed_up: boolean;
  daily_limit: number;
  warmup_day: number;
  owner: string;
}

export interface WhatsAppMessage {
  id: string;
  instance_id: string;
  remote_jid: string;
  from_me: boolean;
  message_type: MessageType;
  content: string;
  media_url: string | null;
  timestamp: string;
  status: MessageStatus;
  sender_name: string | null;
  sender_jid: string | null;
  metadata?: {
    pushName?: string;
    participant?: string;
    [key: string]: any;
  };
}

export interface WhatsAppContact {
  id: string;
  jid: string;
  name: string;
  phone: string;
  profile_picture: string | null;
  is_business: boolean;
  last_message_at: string | null;
}

export interface WhatsAppGroup {
  id: string;
  instance: string;
  jid: string;
  name: string;
  description: string;
  participants_count: number;
  is_admin: boolean;
  assigned_to: number | null;
  assigned_to_name: string | null;
  message_count?: number;
  last_message_at?: string | null;
}

export interface GroupNote {
  id: string;
  group: string;
  user: number | null;
  user_name: string;
  content: string;
  note_type: 'note' | 'call' | 'email' | 'meeting' | 'task';
  created_at: string;
}

export interface GroupTask {
  id: string;
  group: string;
  created_by: number | null;
  created_by_name: string;
  title: string;
  description: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

export interface Campaign {
  id: string;
  name: string;
  instance_id: string;
  template_name: string;
  recipients: string[];
  status: CampaignStatus;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstanceStats {
  total_messages_sent: number;
  total_messages_received: number;
  total_contacts: number;
  total_groups: number;
  uptime_hours: number;
  health_score: number;
}

export interface CreateInstanceRequest {
  name: string;
  engine: EngineType;
  phone_number_id?: string;
  waba_id?: string;
  access_token?: string;
}

export interface ChatCubeStats {
  total_instances: number;
  connected_instances: number;
  messages_today: number;
  health_score: number;
}
