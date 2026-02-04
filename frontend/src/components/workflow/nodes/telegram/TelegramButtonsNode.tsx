/**
 * FlowCube - Telegram Buttons Node
 * Workflow node for sending messages with inline keyboards
 */
'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Keyboard,
  Grid3X3,
  Link as LinkIcon,
  MousePointer,
  Code,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InlineKeyboardButton } from '@/types/telegram.types';

export interface TelegramButtonsNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    bot_id?: string;
    keyboard_type?: 'inline' | 'reply' | 'remove' | 'force_reply';
    buttons?: InlineKeyboardButton[][];
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
    input_field_placeholder?: string;
    text_template?: string;
  };
  status?: 'active' | 'paused' | 'error' | 'draft';
  stats?: {
    clicks_total: number;
    clicks_by_button?: Record<string, number>;
  };
}

interface TelegramButtonsNodeProps extends NodeProps {
  data: TelegramButtonsNodeData;
}

function getButtonTypeIcon(button: InlineKeyboardButton) {
  if (button.url) return LinkIcon;
  if (button.web_app) return Code;
  return MousePointer;
}

function TelegramButtonsNodeComponent({ data, selected }: TelegramButtonsNodeProps) {
  const keyboardType = data.config?.keyboard_type || 'inline';
  const buttons = data.config?.buttons || [];

  const totalButtons = useMemo(() => {
    return buttons.reduce((sum, row) => sum + row.length, 0);
  }, [buttons]);

  const keyboardLabel = useMemo(() => {
    switch (keyboardType) {
      case 'inline':
        return 'Inline Keyboard';
      case 'reply':
        return 'Reply Keyboard';
      case 'remove':
        return 'Remove Keyboard';
      case 'force_reply':
        return 'Force Reply';
      default:
        return 'Keyboard';
    }
  }, [keyboardType]);

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
        'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30',
        selected ? 'ring-2 ring-purple-500 border-purple-300' : 'border-purple-200 dark:border-purple-800',
        'border-2 hover:shadow-lg'
      )}
    >
      {statusIndicator}

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-purple-200/50 dark:border-purple-700/50">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
          {keyboardType === 'remove' ? (
            <Trash2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          ) : (
            <Keyboard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-purple-700 dark:text-purple-300 truncate">
            {data.label || 'Telegram Buttons'}
          </div>
          <div className="text-xs text-purple-500 dark:text-purple-400">
            {keyboardLabel}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 bg-white/50 dark:bg-gray-900/50 space-y-2">
        {keyboardType === 'remove' ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
            Removes the current keyboard
          </p>
        ) : keyboardType === 'force_reply' ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Forces user to reply to this message
            </p>
            {data.config?.input_field_placeholder && (
              <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                "{data.config.input_field_placeholder}"
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Message preview */}
            {data.config?.text_template && (
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {data.config.text_template.substring(0, 50)}
                  {data.config.text_template.length > 50 ? '...' : ''}
                </p>
              </div>
            )}

            {/* Keyboard preview */}
            {buttons.length > 0 ? (
              <div className="space-y-1">
                {buttons.slice(0, 3).map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {row.slice(0, 3).map((btn, btnIndex) => {
                      const Icon = getButtonTypeIcon(btn);
                      return (
                        <div
                          key={btnIndex}
                          className={cn(
                            'flex-1 px-2 py-1 text-xs rounded text-center truncate flex items-center justify-center gap-1',
                            keyboardType === 'inline'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {btn.url || btn.web_app ? (
                            <Icon className="w-3 h-3 flex-shrink-0" />
                          ) : null}
                          <span className="truncate">{btn.text}</span>
                        </div>
                      );
                    })}
                    {row.length > 3 && (
                      <span className="text-xs text-gray-400 self-center">+{row.length - 3}</span>
                    )}
                  </div>
                ))}
                {buttons.length > 3 && (
                  <p className="text-xs text-gray-400 text-center">
                    +{buttons.length - 3} more rows
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">
                No buttons configured
              </p>
            )}

            {/* Keyboard stats */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
              <span className="text-gray-500 flex items-center gap-1">
                <Grid3X3 className="w-3 h-3" />
                {buttons.length} rows, {totalButtons} buttons
              </span>
              {keyboardType === 'reply' && (
                <span className="text-gray-500">
                  {data.config?.one_time_keyboard ? 'One-time' : 'Persistent'}
                </span>
              )}
            </div>
          </>
        )}

        {/* Click stats */}
        {data.stats && data.stats.clicks_total > 0 && (
          <div className="text-xs pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <span className="text-gray-500">Total clicks:</span>
            <span className="ml-1 font-mono font-medium text-gray-700 dark:text-gray-300">
              {data.stats.clicks_total}
            </span>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 rounded-full border-2 border-white bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 rounded-full border-2 border-white bg-purple-500"
      />
    </div>
  );
}

export const TelegramButtonsNode = memo(TelegramButtonsNodeComponent);
export default TelegramButtonsNode;
