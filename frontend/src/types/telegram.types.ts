/**
 * FlowCube - Telegram Bot Integration Types
 * Complete TypeScript definitions for Telegram Bot API integration
 */

// ============ Enums ============

export enum MessageType {
  TEXT = 'text',
  PHOTO = 'photo',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VOICE = 'voice',
  STICKER = 'sticker',
  ANIMATION = 'animation',
  LOCATION = 'location',
  CONTACT = 'contact',
  POLL = 'poll',
  DICE = 'dice',
  VIDEO_NOTE = 'video_note',
}

export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group',
  SUPERGROUP = 'supergroup',
  CHANNEL = 'channel',
}

export enum BotStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING = 'pending',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  FAILED = 'failed',
  NOT_SET = 'not_set',
}

export enum ParseMode {
  HTML = 'HTML',
  MARKDOWN = 'Markdown',
  MARKDOWN_V2 = 'MarkdownV2',
}

// ============ Core Telegram Types ============

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramBot {
  id: string;
  name: string;
  username: string;
  token: string;
  description?: string;
  status: BotStatus;
  webhook_url?: string;
  webhook_status: WebhookStatus;
  webhook_secret?: string;
  allowed_updates?: string[];
  max_connections?: number;
  pending_update_count?: number;
  last_error_date?: string;
  last_error_message?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Bot settings
  settings: TelegramBotSettings;
  // Stats
  stats?: TelegramBotStats;
}

export interface TelegramBotSettings {
  parse_mode: ParseMode;
  disable_web_page_preview: boolean;
  disable_notification: boolean;
  protect_content: boolean;
  allow_sending_without_reply: boolean;
  // Commands
  commands?: BotCommand[];
  // Menu button
  menu_button?: MenuButton;
  // Chat permissions defaults
  default_chat_permissions?: ChatPermissions;
}

export interface TelegramBotStats {
  total_chats: number;
  total_messages_sent: number;
  total_messages_received: number;
  active_chats_24h: number;
  messages_today: number;
  avg_response_time_ms?: number;
}

export interface BotCommand {
  command: string;
  description: string;
}

export interface MenuButton {
  type: 'commands' | 'web_app' | 'default';
  text?: string;
  web_app?: { url: string };
}

export interface ChatPermissions {
  can_send_messages?: boolean;
  can_send_audios?: boolean;
  can_send_documents?: boolean;
  can_send_photos?: boolean;
  can_send_videos?: boolean;
  can_send_video_notes?: boolean;
  can_send_voice_notes?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
}

// ============ Chat Types ============

export interface TelegramChat {
  id: string;
  telegram_chat_id: number;
  bot_id: string;
  type: ChatType;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo?: ChatPhoto;
  bio?: string;
  description?: string;
  invite_link?: string;
  pinned_message_id?: number;
  // Permissions (for groups/supergroups)
  permissions?: ChatPermissions;
  // Stats
  member_count?: number;
  message_count: number;
  unread_count: number;
  last_message_at?: string;
  last_message_preview?: string;
  // FlowCube specific
  is_archived: boolean;
  is_muted: boolean;
  labels?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  // User info (for private chats)
  user?: TelegramUser;
}

export interface ChatPhoto {
  small_file_id: string;
  small_file_unique_id: string;
  big_file_id: string;
  big_file_unique_id: string;
}

// ============ Message Types ============

export interface TelegramMessage {
  id: string;
  telegram_message_id: number;
  chat_id: string;
  bot_id: string;
  from_user?: TelegramUser;
  date: string;
  // Message content
  message_type: MessageType;
  text?: string;
  caption?: string;
  // Media
  photo?: PhotoSize[];
  video?: Video;
  audio?: Audio;
  document?: Document;
  voice?: Voice;
  sticker?: Sticker;
  animation?: Animation;
  video_note?: VideoNote;
  // Other content types
  location?: Location;
  contact?: Contact;
  poll?: Poll;
  dice?: Dice;
  // Reply info
  reply_to_message_id?: number;
  reply_to_message?: TelegramMessage;
  // Inline keyboard if present
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup;
  // Entities (formatting, links, mentions)
  entities?: MessageEntity[];
  caption_entities?: MessageEntity[];
  // Edit info
  edit_date?: string;
  // Forward info
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_date?: string;
  // FlowCube specific
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  error_message?: string;
  workflow_execution_id?: string;
  is_ai_generated?: boolean;
  created_at: string;
}

