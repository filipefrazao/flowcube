/**
 * FlowCube - Telegram Media Node
 * Workflow node for sending media (photo, video, document, etc.)
 */
'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Image as ImageIcon,
  Video,
  FileText,
  Mic,
  Music,
  Film,
  Sticker,
  Upload,
  Link as LinkIcon,
  Variable,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParseMode } from '@/types/telegram.types';

export interface TelegramMediaNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    bot_id?: string;
    chat_id_source?: 'trigger' | 'variable' | 'static';
    chat_id_variable?: string;
    chat_id_static?: string;
    media_type?: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'animation' | 'sticker';
    media_source?: 'url' | 'file_id' | 'variable';
    media_url?: string;
    media_file_id?: string;
    media_variable?: string;
    caption_template?: string;
    parse_mode?: ParseMode;
    has_spoiler?: boolean;
    disable_notification?: boolean;
    protect_content?: boolean;
    has_keyboard?: boolean;
  };
  status?: 'active' | 'paused' | 'error' | 'draft';
  stats?: {
    media_sent: number;
    success_rate: number;
  };
}

interface TelegramMediaNodeProps extends NodeProps {
  data: TelegramMediaNodeData;
}

const MEDIA_TYPE_CONFIG = {
  photo: { icon: ImageIcon, color: 'blue', label: 'Photo' },
  video: { icon: Video, color: 'red', label: 'Video' },
  document: { icon: FileText, color: 'green', label: 'Document' },
  audio: { icon: Music, color: 'purple', label: 'Audio' },
  voice: { icon: Mic, color: 'orange', label: 'Voice' },
  animation: { icon: Film, color: 'pink', label: 'GIF' },
  sticker: { icon: Sticker, color: 'yellow', label: 'Sticker' },
};

