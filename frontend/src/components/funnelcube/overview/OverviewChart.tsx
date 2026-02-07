'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { funnelcubeApi, type ChartSeries } from '@/lib/funnelcubeApi';
import { IntervalPicker } from '../shared/TimeWindowPicker';

interface OverviewChartProps {
  projectId: string;
  days: number;
}

const COLORS = ['#a855f7', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

export function OverviewChart({ projectId, days }: OverviewChartProps) {
  const [series, setSeries] = useState<ChartSeries[]>([]);
  const [interval, setInterval] = useState('day');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    funnelcubeApi
      .getChart(projectId, {
        events: 'screen_view,signup,purchase',
        interval,
        days,
      })
      .then((d) => setSeries(d.series))
      .catch(() => setSeries([]))
      .finally(() => setLoading(false));
  }, [projectId, days, interval]);

  // Merge all series into unified data points
  const merged = mergeSeriesData(series);

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Events Over Time</h3>
        <IntervalPicker value={interval} onChange={setInterval} />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      ) : merged.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={merged} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.name} id={`grad-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 11, fill: '#888' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#888' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#888' }}
            />
            {series.map((s, i) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={COLORS[i % COLORS.length]}
                fill={`url(#grad-${s.name})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function mergeSeriesData(series: ChartSeries[]) {
  const map: Record<string, Record<string, number>> = {};

  for (const s of series) {
    for (const pt of s.data) {
      const ts = pt.timestamp.split('T')[0]; // normalize to date
      if (!map[ts]) map[ts] = { timestamp: ts } as any;
      (map[ts] as any)[s.name] = pt.value;
    }
  }

  return Object.values(map).sort((a, b) =>
    (a as any).timestamp.localeCompare((b as any).timestamp)
  );
}
