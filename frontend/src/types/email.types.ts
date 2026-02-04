/**
 * FlowCube - Email Sequence Builder Types
 * Complete TypeScript definitions for Email Marketing integration
 */

// ============ Enums ============

export enum ProviderType {
  SMTP = "smtp",
  SENDGRID = "sendgrid",
  MAILGUN = "mailgun",
  SES = "ses",
  POSTMARK = "postmark",
  MAILCHIMP = "mailchimp",
}

export enum TemplateCategory {
  WELCOME = "welcome",
  ONBOARDING = "onboarding",
  PROMOTIONAL = "promotional",
  TRANSACTIONAL = "transactional",
  NEWSLETTER = "newsletter",
  ABANDONED_CART = "abandoned_cart",
  RE_ENGAGEMENT = "re_engagement",
  FEEDBACK = "feedback",
  CUSTOM = "custom",
}

export enum SequenceStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

export enum StepCondition {
  NONE = "none",
  OPENED = "opened",
  NOT_OPENED = "not_opened",
  CLICKED = "clicked",
  NOT_CLICKED = "not_clicked",
  REPLIED = "replied",
  BOUNCED = "bounced",
  UNSUBSCRIBED = "unsubscribed",
}

export enum SendStatus {
  PENDING = "pending",
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  OPENED = "opened",
  CLICKED = "clicked",
  BOUNCED = "bounced",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum EventType {
  SENT = "sent",
  DELIVERED = "delivered",
  OPENED = "opened",
  CLICKED = "clicked",
  BOUNCED = "bounced",
  COMPLAINED = "complained",
  UNSUBSCRIBED = "unsubscribed",
  DROPPED = "dropped",
  DEFERRED = "deferred",
}

export enum DelayUnit {
  MINUTES = "minutes",
  HOURS = "hours",
  DAYS = "days",
  WEEKS = "weeks",
}

export enum TriggerType {
  NEW_SUBSCRIBER = "new_subscriber",
  TAG_ADDED = "tag_added",
  TAG_REMOVED = "tag_removed",
  WEBHOOK = "webhook",
  FORM_SUBMIT = "form_submit",
  MANUAL = "manual",
  DATE_FIELD = "date_field",
}

// ============ Provider Types ============

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface SendGridConfig {
  api_key: string;
}

export interface MailgunConfig {
  api_key: string;
  domain: string;
  region: "us" | "eu";
}

export interface SESConfig {
  access_key_id: string;
  secret_access_key: string;
  region: string;
}

export interface PostmarkConfig {
  server_token: string;
}

export interface MailchimpConfig {
  api_key: string;
  server_prefix: string;
}

export type ProviderConfig =
  | SMTPConfig
  | SendGridConfig
  | MailgunConfig
  | SESConfig
  | PostmarkConfig
  | MailchimpConfig;

export interface EmailProvider {
  id: string;
  name: string;
  type: ProviderType;
  config: ProviderConfig;
  from_email: string;
  from_name: string;
  reply_to?: string;
  is_default: boolean;
  is_verified: boolean;
  daily_limit?: number;
  hourly_limit?: number;
  sends_today: number;
  sends_this_hour: number;
  created_at: string;
  updated_at: string;
}

export interface EmailProviderCreateRequest {
  name: string;
  type: ProviderType;
  config: ProviderConfig;
  from_email: string;
  from_name: string;
  reply_to?: string;
  is_default?: boolean;
  daily_limit?: number;
  hourly_limit?: number;
}

export interface EmailProviderUpdateRequest {
  name?: string;
  config?: Partial<ProviderConfig>;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  is_default?: boolean;
  daily_limit?: number;
  hourly_limit?: number;
}

// ============ Template Types ============

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preview_text?: string;
  html_content: string;
  text_content?: string;
  category: TemplateCategory;
  tags: string[];
  variables: TemplateVariable[];
  thumbnail_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Stats
  uses_count: number;
  last_used_at?: string;
}

export interface TemplateVariable {
  name: string;
  default_value?: string;
  required: boolean;
  description?: string;
}

export interface EmailTemplateCreateRequest {
  name: string;
  subject: string;
  preview_text?: string;
  html_content: string;
  text_content?: string;
  category: TemplateCategory;
  tags?: string[];
  variables?: TemplateVariable[];
}

export interface EmailTemplateUpdateRequest {
  name?: string;
  subject?: string;
  preview_text?: string;
  html_content?: string;
  text_content?: string;
  category?: TemplateCategory;
  tags?: string[];
  variables?: TemplateVariable[];
  is_active?: boolean;
}

// ============ Sequence Types ============

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  status: SequenceStatus;
  provider_id: string;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  steps: EmailStep[];
  tags: string[];
  // Settings
  settings: SequenceSettings;
  // Stats
  stats: SequenceStats;
  created_at: string;
  updated_at: string;
  activated_at?: string;
}

export interface SequenceSettings {
  send_window_start?: string; // HH:MM
  send_window_end?: string;
  timezone: string;
  skip_weekends: boolean;
  exit_on_unsubscribe: boolean;
  exit_on_reply: boolean;
  track_opens: boolean;
  track_clicks: boolean;
}

export interface SequenceStats {
  total_enrolled: number;
  active_enrollments: number;
  completed: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
}

