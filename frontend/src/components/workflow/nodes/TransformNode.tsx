/**
 * Transform Node - Rounded rectangle, blue accent
 * Data processing: JSON Transform, Iterator, Aggregator, Text Parser, Filter, Sort
 */
'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Shuffle, Repeat, Layers, FileText, Filter, ArrowUpDown } from 'lucide-react';

const TRANSFORM_ICONS: Record<string, any> = {
  json_transform: Shuffle,
  iterator: Repeat,
  aggregator: Layers,
  text_parser: FileText,
  filter: Filter,
  sort: ArrowUpDown,
};

function TransformNode({ data, selected }: NodeProps) {
  const label = data?.label || 'Transform';
  const nodeType = data?.type || 'json_transform';
  const Icon = TRANSFORM_ICONS[nodeType as string] || Shuffle;

  return (
    <div
      className={`
        relative px-4 py-3 min-w-[160px]
        bg-sky-500/10 border-2 rounded-2xl
        ${selected ? 'border-sky-400 shadow-lg shadow-sky-400/20' : 'border-sky-500/40'}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-sky-400 !border-sky-600 !w-3 !h-3"
      />

      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-sky-500/20 rounded-lg">
          <Icon className="w-4 h-4 text-sky-400" />
        </div>
        <span className="text-sm font-medium text-sky-200 truncate">
          {label as string}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-sky-400 !border-sky-600 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(TransformNode);
