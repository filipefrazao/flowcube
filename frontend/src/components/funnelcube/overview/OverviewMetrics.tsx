'use client';

import { motion } from 'framer-motion';
import { Users, Eye, MousePointerClick, Activity, Timer, DollarSign, ArrowUpDown } from 'lucide-react';
import type { FunnelOverview } from '@/lib/funnelcubeApi';

interface OverviewMetricsProps {
  data: FunnelOverview;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) return seconds.toFixed(0) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function fmtCurrency(value: number): string {
  if (value === 0) return 'R$ 0';
  return 'R$ ' + (value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

const metrics = [
  { key: 'visitors', label: 'Visitors', icon: Users, color: 'from-purple-500 to-indigo-500', format: fmt },
  { key: 'sessions', label: 'Sessions', icon: Activity, color: 'from-cyan-500 to-blue-500', format: fmt },
  { key: 'pageviews', label: 'Pageviews', icon: Eye, color: 'from-green-500 to-emerald-500', format: fmt },
  { key: 'events', label: 'Events', icon: MousePointerClick, color: 'from-orange-500 to-amber-500', format: fmt },
  { key: 'bounce_rate', label: 'Bounce Rate', icon: ArrowUpDown, color: 'from-red-500 to-pink-500', format: (v: number) => (v * 100).toFixed(1) + '%' },
  { key: 'avg_duration', label: 'Avg Duration', icon: Timer, color: 'from-violet-500 to-purple-500', format: fmtDuration },
  { key: 'revenue', label: 'Revenue', icon: DollarSign, color: 'from-emerald-500 to-teal-500', format: fmtCurrency },
];

export function OverviewMetrics({ data }: OverviewMetricsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {metrics.map((m, i) => {
        const Icon = m.icon;
        const value = (data as any)[m.key] ?? 0;
        return (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="text-lg font-bold text-white">{m.format(value)}</div>
            <div className="text-xs text-gray-500">{m.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