export interface PhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface Video {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Audio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: PhotoSize;
}

export interface Document {
  file_id: string;
  file_unique_id: string;
  thumbnail?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Voice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface Sticker {
  file_id: string;
  file_unique_id: string;
  type: 'regular' | 'mask' | 'custom_emoji';
  width: number;
  height: number;
  is_animated: boolean;
  is_video: boolean;
  thumbnail?: PhotoSize;
  emoji?: string;
  set_name?: string;
  file_size?: number;
}

export interface Animation {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface VideoNote {
  file_id: string;
  file_unique_id: string;
  length: number;
  duration: number;
  thumbnail?: PhotoSize;
  file_size?: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export interface Contact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: 'regular' | 'quiz';
  allows_multiple_answers: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_entities?: MessageEntity[];
  open_period?: number;
  close_date?: number;
}

export interface PollOption {
  text: string;
  voter_count: number;
}

export interface Dice {
  emoji: string;
  value: number;
}

export interface MessageEntity {
  type: 'mention' | 'hashtag' | 'cashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'spoiler' | 'blockquote' | 'code' | 'pre' | 'text_link' | 'text_mention' | 'custom_emoji';
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
  custom_emoji_id?: string;
}

// ============ Keyboard Types ============

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
  login_url?: LoginUrl;
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  switch_inline_query_chosen_chat?: SwitchInlineQueryChosenChat;
  pay?: boolean;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface ReplyKeyboardButton {
  text: string;
  request_user?: KeyboardButtonRequestUser;
  request_chat?: KeyboardButtonRequestChat;
  request_contact?: boolean;
  request_location?: boolean;
  request_poll?: KeyboardButtonPollType;
  web_app?: { url: string };
}

export interface ReplyKeyboardMarkup {
  keyboard: ReplyKeyboardButton[][];
  is_persistent?: boolean;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface ReplyKeyboardRemove {
  remove_keyboard: true;
  selective?: boolean;
}

export interface ForceReply {
  force_reply: true;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface LoginUrl {
  url: string;
  forward_text?: string;
  bot_username?: string;
  request_write_access?: boolean;
}

export interface SwitchInlineQueryChosenChat {
  query?: string;
  allow_user_chats?: boolean;
  allow_bot_chats?: boolean;
  allow_group_chats?: boolean;
  allow_channel_chats?: boolean;
}

export interface KeyboardButtonRequestUser {
  request_id: number;
  user_is_bot?: boolean;
  user_is_premium?: boolean;
}

export interface KeyboardButtonRequestChat {
  request_id: number;
  chat_is_channel: boolean;
  chat_is_forum?: boolean;
  chat_has_username?: boolean;
  chat_is_created?: boolean;
  user_administrator_rights?: ChatPermissions;
  bot_administrator_rights?: ChatPermissions;
  bot_is_member?: boolean;
}

export interface KeyboardButtonPollType {
  type?: 'quiz' | 'regular';
}

// ============ Callback Types ============

export interface TelegramCallback {
  id: string;
  telegram_callback_id: string;
  bot_id: string;
  chat_id: string;
  message_id?: number;
  inline_message_id?: string;
  from_user: TelegramUser;
  callback_data?: string;
  game_short_name?: string;
  chat_instance: string;
  answered: boolean;
  answer_text?: string;
  answer_show_alert?: boolean;
  answer_url?: string;
  created_at: string;
}

// ============ Update Types ============

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: TelegramCallback;
  inline_query?: InlineQuery;
  chosen_inline_result?: ChosenInlineResult;
  poll?: Poll;
  poll_answer?: PollAnswer;
  my_chat_member?: ChatMemberUpdated;
  chat_member?: ChatMemberUpdated;
  chat_join_request?: ChatJoinRequest;
}

export interface InlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
  chat_type?: ChatType;
  location?: Location;
}

export interface ChosenInlineResult {
  result_id: string;
  from: TelegramUser;
  location?: Location;
  inline_message_id?: string;
  query: string;
}

export interface PollAnswer {
  poll_id: string;
  voter_chat?: TelegramChat;
  user?: TelegramUser;
  option_ids: number[];
}

export interface ChatMemberUpdated {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
  invite_link?: ChatInviteLink;
  via_join_request?: boolean;
  via_chat_folder_invite_link?: boolean;
}

export interface ChatMember {
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  user: TelegramUser;
  is_anonymous?: boolean;
  custom_title?: string;
}

export interface ChatJoinRequest {
  chat: TelegramChat;
  from: TelegramUser;
  user_chat_id: number;
  date: number;
  bio?: string;
  invite_link?: ChatInviteLink;
}

export interface ChatInviteLink {
  invite_link: string;
  creator: TelegramUser;
  creates_join_request: boolean;
  is_primary: boolean;
  is_revoked: boolean;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  pending_join_request_count?: number;
}

// ============ API Request/Response Types ============

export interface TelegramBotCreateRequest {
  name: string;
  token: string;
  description?: string;
  settings?: Partial<TelegramBotSettings>;
}

export interface TelegramBotUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  settings?: Partial<TelegramBotSettings>;
}

export interface SetWebhookRequest {
  url: string;
  secret_token?: string;
  max_connections?: number;
  allowed_updates?: string[];
  drop_pending_updates?: boolean;
}

export interface SendMessageRequest {
  chat_id: number | string;
  text: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;
}

export interface SendPhotoRequest {
  chat_id: number | string;
  photo: string; // file_id or URL
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  has_spoiler?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;
}

export interface SendDocumentRequest {
  chat_id: number | string;
  document: string; // file_id or URL
  thumbnail?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  disable_content_type_detection?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;
}

export interface EditMessageTextRequest {
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  text: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  disable_web_page_preview?: boolean;
  reply_markup?: InlineKeyboardMarkup;
}

export interface AnswerCallbackQueryRequest {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

// ============ FlowCube Workflow Node Types ============

export interface TelegramTriggerConfig {
  bot_id: string;
  trigger_type: 'message' | 'command' | 'callback' | 'inline_query' | 'chat_member';
  // For message triggers
  message_types?: MessageType[];
  // For command triggers
  commands?: string[];
  // For callback triggers
  callback_data_pattern?: string;
  // Filters
  chat_types?: ChatType[];
  user_ids?: number[];
  username_pattern?: string;
  text_pattern?: string;
  // Output mapping
  output_variables?: Record<string, string>;
}

export interface TelegramSendConfig {
  bot_id: string;
  chat_id_source: 'trigger' | 'variable' | 'static';
  chat_id_variable?: string;
  chat_id_static?: string;
  // Message content
  message_type: 'text' | 'photo' | 'document' | 'video' | 'audio';
  text_template?: string;
  media_url_source?: 'variable' | 'static';
  media_url_variable?: string;
  media_url_static?: string;
  caption_template?: string;
  // Options
  parse_mode?: ParseMode;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  // Reply
  reply_to_message?: boolean;
  // Keyboard
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup;
}

export interface TelegramButtonsConfig {
  bot_id: string;
  keyboard_type: 'inline' | 'reply' | 'remove' | 'force_reply';
  buttons: InlineKeyboardButton[][] | ReplyKeyboardButton[][];
  // Reply keyboard options
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  is_persistent?: boolean;
  selective?: boolean;
}

export interface TelegramMediaConfig {
  bot_id: string;
  chat_id_source: 'trigger' | 'variable' | 'static';
  chat_id_variable?: string;
  chat_id_static?: string;
  // Media
  media_type: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'animation' | 'sticker';
  media_source: 'url' | 'file_id' | 'variable';
  media_url?: string;
  media_file_id?: string;
  media_variable?: string;
  // Caption
  caption_template?: string;
  parse_mode?: ParseMode;
  // Options
  has_spoiler?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message?: boolean;
  reply_markup?: InlineKeyboardMarkup;
}

export interface TelegramCallbackConfig {
  bot_id: string;
  // Answer options
  answer_text?: string;
  show_alert?: boolean;
  redirect_url?: string;
  cache_time?: number;
  // Edit message
  edit_message?: boolean;
  new_text_template?: string;
  new_reply_markup?: InlineKeyboardMarkup;
  // Actions based on callback_data
  callback_routes?: Array<{
    pattern: string;
    action: 'answer' | 'edit' | 'delete' | 'forward';
    config: Record<string, unknown>;
  }>;
}

// ============ Helper Types ============

export type KeyboardMarkup = InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}
