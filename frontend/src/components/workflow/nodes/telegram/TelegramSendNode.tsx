/**
 * FlowCube - Telegram Send Message Node
 * Workflow node for sending Telegram messages
 */
'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Send,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Video,
  Mic,
  MapPin,
  Keyboard,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParseMode } from '@/types/telegram.types';

export interface TelegramSendNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    bot_id?: string;
    chat_id_source?: 'trigger' | 'variable' | 'static';
    chat_id_variable?: string;
    chat_id_static?: string;
    message_type?: 'text' | 'photo' | 'document' | 'video' | 'audio';
    text_template?: string;
    media_url_source?: 'variable' | 'static';
    media_url_variable?: string;
    media_url_static?: string;
    caption_template?: string;
    parse_mode?: ParseMode;
    has_keyboard?: boolean;
    reply_to_message?: boolean;
  };
  status?: 'active' | 'paused' | 'error' | 'draft';
  stats?: {
    messages_sent: number;
    success_rate: number;
    avg_delivery_ms?: number;
  };
}

interface TelegramSendNodeProps extends NodeProps {
  data: TelegramSendNodeData;
}

const MESSAGE_TYPE_ICONS = {
  text: MessageSquare,
  photo: ImageIcon,
  document: FileText,
  video: Video,
  audio: Mic,
};

function TelegramSendNodeComponent({ data, selected }: TelegramSendNodeProps) {
  const messageType = data.config?.message_type || 'text';
  const MessageIcon = MESSAGE_TYPE_ICONS[messageType] || MessageSquare;

  const previewText = useMemo(() => {
    if (messageType === 'text') {
      const text = data.config?.text_template || '';
      return text.length > 50 ? `${text.substring(0, 50)}...` : text || 'No message set';
    }
    const caption = data.config?.caption_template || '';
    return caption ? `Caption: ${caption.substring(0, 30)}...` : `Send ${messageType}`;
  }, [messageType, data.config?.text_template, data.config?.caption_template]);

  const chatTarget = useMemo(() => {
    switch (data.config?.chat_id_source) {
      case 'trigger':
        return 'Reply to trigger';
      case 'variable':
        return `{{${data.config?.chat_id_variable || 'chat_id'}}}`;
      case 'static':
        return data.config?.chat_id_static || 'Not set';
      default:
        return 'Reply to trigger';
    }
  }, [data.config]);

  const statusIndicator = useMemo(() => {
    switch (data.status) {
      case 'active':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />;
      case 'paused':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white" />;
      case 'error':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />;
      default:
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white" />;
    }
  }, [data.status]);

  return (
    <div
      className={cn(
        'relative rounded-lg shadow-md transition-all duration-200 min-w-[220px]',
        'bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30',
        selected ? 'ring-2 ring-teal-500 border-teal-300' : 'border-teal-200 dark:border-teal-800',
        'border-2 hover:shadow-lg'
      )}
    >
      {statusIndicator}

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-teal-200/50 dark:border-teal-700/50">
        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/50">
          <Send className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-teal-700 dark:text-teal-300 truncate">
            {data.label || 'Send Message'}
          </div>
          <div className="text-xs text-teal-500 dark:text-teal-400 flex items-center gap-1">
            <MessageIcon className="w-3 h-3" />
            {messageType.charAt(0).toUpperCase() + messageType.slice(1)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 bg-surface/50 dark:bg-background-secondary/50 space-y-2">
        {/* Target */}
        <div className="text-xs">
          <span className="text-text-muted">To:</span>
          <span className="ml-1 text-text-secondary dark:text-text-primary font-mono">
            {chatTarget}
          </span>
        </div>

        {/* Message preview */}
        <div className="p-2 bg-surface-hover dark:bg-surface rounded-lg">
          <p className="text-xs text-text-muted dark:text-text-secondary truncate">
            {previewText}
          </p>
        </div>

        {/* Options badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {data.config?.parse_mode && (
            <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs rounded-full">
              {data.config.parse_mode}
            </span>
          )}
          {data.config?.has_keyboard && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded-full flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              Keyboard
            </span>
          )}
          {data.config?.reply_to_message && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              Reply
            </span>
          )}
        </div>

        {/* Stats */}
        {data.stats && (
          <div className="flex justify-between text-xs pt-2 border-t border-border/50 dark:border-border/50">
            <div>
              <span className="text-text-muted">Sent:</span>
              <span className="ml-1 font-mono font-medium text-text-secondary dark:text-text-primary">
                {data.stats.messages_sent}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Success:</span>
              <span
                className={cn(
                  'ml-1 font-mono font-medium',
                  data.stats.success_rate >= 95 ? 'text-green-600' :
                  data.stats.success_rate >= 80 ? 'text-yellow-600' : 'text-red-600'
                )}
              >
                {data.stats.success_rate}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 rounded-full border-2 border-white bg-teal-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 rounded-full border-2 border-white bg-teal-500"
      />
    </div>
  );
}

export const TelegramSendNode = memo(TelegramSendNodeComponent);
export default TelegramSendNode;
