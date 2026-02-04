/**
 * FlowCube - Telegram Callback Node
 * Workflow node for handling callback queries (button clicks)
 */
'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  MousePointer,
  MessageSquareReply,
  AlertTriangle,
  Edit3,
  Trash2,
  Forward,
  ExternalLink,
  Timer,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InlineKeyboardMarkup } from '@/types/telegram.types';

export interface TelegramCallbackNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    bot_id?: string;
    answer_text?: string;
    show_alert?: boolean;
    redirect_url?: string;
    cache_time?: number;
    edit_message?: boolean;
    new_text_template?: string;
    new_reply_markup?: InlineKeyboardMarkup;
    callback_routes?: Array<{
      pattern: string;
      action: 'answer' | 'edit' | 'delete' | 'forward';
    }>;
  };
  status?: 'active' | 'paused' | 'error' | 'draft';
  stats?: {
    callbacks_handled: number;
    avg_response_ms?: number;
    routes_triggered?: Record<string, number>;
  };
}

interface TelegramCallbackNodeProps extends NodeProps {
  data: TelegramCallbackNodeData;
}

const ACTION_ICONS = {
  answer: MessageSquareReply,
  edit: Edit3,
  delete: Trash2,
  forward: Forward,
};

function TelegramCallbackNodeComponent({ data, selected }: TelegramCallbackNodeProps) {
  const routes = data.config?.callback_routes || [];
  const hasRoutes = routes.length > 0;

  const actionSummary = useMemo(() => {
    const actions: string[] = [];
    if (data.config?.answer_text) actions.push('Answer');
    if (data.config?.show_alert) actions.push('Alert');
    if (data.config?.edit_message) actions.push('Edit');
    if (data.config?.redirect_url) actions.push('Redirect');
    if (hasRoutes) actions.push(`${routes.length} routes`);
    return actions.length > 0 ? actions.join(', ') : 'No actions';
  }, [data.config, hasRoutes, routes.length]);

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
        'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30',
        selected ? 'ring-2 ring-amber-500 border-amber-300' : 'border-amber-200 dark:border-amber-800',
        'border-2 hover:shadow-lg'
      )}
    >
      {statusIndicator}

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-amber-200/50 dark:border-amber-700/50">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
          <MousePointer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-amber-700 dark:text-amber-300 truncate">
            {data.label || 'Handle Callback'}
          </div>
          <div className="text-xs text-amber-500 dark:text-amber-400">
            Button Click Handler
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 bg-white/50 dark:bg-gray-900/50 space-y-2">
        {/* Actions summary */}
        <div className="text-xs">
          <span className="text-gray-500">Actions:</span>
          <span className="ml-1 text-gray-700 dark:text-gray-300">
            {actionSummary}
          </span>
        </div>

        {/* Answer text preview */}
        {data.config?.answer_text && (
          <div className={cn(
            'p-2 rounded-lg flex items-start gap-2',
            data.config.show_alert
              ? 'bg-yellow-100 dark:bg-yellow-900/30'
              : 'bg-gray-100 dark:bg-gray-800'
          )}>
            {data.config.show_alert && (
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {data.config.answer_text}
            </p>
          </div>
        )}

        {/* Redirect URL */}
        {data.config?.redirect_url && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate font-mono">{data.config.redirect_url}</span>
          </div>
        )}

        {/* Cache time */}
        {data.config?.cache_time && data.config.cache_time > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Timer className="w-3 h-3" />
            Cache: {data.config.cache_time}s
          </div>
        )}

        {/* Routes */}
        {hasRoutes && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
              <GitBranch className="w-3 h-3" />
              Callback Routes
            </div>
            {routes.slice(0, 3).map((route, index) => {
              const ActionIcon = ACTION_ICONS[route.action] || MousePointer;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs"
                >
                  <code className="flex-1 font-mono text-gray-600 dark:text-gray-400 truncate">
                    {route.pattern}
                  </code>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <ActionIcon className="w-3 h-3" />
                    {route.action}
                  </span>
                </div>
              );
            })}
            {routes.length > 3 && (
              <p className="text-xs text-gray-400 text-center">
                +{routes.length - 3} more routes
              </p>
            )}
          </div>
        )}

        {/* Edit message preview */}
        {data.config?.edit_message && data.config?.new_text_template && (
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
              <Edit3 className="w-3 h-3" />
              Edit to:
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {data.config.new_text_template.substring(0, 50)}
              {data.config.new_text_template.length > 50 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Stats */}
        {data.stats && (
          <div className="flex justify-between text-xs pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <div>
              <span className="text-gray-500">Handled:</span>
              <span className="ml-1 font-mono font-medium text-gray-700 dark:text-gray-300">
                {data.stats.callbacks_handled}
              </span>
            </div>
            {data.stats.avg_response_ms && (
              <div>
                <span className="text-gray-500">Avg:</span>
                <span className="ml-1 font-mono font-medium text-gray-700 dark:text-gray-300">
                  {data.stats.avg_response_ms}ms
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 rounded-full border-2 border-white bg-amber-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 rounded-full border-2 border-white bg-amber-500"
        id="default"
      />
      {/* Additional output handle for routes */}
      {hasRoutes && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 rounded-full border-2 border-white bg-purple-500"
          id="route"
          style={{ top: '75%' }}
        />
      )}
    </div>
  );
}

export const TelegramCallbackNode = memo(TelegramCallbackNodeComponent);
export default TelegramCallbackNode;
