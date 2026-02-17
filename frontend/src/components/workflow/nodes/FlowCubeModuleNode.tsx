/**
 * FlowCube Module Node - Integration nodes with module badges
 * ChatCube (green), SalesCube (coral), SocialCube (blue), FunnelCube (purple)
 */
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  MessageCircle,
  Users,
  Share2,
  BarChart3,
  FileText,
  Phone,
} from 'lucide-react';

const MODULE_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; icon: any; badge: string }> = {
  chatcube_send: {
    color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/40',
    icon: MessageCircle, badge: 'ChatCube',
  },
  whatsapp_send: {
    color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/40',
    icon: Phone, badge: 'ChatCube',
  },
  salescube_create_lead: {
    color: 'text-coral', bgColor: 'bg-primary/10', borderColor: 'border-primary/40',
    icon: Users, badge: 'SalesCube',
  },
  salescube_update_lead: {
    color: 'text-coral', bgColor: 'bg-primary/10', borderColor: 'border-primary/40',
    icon: Users, badge: 'SalesCube',
  },
  socialcube_post: {
    color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/40',
    icon: Share2, badge: 'SocialCube',
  },
  funnelcube_track: {
    color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/40',
    icon: BarChart3, badge: 'FunnelCube',
  },
  pagecube_submissions: {
    color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/40',
    icon: FileText, badge: 'PageCube',
  },
};

const DEFAULT_CONFIG = {
  color: 'text-text-secondary', bgColor: 'bg-surface', borderColor: 'border-border',
  icon: Users, badge: 'FlowCube',
};

function FlowCubeModuleNode({ data, selected }: NodeProps) {
  const label = data?.label || 'Module';
  const nodeType = (data?.type || '') as string;
  const config = MODULE_CONFIG[nodeType] || DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <div
      className={`
        relative px-4 py-3 min-w-[180px]
        ${config.bgColor} border-2 rounded-xl
        ${selected ? 'shadow-lg' : ''}
        ${config.borderColor}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-white/60 !border-white/30 !w-3 !h-3"
      />

      {/* Module badge */}
      <div className="absolute -top-2.5 left-3">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.bgColor} ${config.color} border ${config.borderColor}`}>
          {config.badge}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <span className="text-sm font-medium text-text-primary truncate">
          {label as string}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-white/60 !border-white/30 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(FlowCubeModuleNode);