export interface TriggerConfig {
  tag_id?: string;
  tag_name?: string;
  webhook_id?: string;
  form_id?: string;
  date_field?: string;
  date_offset_days?: number;
}

export interface EmailSequenceCreateRequest {
  name: string;
  description?: string;
  provider_id: string;
  trigger_type: TriggerType;
  trigger_config?: TriggerConfig;
  settings?: Partial<SequenceSettings>;
  tags?: string[];
}

export interface EmailSequenceUpdateRequest {
  name?: string;
  description?: string;
  provider_id?: string;
  trigger_type?: TriggerType;
  trigger_config?: TriggerConfig;
  settings?: Partial<SequenceSettings>;
  tags?: string[];
}

// ============ Step Types ============

export interface EmailStep {
  id: string;
  sequence_id: string;
  order: number;
  name: string;
  template_id: string;
  template?: EmailTemplate;
  delay_value: number;
  delay_unit: DelayUnit;
  delay_config?: DelayConfig;
  condition: StepCondition;
  condition_step_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Stats
  stats: StepStats;
}

export interface DelayConfig {
  send_at_time?: string; // HH:MM - send at specific time
  wait_for_condition?: boolean;
  max_wait_days?: number;
}

export interface StepStats {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  open_rate: number;
  click_rate: number;
}

export interface EmailStepCreateRequest {
  sequence_id: string;
  name: string;
  template_id: string;
  delay_value: number;
  delay_unit: DelayUnit;
  delay_config?: DelayConfig;
  condition?: StepCondition;
  condition_step_id?: string;
  order?: number;
}

export interface EmailStepUpdateRequest {
  name?: string;
  template_id?: string;
  delay_value?: number;
  delay_unit?: DelayUnit;
  delay_config?: DelayConfig;
  condition?: StepCondition;
  condition_step_id?: string;
  is_active?: boolean;
}

// ============ Recipient Types ============

export interface EmailRecipient {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  tags: string[];
  custom_fields: Record<string, string>;
  is_subscribed: boolean;
  subscription_status: "subscribed" | "unsubscribed" | "bounced" | "complained";
  unsubscribed_at?: string;
  source: string;
  created_at: string;
  updated_at: string;
  // Stats
  total_received: number;
  total_opened: number;
  total_clicked: number;
  last_opened_at?: string;
  last_clicked_at?: string;
}

export interface EmailRecipientCreateRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  tags?: string[];
  custom_fields?: Record<string, string>;
  source?: string;
}

export interface EmailRecipientUpdateRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  tags?: string[];
  custom_fields?: Record<string, string>;
  is_subscribed?: boolean;
}

export interface RecipientImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; email: string; error: string }>;
}

// ============ Enrollment Types ============

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  recipient_id: string;
  recipient?: EmailRecipient;
  status: "active" | "paused" | "completed" | "exited";
  current_step_id?: string;
  current_step_order: number;
  next_send_at?: string;
  enrolled_at: string;
  completed_at?: string;
  exited_at?: string;
  exit_reason?: string;
}

export interface EnrollmentCreateRequest {
  sequence_id: string;
  recipient_ids: string[];
}

// ============ Send Types ============

export interface EmailSend {
  id: string;
  sequence_id?: string;
  step_id?: string;
  template_id: string;
  recipient_id: string;
  recipient?: EmailRecipient;
  provider_id: string;
  status: SendStatus;
  subject: string;
  from_email: string;
  from_name: string;
  to_email: string;
  scheduled_at?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  bounce_reason?: string;
  error_message?: string;
  message_id?: string;
  created_at: string;
}

// ============ Event Types ============

export interface EmailEvent {
  id: string;
  send_id: string;
  type: EventType;
  data: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  link_url?: string;
  created_at: string;
}

// ============ Workflow Config Types ============

export interface EmailTriggerConfig {
  trigger_type: TriggerType;
  tag_id?: string;
  tag_name?: string;
  webhook_id?: string;
  form_id?: string;
  provider_id?: string;
}

export interface EmailSendConfig {
  template_id: string;
  provider_id?: string;
  subject_override?: string;
  from_name_override?: string;
  from_email_override?: string;
  reply_to_override?: string;
  variables?: Record<string, string>;
  track_opens?: boolean;
  track_clicks?: boolean;
}

export interface EmailDelayConfig {
  delay_value: number;
  delay_unit: DelayUnit;
  send_at_time?: string;
  skip_weekends?: boolean;
  timezone?: string;
}

export interface EmailConditionConfig {
  condition: StepCondition;
  check_send_id?: string;
  check_step_id?: string;
  wait_hours?: number;
  outputs: {
    true_output: string;
    false_output: string;
  };
}

export interface EmailUnsubscribeConfig {
  update_recipient: boolean;
  remove_from_sequences: boolean;
  add_tag?: string;
  redirect_url?: string;
}

// ============ Pagination & Filters ============

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RecipientFilters {
  search?: string;
  tags?: string[];
  is_subscribed?: boolean;
  subscription_status?: "subscribed" | "unsubscribed" | "bounced" | "complained";
  source?: string;
  created_after?: string;
  created_before?: string;
}

export interface SendFilters {
  sequence_id?: string;
  step_id?: string;
  recipient_id?: string;
  status?: SendStatus;
  sent_after?: string;
  sent_before?: string;
}

export interface EventFilters {
  send_id?: string;
  type?: EventType;
  created_after?: string;
  created_before?: string;
}
