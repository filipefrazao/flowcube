'use client';

import { useEffect, useState } from 'react';
import { GitBranch, Loader2, ArrowRight } from 'lucide-react';
import { funnelcubeApi, type FlowResult, type FlowLink, type FlowNode } from '@/lib/funnelcubeApi';

interface Props {
  projectId: string;
  days: number;
}

export function FlowChart({ projectId, days }: Props) {
  const [data, setData] = useState<FlowResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    funnelcubeApi
      .getFlow(projectId, { days, max_steps: 5, min_frequency: 2 })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId, days]);

  if (loading) {
    return (
      <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-text-primary">User Flow</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.links.length === 0) {
    return (
      <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-text-primary">User Flow</h3>
        </div>
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">
          Not enough data for flow analysis
        </div>
      </div>
    );
  }

  // Build node label lookup
  const nodeMap: Record<string, FlowNode> = {};
  for (const node of data.nodes) {
    nodeMap[node.id] = node;
  }

  // Sort links by value descending
  const sortedLinks = [...data.links].sort((a, b) => b.value - a.value);
  const maxLinkValue = sortedLinks.length > 0 ? sortedLinks[0].value : 1;

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-text-primary">User Flow</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>{data.nodes.length} pages</span>
          <span>{data.links.length} transitions</span>
          <span>{data.total_transitions.toLocaleString()} total</span>
        </div>
      </div>

      {/* Top nodes summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        {data.nodes
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
          .map((node) => (
            <span
              key={node.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary"
            >
              {node.label}
              <span className="text-primary">{node.value}</span>
            </span>
          ))}
      </div>

      {/* Transition list */}
      <div className="space-y-1.5">
        {sortedLinks.slice(0, 20).map((link, i) => {
          const sourceLabel = nodeMap[link.source]?.label || link.source;
          const targetLabel = nodeMap[link.target]?.label || link.target;
          const pct = data.total_transitions > 0
            ? ((link.value / data.total_transitions) * 100).toFixed(1)
            : '0';

          return (
            <div
              key={i}
              className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-hover/30 transition-colors"
            >
              {/* Rank */}
              <span className="w-5 text-xs text-text-muted shrink-0 text-right">
                {i + 1}
              </span>

              {/* Flow path */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm text-text-primary truncate max-w-[200px]">
                  {sourceLabel}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span className="text-sm text-text-primary truncate max-w-[200px]">
                  {targetLabel}
                </span>
              </div>

              {/* Value and bar */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-text-muted w-10 text-right">
                  {pct}%
                </span>
                <span className="text-sm text-text-primary font-medium w-12 text-right">
                  {link.value}
                </span>
                <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all"
                    style={{
                      width: `${(link.value / maxLinkValue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedLinks.length > 20 && (
        <div className="mt-3 text-center text-xs text-text-muted">
          Showing top 20 of {sortedLinks.length} transitions
        </div>
      )}
    </div>
  );
}
