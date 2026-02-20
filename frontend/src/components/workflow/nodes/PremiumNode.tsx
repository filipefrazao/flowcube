'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Zap, MessageSquare, GitBranch, Brain, Sparkles } from 'lucide-react';
import { nodeVariants } from '@/utils/animations/node-animations';

interface PremiumNodeData {
  label: string;
  // Accept wide string types; editor/store uses values like "draft".
  type?: string;
  icon?: string;
  description?: string;
  status?: string;
}

type NormalizedType = 'trigger' | 'action' | 'condition' | 'ai';

type NormalizedStatus = 'idle' | 'running' | 'success' | 'error';

export const PremiumNode = memo(({ data, selected }: NodeProps<PremiumNodeData>) => {
  // Normalize type: "premium_trigger" -> "trigger", etc.
  const rawType = typeof data.type === 'string' ? data.type : 'trigger';
  const normalizedType = (rawType.replace('premium_', '') || 'trigger') as NormalizedType;

  // Normalize status to avoid undefined className and to keep animations predictable.
  const rawStatus = data.status ?? 'idle';
  const normalizedStatus: NormalizedStatus =
    rawStatus === 'running' || rawStatus === 'success' || rawStatus === 'error' || rawStatus === 'idle'
      ? rawStatus
      : 'idle';

  const shouldAnimate = selected || normalizedStatus === 'running';

  // Icon mapping (uses normalizedType)
  const IconComponent =
    {
      trigger: Zap,
      action: MessageSquare,
      condition: GitBranch,
      ai: Brain,
    }[normalizedType] || Zap;

  // Color mapping
  const colorConfigMap = {
    trigger: {
      border: 'border-[#A855F7]',
      bg: 'from-purple-500/20',
      text: 'text-purple-400',
      glow: 'neon-glow-purple',
    },
    action: {
      border: 'border-[#00ffff]',
      bg: 'from-cyan-500/20',
      text: 'text-cyan-400',
      glow: 'neon-glow-cyan',
    },
    condition: {
      border: 'border-[#c8eb2d]',
      bg: 'from-green-500/20',
      text: 'text-green-400',
      glow: 'neon-glow-green',
    },
    ai: {
      border: 'border-[#3B82F6]',
      bg: 'from-blue-500/20',
      text: 'text-blue-400',
      glow: 'neon-glow-blue',
    },
  };

  const defaultColorConfig = {
    border: 'border-gray-500',
    bg: 'from-gray-500/20',
    text: 'text-text-secondary',
    glow: 'neon-glow-gray',
  };

  const colorConfig = colorConfigMap[normalizedType] || defaultColorConfig;

  // Status indicator colors
  const statusColor =
    {
      idle: 'bg-text-muted',
      running: 'bg-yellow-500',
      success: 'bg-green-500',
      error: 'bg-red-500',
    }[normalizedStatus] || 'bg-text-muted';

  const progressGradient = colorConfig.bg.replace('/20', '');

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-surface-hover !border-2 hover:!w-4 hover:!h-4 transition-all"
      />

      <motion.div
        className={`glass-card premium-node min-w-[200px] p-4 border-2 ${colorConfig.border} ${selected ? colorConfig.glow : ''}`}
        variants={nodeVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
        whileDrag="drag"
      >
        {/* Header with icon */}
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            className={`p-2 rounded-lg bg-gradient-to-br ${colorConfig.bg} to-transparent backdrop-blur-sm`}
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.3 }}
          >
            <IconComponent className={`w-5 h-5 ${colorConfig.text}`} />
          </motion.div>
          <div className="flex-1">
            <span className="font-semibold text-text-primary text-sm">{data.label}</span>
          </div>

          {/* Status indicator */}
          <motion.div
            className={`w-2 h-2 rounded-full ${statusColor}`}
            animate={{
              scale: normalizedStatus === 'running' ? [1, 1.3, 1] : 1,
              opacity: normalizedStatus === 'running' ? [1, 0.5, 1] : 1,
            }}
            transition={{
              duration: 1,
              repeat: normalizedStatus === 'running' ? Infinity : 0,
            }}
          />
        </div>

        {/* Description */}
        {data.description && (
          <motion.p
            className="text-xs text-text-secondary mt-2 leading-relaxed"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {data.description}
          </motion.p>
        )}

        {/* Progress bar */}
        <motion.div
          className={`mt-3 h-1 bg-gradient-to-r ${progressGradient} to-transparent rounded-full overflow-hidden`}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {shouldAnimate ? (
            // Infinite animation only when selected/running to avoid editor slowdowns.
            <motion.div
              className={`h-full bg-gradient-to-r ${progressGradient} ${colorConfig.text.replace('text-', 'from-')}`}
              animate={{ x: ['-100%', '100%'] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ) : (
            <div
              className={`h-full bg-gradient-to-r ${progressGradient} ${colorConfig.text.replace('text-', 'from-')}`}
            />
          )}
        </motion.div>

        {/* Sparkle effect on hover */}
        {selected && (
          <motion.div
            className="absolute top-2 right-2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <Sparkles className={`w-4 h-4 ${colorConfig.text}`} />
          </motion.div>
        )}
      </motion.div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-surface-hover !border-2 hover:!w-4 hover:!h-4 transition-all"
      />
    </>
  );
});

PremiumNode.displayName = 'PremiumNode';
