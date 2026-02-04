/**
 * FlowCube - Telegram Workflow Nodes
 * Export all Telegram-related workflow nodes
 */

export { TelegramTriggerNode } from './TelegramTriggerNode';
export { TelegramSendNode } from './TelegramSendNode';
export { TelegramButtonsNode } from './TelegramButtonsNode';
export { TelegramMediaNode } from './TelegramMediaNode';
export { TelegramCallbackNode } from './TelegramCallbackNode';

// Node type definitions for React Flow
export const telegramNodeTypes = {
  telegram_trigger: 'TelegramTriggerNode',
  telegram_message_trigger: 'TelegramTriggerNode',
  telegram_command_trigger: 'TelegramTriggerNode',
  telegram_callback_trigger: 'TelegramTriggerNode',
  telegram_send: 'TelegramSendNode',
  telegram_send_message: 'TelegramSendNode',
  telegram_buttons: 'TelegramButtonsNode',
  telegram_keyboard: 'TelegramButtonsNode',
  telegram_media: 'TelegramMediaNode',
  telegram_photo: 'TelegramMediaNode',
  telegram_video: 'TelegramMediaNode',
  telegram_document: 'TelegramMediaNode',
  telegram_callback: 'TelegramCallbackNode',
  telegram_callback_handler: 'TelegramCallbackNode',
};

// Category definition for the palette
export const telegramNodeCategory = {
  id: 'telegram',
  label: 'Telegram',
  color: '#0088cc',
  description: 'Telegram Bot integration nodes',
  nodes: [
    {
      type: 'telegram_trigger',
      label: 'Telegram Trigger',
      description: 'Trigger on Telegram messages',
      icon: 'MessageSquare',
    },
    {
      type: 'telegram_send',
      label: 'Send Message',
      description: 'Send a Telegram message',
      icon: 'Send',
    },
    {
      type: 'telegram_buttons',
      label: 'Inline Keyboard',
      description: 'Send message with buttons',
      icon: 'Keyboard',
    },
    {
      type: 'telegram_media',
      label: 'Send Media',
      description: 'Send photo, video, or document',
      icon: 'Image',
    },
    {
      type: 'telegram_callback',
      label: 'Handle Callback',
      description: 'Handle button clicks',
      icon: 'MousePointer',
    },
  ],
};

// Default configs for creating new nodes
export function getTelegramNodeDefaultConfig(type: string): Record<string, unknown> {
  switch (type) {
    case 'telegram_trigger':
    case 'telegram_message_trigger':
      return {
        trigger_type: 'message',
        message_types: ['text'],
        chat_types: ['private'],
      };
    case 'telegram_command_trigger':
      return {
        trigger_type: 'command',
        commands: ['start'],
      };
    case 'telegram_callback_trigger':
      return {
        trigger_type: 'callback',
        callback_data_pattern: '*',
      };
    case 'telegram_send':
    case 'telegram_send_message':
      return {
        chat_id_source: 'trigger',
        message_type: 'text',
        text_template: '',
        parse_mode: 'HTML',
      };
    case 'telegram_buttons':
    case 'telegram_keyboard':
      return {
        keyboard_type: 'inline',
        buttons: [[{ text: 'Button', callback_data: 'action_1' }]],
        text_template: 'Choose an option:',
      };
    case 'telegram_media':
    case 'telegram_photo':
      return {
        chat_id_source: 'trigger',
        media_type: 'photo',
        media_source: 'url',
      };
    case 'telegram_video':
      return {
        chat_id_source: 'trigger',
        media_type: 'video',
        media_source: 'url',
      };
    case 'telegram_document':
      return {
        chat_id_source: 'trigger',
        media_type: 'document',
        media_source: 'url',
      };
    case 'telegram_callback':
    case 'telegram_callback_handler':
      return {
        answer_text: '',
        show_alert: false,
        edit_message: false,
      };
    default:
      return {};
  }
}
