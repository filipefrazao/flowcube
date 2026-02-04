/**
 * FlowCube - Telegram Trigger Node
 * Workflow node for Telegram message/callback triggers
 */
'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  MessageSquare,
  Terminal,
  MousePointer,
  UserPlus,
  Users,
  AtSign,
  Hash,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TelegramTriggerNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    bot_id?: string;
    trigger_type?: 'message' | 'command' | 'callback' | 'inline_query' | 'chat_member';
    message_types?: string[];
    commands?: string[];
    callback_data_pattern?: string;
    chat_types?: string[];
  };
  status?: 'active' | 'paused' | 'error' | 'draft';
  stats?: {
    triggers_today: number;
    triggers_total: number;
    last_trigger?: string;
  };
}

interface TelegramTriggerNodeProps extends NodeProps {
  data: TelegramTriggerNodeData;
}

const TRIGGER_ICONS = {
  message: MessageSquare,
  command: Terminal,
  callback: MousePointer,
  inline_query: AtSign,
  chat_member: UserPlus,
};

function TelegramTriggerNodeComponent({ data, selected }: TelegramTriggerNodeProps) {
  const triggerType = data.config?.trigger_type || 'message';
  const TriggerIcon = TRIGGER_ICONS[triggerType] || MessageSquare;

  const triggerLabel = useMemo(() => {
    switch (triggerType) {
      case 'message':
        return 'Message Received';
      case 'command':
        const cmds = data.config?.commands?.slice(0, 2).map((c) => `/${c}`).join(', ');
        return cmds ? `Commands: ${cmds}` : 'Bot Command';
      case 'callback':
        return 'Button Clicked';
      case 'inline_query':
        return 'Inline Query';
      case 'chat_member':
        return 'Member Update';
      default:
        return 'Telegram Trigger';
    }
  }, [triggerType, data.config?.commands]);

  const statusIndicator = useMemo(() => {
    switch (data.status) {
      case 'active':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />;
      case 'paused':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white" />;
      case 'error':
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />;
      default:
        return <span className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white" />;
    }
  }, [data.status]);

  return (
    <div
      className={cn(
        'relative rounded-lg shadow-md transition-all duration-200 min-w-[220px]',
        'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30',
        selected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-blue-200 dark:border-blue-800',
        'border-2 hover:shadow-lg'
      )}
    >
      {statusIndicator}

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-blue-200/50 dark:border-blue-700/50">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
          <TriggerIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-blue-700 dark:text-blue-300 truncate">
            {data.label || 'Telegram Trigger'}
          </div>
          <div className="text-xs text-blue-500 dark:text-blue-400">
            {triggerLabel}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 bg-white/50 dark:bg-gray-900/50 space-y-2">
        {/* Trigger type badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
            {triggerType}
          </span>
          {data.config?.chat_types?.map((type) => (
            <span
              key={type}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full"
            >
              {type}
            </span>
          ))}
        </div>

        {/* Commands list (for command trigger) */}
        {triggerType === 'command' && data.config?.commands && data.config.commands.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.config.commands.slice(0, 4).map((cmd) => (
              <code
                key={cmd}
                className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded font-mono"
              >
                /{cmd}
              </code>
            ))}
            {data.config.commands.length > 4 && (
              <span className="text-xs text-gray-400">+{data.config.commands.length - 4} more</span>
            )}
          </div>
        )}

        {/* Callback pattern (for callback trigger) */}
        {triggerType === 'callback' && data.config?.callback_data_pattern && (
          <code className="block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded font-mono truncate">
            {data.config.callback_data_pattern}
          </code>
        )}

        {/* Stats */}
        {data.stats && (
          <div className="flex justify-between text-xs pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div>
              <span className="text-gray-500">Today:</span>
              <span className="ml-1 font-mono font-medium text-gray-700 dark:text-gray-300">
                {data.stats.triggers_today}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Total:</span>
              <span className="ml-1 font-mono font-medium text-gray-700 dark:text-gray-300">
                {data.stats.triggers_total}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Handles - only source (output) for triggers */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 rounded-full border-2 border-white bg-blue-500"
      />
    </div>
  );
}

export const TelegramTriggerNode = memo(TelegramTriggerNodeComponent);
export default TelegramTriggerNode;
