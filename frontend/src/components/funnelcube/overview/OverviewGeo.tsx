'use client';

import { useEffect, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { funnelcubeApi, type TopItem } from '@/lib/funnelcubeApi';

interface Props {
  projectId: string;
  days: number;
}

export function OverviewGeo({ projectId, days }: Props) {
  const [items, setItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    funnelcubeApi
      .getTopGeo(projectId, days)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [projectId, days]);

  const maxCount = items.length > 0 ? items[0].count : 1;

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-medium text-white">Top Locations</h3>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No geo data yet
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 10).map((item, i) => {
            const label = [item.country, item.city]
              .filter(Boolean)
              .join(' / ') || 'Unknown';

            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300 truncate">
                      {label}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full transition-all"
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
