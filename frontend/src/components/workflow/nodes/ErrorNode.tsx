/**
 * Error Node - Red accent with warning icon
 * Used for error handling visualization
 */
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';

function ErrorNode({ data, selected }: NodeProps) {
  const label = data?.label || 'Error Handler';

  return (
    <div
      className={`
        relative px-4 py-3 min-w-[160px]
        bg-red-500/10 border-2 rounded-xl
        ${selected ? 'border-red-400 shadow-lg shadow-red-400/20' : 'border-red-500/40'}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-red-400 !border-red-600 !w-3 !h-3"
      />

      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-red-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <span className="text-sm font-medium text-red-200 truncate">
          {label as string}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-red-400 !border-red-600 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ErrorNode);
