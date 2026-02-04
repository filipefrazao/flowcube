/**
 * FlowCube - Instagram DM Automation Types
 * Complete TypeScript definitions for Instagram Messaging API integration
 */

// ============ Enums ============

export enum InstagramMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  STICKER = 'sticker',
  STORY_MENTION = 'story_mention',
  STORY_REPLY = 'story_reply',
  SHARE = 'share',
  REACTION = 'reaction',
}

export enum InstagramAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING = 'pending',
  TOKEN_EXPIRED = 'token_expired',
}

export enum InstagramConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
  SPAM = 'spam',
}

export enum InstagramMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  PENDING = 'pending',
}

export enum InstagramWebhookEventType {
  MESSAGE = 'message',
  MESSAGE_REACTION = 'message_reaction',
  MESSAGE_READ = 'message_read',
  MESSAGE_DELETED = 'message_deleted',
  STORY_MENTION = 'story_mention',
  STORY_REPLY = 'story_reply',
}

// ============ Core Instagram Types ============

export interface InstagramAccount {
  id: string;
  instagram_account_id: string;
  username: string;
  name: string;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  // Connection info
  page_id: string;
  page_name?: string;
  access_token: string;
  token_expires_at?: string;
  // Status
  status: InstagramAccountStatus;
  is_active: boolean;
  webhook_configured: boolean;
  last_error?: string;
  last_error_at?: string;
  // Settings
  settings: InstagramAccountSettings;
  // Stats
  stats?: InstagramAccountStats;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface InstagramAccountSettings {
  // Auto-reply settings
  auto_reply_enabled: boolean;
  auto_reply_message?: string;
  auto_reply_delay_seconds?: number;
  // Business hours
  business_hours_enabled: boolean;
  business_hours?: BusinessHours;
  away_message?: string;
  // Quick replies
  quick_replies_enabled: boolean;
  // Ice breakers
  ice_breakers_enabled: boolean;
  ice_breakers?: InstagramIceBreaker[];
  // Notification settings
  notify_new_messages: boolean;
  notify_story_mentions: boolean;
}

export interface BusinessHours {
  timezone: string;
  schedule: {
    [day: string]: { start: string; end: string; enabled: boolean };
  };
}

export interface InstagramAccountStats {
  total_conversations: number;
  total_messages_sent: number;
  total_messages_received: number;
  active_conversations_24h: number;
  messages_today: number;
  avg_response_time_ms?: number;
  story_mentions_today?: number;
}

// ============ Conversation Types ============

export interface InstagramConversation {
  id: string;
  instagram_conversation_id: string;
  account_id: string;
  // Participant info
  participant_id: string;
  participant_username: string;
  participant_name?: string;
  participant_profile_pic?: string;
  participant_followers_count?: number;
  is_verified?: boolean;
  is_business?: boolean;
  // Conversation state
  status: InstagramConversationStatus;
  is_starred: boolean;
  is_muted: boolean;
  // 24-hour window tracking
  last_user_message_at?: string;
  can_send_message: boolean;
  window_expires_at?: string;
  // Message info
  message_count: number;
  unread_count: number;
  last_message_at?: string;
  last_message_preview?: string;
  last_message_direction?: 'inbound' | 'outbound';
  // Metadata
  labels?: string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
  // Source tracking
  source?: 'dm' | 'story_mention' | 'story_reply' | 'ad' | 'organic';
  source_details?: {
    ad_id?: string;
    story_id?: string;
    post_id?: string;
  };
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============ Message Types ============

export interface InstagramMessage {
  id: string;
  instagram_message_id: string;
  conversation_id: string;
  account_id: string;
  // Sender info
  sender_id: string;
  sender_username?: string;
  // Message content
  message_type: InstagramMessageType;
  text?: string;
  // Media attachments
  attachments?: InstagramAttachment[];
  // Story context
  story_context?: StoryContext;
  // Share context
  share_context?: ShareContext;
  // Reaction
  reaction?: MessageReaction;
  // Quick reply response
  quick_reply_payload?: string;
  // Reply info
  reply_to_message_id?: string;
  reply_to_message?: InstagramMessage;
  // Status
  direction: 'inbound' | 'outbound';
  status: InstagramMessageStatus;
  error_message?: string;
  // Workflow tracking
  workflow_execution_id?: string;
  is_automated?: boolean;
  // Timestamps
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export interface InstagramAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'sticker';
  url: string;
  preview_url?: string;
  filename?: string;
  file_size?: number;
  mime_type?: string;
  // Image/Video dimensions
  width?: number;
  height?: number;
  // Video/Audio duration
  duration_ms?: number;
}

export interface StoryContext {
  story_id: string;
  story_url: string;
  story_type: 'image' | 'video';
  mention_text?: string;
  reply_text?: string;
  expires_at?: string;
}

export interface ShareContext {
  share_type: 'post' | 'reel' | 'story' | 'profile' | 'link';
  share_id?: string;
  share_url?: string;
  share_preview?: string;
  share_caption?: string;
}

export interface MessageReaction {
  emoji: string;
  reactor_id: string;
  reacted_at: string;
}

// ============ Quick Reply Types ============

export interface InstagramQuickReply {
  id: string;
  account_id: string;
  title: string;
  payload: string;
  image_url?: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface InstagramQuickReplyButton {
  content_type: 'text';
  title: string;
  payload: string;
  image_url?: string;
}

// ============ Ice Breaker Types ============

export interface InstagramIceBreaker {
  id: string;
  account_id?: string;
  question: string;
  payload: string;
  is_active: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface InstagramIceBreakerConfig {
  ice_breakers: InstagramIceBreaker[];
  max_ice_breakers: number; // Instagram allows max 4
}

// ============ Webhook Event Types ============

export interface InstagramWebhookEvent {
  id: string;
  event_type: InstagramWebhookEventType;
  account_id: string;
  timestamp: string;
  // Event data
  messaging?: InstagramMessagingEvent;
  // Raw payload
  raw_payload?: Record<string, unknown>;
}

export interface InstagramMessagingEvent {
  sender: {
    id: string;
  };
  recipient: {
    id: string;
  };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload: {
        url?: string;
        sticker_id?: number;
      };
    }>;
    quick_reply?: {
      payload: string;
    };
    reply_to?: {
      mid: string;
    };
    is_echo?: boolean;
    is_deleted?: boolean;
  };
  reaction?: {
    mid: string;
    action: 'react' | 'unreact';
    reaction?: string;
    emoji?: string;
  };
  read?: {
    watermark: number;
  };
  referral?: {
    ref?: string;
    source?: string;
    type?: string;
    ad_id?: string;
  };
}

// ============ API Request/Response Types ============

export interface InstagramAccountConnectRequest {
  access_token: string;
  instagram_account_id?: string;
  page_id?: string;
}

export interface InstagramAccountConnectResponse {
  account: InstagramAccount;
  pages: Array<{
    id: string;
    name: string;
    instagram_account?: {
      id: string;
      username: string;
      name: string;
      profile_picture_url?: string;
    };
  }>;
}

export interface InstagramAccountUpdateRequest {
  name?: string;
  is_active?: boolean;
  settings?: Partial<InstagramAccountSettings>;
}

export interface SendInstagramMessageRequest {
  recipient_id: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'template';
  text?: string;
  attachment_url?: string;
  // Quick replies
  quick_replies?: InstagramQuickReplyButton[];
  // Template
  template_type?: 'generic' | 'button';
  template_elements?: TemplateElement[];
  // Metadata
  tag?: 'CONFIRMED_EVENT_UPDATE' | 'POST_PURCHASE_UPDATE' | 'ACCOUNT_UPDATE' | 'HUMAN_AGENT';
  metadata?: string;
}

export interface TemplateElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  default_action?: {
    type: 'web_url';
    url: string;
  };
  buttons?: TemplateButton[];
}

export interface TemplateButton {
  type: 'web_url' | 'postback';
  title: string;
  url?: string;
  payload?: string;
}

export interface SendInstagramMessageResponse {
  message: InstagramMessage;
  recipient_id: string;
  message_id: string;
}

export interface UpdateConversationRequest {
  status?: InstagramConversationStatus;
  is_starred?: boolean;
  is_muted?: boolean;
  labels?: string[];
  notes?: string;
  custom_fields?: Record<string, unknown>;
}

export interface SetIceBreakersRequest {
  ice_breakers: Array<{
    question: string;
    payload: string;
  }>;
}

export interface SetQuickRepliesRequest {
  quick_replies: Array<{
    title: string;
    payload: string;
    image_url?: string;
  }>;
}

// ============ FlowCube Workflow Node Types ============

export interface InstagramTriggerConfig {
  account_id: string;
  trigger_type: 'dm_received' | 'story_mention' | 'story_reply' | 'quick_reply' | 'ice_breaker';
  // For DM triggers
  message_types?: InstagramMessageType[];
  // For quick reply/ice breaker
  payload_pattern?: string;
  // Filters
  from_verified_only?: boolean;
  from_business_only?: boolean;
  keyword_filter?: string[];
  // Output mapping
  output_variables?: Record<string, string>;
}

export interface InstagramSendConfig {
  account_id: string;
  recipient_source: 'trigger' | 'variable' | 'static';
  recipient_variable?: string;
  recipient_static?: string;
  // Message content
  message_type: 'text' | 'image' | 'video' | 'template';
  text_template?: string;
  media_url_source?: 'variable' | 'static';
  media_url_variable?: string;
  media_url_static?: string;
  // Quick replies
  include_quick_replies?: boolean;
  quick_replies?: InstagramQuickReplyButton[];
  // 24-hour window handling
  fallback_message_if_window_closed?: string;
  use_message_tag?: boolean;
  message_tag?: string;
}

export interface InstagramQuickReplyConfig {
  account_id: string;
  text_template: string;
  quick_replies: InstagramQuickReplyButton[];
  // Response handling
  wait_for_response?: boolean;
  response_timeout_seconds?: number;
  timeout_action?: 'continue' | 'stop';
}

export interface InstagramConditionConfig {
  condition_type: 'message_contains' | 'message_type' | 'quick_reply_payload' | 'user_attribute' | 'window_status';
  // For message_contains
  keywords?: string[];
  match_mode?: 'any' | 'all' | 'exact';
  case_sensitive?: boolean;
  // For message_type
  message_types?: InstagramMessageType[];
  // For quick_reply_payload
  payload_pattern?: string;
  // For user_attribute
  user_attribute?: 'is_verified' | 'is_business' | 'followers_count';
  user_attribute_operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than';
  user_attribute_value?: string | number | boolean;
  // For window_status
  window_open?: boolean;
  // Outputs
  true_output?: string;
  false_output?: string;
}

// ============ Helper Types ============

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  cursor?: string;
}

export interface InstagramApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    type?: string;
    fbtrace_id?: string;
  };
}

// 24-hour messaging window helper
export interface MessagingWindowStatus {
  is_open: boolean;
  opened_at?: string;
  expires_at?: string;
  time_remaining_seconds?: number;
  can_use_message_tag: boolean;
  available_tags: string[];
}

// Account connection status for OAuth flow
export interface InstagramOAuthState {
  step: 'start' | 'authorize' | 'select_page' | 'complete' | 'error';
  code?: string;
  access_token?: string;
  pages?: Array<{
    id: string;
    name: string;
    instagram_account?: {
      id: string;
      username: string;
    };
  }>;
  selected_page_id?: string;
  error?: string;
}
