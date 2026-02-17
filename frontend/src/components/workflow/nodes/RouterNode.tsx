/**
 * Router Node - Diamond shape with multiple output handles
 * Make-style router that evaluates conditions per route
 */
'use client';

import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

function RouterNode({ data, selected }: NodeProps) {
  const label = data?.label || 'Router';
  const routes = (data?.config as any)?.routes || [];

  // Generate handles for each route + fallback
  const handles = useMemo(() => {
    const result = routes.map((route: any, i: number) => ({
      id: route.handle || `route_${i + 1}`,
      label: route.label || `Route ${i + 1}`,
    }));
    result.push({ id: 'fallback', label: 'Fallback' });
    return result;
  }, [routes]);

  const handleSpacing = 100 / (handles.length + 1);

  return (
    <div
      className={`
        relative px-6 py-4 min-w-[140px] min-h-[80px]
        bg-purple-500/10 border-2
        ${selected ? 'border-purple-400 shadow-lg shadow-purple-400/20' : 'border-purple-500/40'}
        transition-all duration-200
      `}
      style={{
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-400 !border-purple-600 !w-3 !h-3"
      />

      <div className="flex flex-col items-center justify-center text-center">
        <GitBranch className="w-5 h-5 text-purple-400 mb-1" />
        <span className="text-xs font-medium text-purple-200 truncate max-w-[100px]">
          {label as string}
        </span>
      </div>

      {/* Multiple source handles */}
      {handles.map((handle: { id: string; label: string }, index: number) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Right}
          id={handle.id}
          className="!bg-purple-400 !border-purple-600 !w-2.5 !h-2.5"
          style={{ top: `${handleSpacing * (index + 1)}%` }}
          title={handle.label}
        />
      ))}
    </div>
  );
}

export default memo(RouterNode);
