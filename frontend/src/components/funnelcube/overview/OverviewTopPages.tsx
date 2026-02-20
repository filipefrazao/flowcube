'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { funnelcubeApi, type TopItem } from '@/lib/funnelcubeApi';

interface Props {
  projectId: string;
  days: number;
}

export function OverviewTopPages({ projectId, days }: Props) {
  const [items, setItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    funnelcubeApi
      .getTopPages(projectId, days)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [projectId, days]);

  const maxCount = items.length > 0 ? items[0].count : 1;

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-green-400" />
        <h3 className="text-sm font-medium text-text-primary">Top Pages</h3>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">
          No page data yet
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-primary truncate">{item.path}</span>
                  <span className="text-xs text-text-muted ml-2 shrink-0">{item.count}</span>
                </div>
                <div className="h-1 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