function TelegramMediaNodeComponent({ data, selected }: TelegramMediaNodeProps) {
  const mediaType = data.config?.media_type || 'photo';
  const mediaConfig = MEDIA_TYPE_CONFIG[mediaType] || MEDIA_TYPE_CONFIG.photo;
  const MediaIcon = mediaConfig.icon;

  const mediaSourceLabel = useMemo(() => {
    switch (data.config?.media_source) {
      case 'url':
        return data.config.media_url
          ? new URL(data.config.media_url).hostname
          : 'URL';
      case 'file_id':
        return 'File ID';
      case 'variable':
        return `{{${data.config.media_variable || 'media'}}}`;
      default:
        return 'Not set';
    }
  }, [data.config]);

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

  const colorClasses = {
    blue: {
      gradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30',
      border: 'border-blue-200 dark:border-blue-800',
      borderSelected: 'border-blue-300',
      ring: 'ring-blue-500',
      header: 'border-blue-200/50 dark:border-blue-700/50',
      icon: 'bg-blue-100 dark:bg-blue-900/50',
      iconText: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-700 dark:text-blue-300',
      subtitle: 'text-blue-500 dark:text-blue-400',
      badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      handle: 'bg-blue-500',
    },
    red: {
      gradient: 'from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30',
      border: 'border-red-200 dark:border-red-800',
      borderSelected: 'border-red-300',
      ring: 'ring-red-500',
      header: 'border-red-200/50 dark:border-red-700/50',
      icon: 'bg-red-100 dark:bg-red-900/50',
      iconText: 'text-red-600 dark:text-red-400',
      title: 'text-red-700 dark:text-red-300',
      subtitle: 'text-red-500 dark:text-red-400',
      badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
      handle: 'bg-red-500',
    },
    green: {
      gradient: 'from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30',
      border: 'border-green-200 dark:border-green-800',
      borderSelected: 'border-green-300',
      ring: 'ring-green-500',
      header: 'border-green-200/50 dark:border-green-700/50',
      icon: 'bg-green-100 dark:bg-green-900/50',
      iconText: 'text-green-600 dark:text-green-400',
      title: 'text-green-700 dark:text-green-300',
      subtitle: 'text-green-500 dark:text-green-400',
      badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
      handle: 'bg-green-500',
    },
    purple: {
      gradient: 'from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30',
      border: 'border-purple-200 dark:border-purple-800',
      borderSelected: 'border-purple-300',
      ring: 'ring-purple-500',
      header: 'border-purple-200/50 dark:border-purple-700/50',
      icon: 'bg-purple-100 dark:bg-purple-900/50',
      iconText: 'text-purple-600 dark:text-purple-400',
      title: 'text-purple-700 dark:text-purple-300',
      subtitle: 'text-purple-500 dark:text-purple-400',
      badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
      handle: 'bg-purple-500',
    },
    orange: {
      gradient: 'from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30',
      border: 'border-orange-200 dark:border-orange-800',
      borderSelected: 'border-orange-300',
      ring: 'ring-orange-500',
      header: 'border-orange-200/50 dark:border-orange-700/50',
      icon: 'bg-orange-100 dark:bg-orange-900/50',
      iconText: 'text-orange-600 dark:text-orange-400',
      title: 'text-orange-700 dark:text-orange-300',
      subtitle: 'text-orange-500 dark:text-orange-400',
      badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
      handle: 'bg-orange-500',
    },
    pink: {
      gradient: 'from-pink-50 to-fuchsia-50 dark:from-pink-900/30 dark:to-fuchsia-900/30',
      border: 'border-pink-200 dark:border-pink-800',
      borderSelected: 'border-pink-300',
      ring: 'ring-pink-500',
      header: 'border-pink-200/50 dark:border-pink-700/50',
      icon: 'bg-pink-100 dark:bg-pink-900/50',
      iconText: 'text-pink-600 dark:text-pink-400',
      title: 'text-pink-700 dark:text-pink-300',
      subtitle: 'text-pink-500 dark:text-pink-400',
      badge: 'bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300',
      handle: 'bg-pink-500',
    },
    yellow: {
      gradient: 'from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      borderSelected: 'border-yellow-300',
      ring: 'ring-yellow-500',
      header: 'border-yellow-200/50 dark:border-yellow-700/50',
      icon: 'bg-yellow-100 dark:bg-yellow-900/50',
      iconText: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-700 dark:text-yellow-300',
      subtitle: 'text-yellow-500 dark:text-yellow-400',
      badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
      handle: 'bg-yellow-500',
    },
  };

  const colors = colorClasses[mediaConfig.color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div
      className={cn(
        'relative rounded-lg shadow-md transition-all duration-200 min-w-[220px]',
        `bg-gradient-to-br ${colors.gradient}`,
        selected ? `ring-2 ${colors.ring} ${colors.borderSelected}` : colors.border,
        'border-2 hover:shadow-lg'
      )}
    >
      {statusIndicator}

      {/* Header */}
      <div className={cn('flex items-center gap-3 p-3 border-b', colors.header)}>
        <div className={cn('p-2 rounded-lg', colors.icon)}>
          <MediaIcon className={cn('w-5 h-5', colors.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('font-semibold text-sm truncate', colors.title)}>
            {data.label || `Send ${mediaConfig.label}`}
          </div>
          <div className={cn('text-xs', colors.subtitle)}>
            {mediaConfig.label}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 bg-white/50 dark:bg-gray-900/50 space-y-2">
        {/* Target */}
        <div className="text-xs">
          <span className="text-gray-500">To:</span>
          <span className="ml-1 text-gray-700 dark:text-gray-300 font-mono">
            {chatTarget}
          </span>
        </div>

        {/* Media source */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Source:</span>
          <span className={cn('px-2 py-0.5 rounded-full flex items-center gap-1', colors.badge)}>
            {data.config?.media_source === 'url' && <LinkIcon className="w-3 h-3" />}
            {data.config?.media_source === 'variable' && <Variable className="w-3 h-3" />}
            {data.config?.media_source === 'file_id' && <Upload className="w-3 h-3" />}
            {mediaSourceLabel}
          </span>
        </div>

        {/* Caption preview */}
        {data.config?.caption_template && (
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {data.config.caption_template.substring(0, 50)}
              {data.config.caption_template.length > 50 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Options badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {data.config?.has_spoiler && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              Spoiler
            </span>
          )}
          {data.config?.protect_content && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              Protected
            </span>
          )}
          {data.config?.disable_notification && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              Silent
            </span>
          )}
        </div>

        {/* Stats */}
        {data.stats && (
          <div className="flex justify-between text-xs pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div>
              <span className="text-gray-500">Sent:</span>
              <span className="ml-1 font-mono font-medium text-gray-700 dark:text-gray-300">
                {data.stats.media_sent}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Success:</span>
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
        className={cn('w-3 h-3 rounded-full border-2 border-white', colors.handle)}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={cn('w-3 h-3 rounded-full border-2 border-white', colors.handle)}
      />
    </div>
  );
}

export const TelegramMediaNode = memo(TelegramMediaNodeComponent);
export default TelegramMediaNode;
