/**
 * Trigger Node - Hexagonal shape, amber color
 * Entry points for workflows (Webhook, Schedule, WhatsApp, Manual)
 */
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Clock, Webhook, MessageSquare } from 'lucide-react';

const TRIGGER_ICONS: Record<string, any> = {
  webhook_trigger: Webhook,
  schedule: Clock,
  whatsapp_trigger: MessageSquare,
  evolution_trigger: MessageSquare,
  manual_trigger: Zap,
  premium_trigger: Zap,
};

function TriggerNode({ data, selected }: NodeProps) {
  const label = data?.label || 'Trigger';
  const nodeType = data?.type || 'webhook_trigger';
  const Icon = TRIGGER_ICONS[nodeType as string] || Zap;

  return (
    <div
      className={`
        relative px-4 py-3 min-w-[160px]
        bg-amber-500/10 border-2 rounded-xl
        ${selected ? 'border-amber-400 shadow-lg shadow-amber-400/20' : 'border-amber-500/40'}
        transition-all duration-200
      `}
      style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)' }}
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-amber-500/20 rounded-lg">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-sm font-medium text-amber-200 truncate">
          {label as string}
        </span>
      </div>

      {/* Output handle only (triggers have no input) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-amber-400 !border-amber-600 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(TriggerNode);
