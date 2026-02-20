'use client';

import { useEffect, useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { funnelcubeApi, type RetentionResult } from '@/lib/funnelcubeApi';

interface RetentionTableProps {
  projectId: string;
  days: number;
}

function getColor(pct: number | null): string {
  if (pct === null) return 'transparent';
  if (pct >= 80) return 'rgba(34, 197, 94, 0.6)';
  if (pct >= 60) return 'rgba(34, 197, 94, 0.4)';
  if (pct >= 40) return 'rgba(234, 179, 8, 0.4)';
  if (pct >= 20) return 'rgba(249, 115, 22, 0.4)';
  if (pct > 0) return 'rgba(239, 68, 68, 0.3)';
  return 'rgba(239, 68, 68, 0.15)';
}

export function RetentionTable({ projectId, days }: RetentionTableProps) {
  const [data, setData] = useState<RetentionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    funnelcubeApi
      .getRetention(projectId, { days, event: 'screen_view' })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId, days]);

  if (loading) {
    return (
      <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-text-primary">Retention</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.cohorts.length === 0) {
    return (
      <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-text-primary">Retention</h3>
        </div>
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">
          Not enough data for retention analysis
        </div>
      </div>
    );
  }

  const maxPeriods = data.data.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-text-primary">Retention Cohorts</h3>
        <span className="text-xs text-text-muted ml-auto">{data.total_cohorts} cohorts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-text-muted py-1.5 px-2 font-medium">Cohort</th>
              <th className="text-center text-text-muted py-1.5 px-2 font-medium">Users</th>
              {Array.from({ length: maxPeriods }, (_, i) => (
                <th key={i} className="text-center text-text-muted py-1.5 px-1 font-medium">
                  Day {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cohorts.map((cohort, rowIdx) => (
              <tr key={cohort}>
                <td className="text-text-secondary py-1.5 px-2 whitespace-nowrap">{cohort}</td>
                <td className="text-center text-text-primary py-1.5 px-2">{data.sizes[rowIdx]}</td>
                {data.data[rowIdx].map((pct, colIdx) => (
                  <td
                    key={colIdx}
                    className="text-center py-1.5 px-1 text-text-primary font-medium"
                    style={{ backgroundColor: getColor(pct) }}
                  >
                    {pct !== null ? `${pct}%` : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
