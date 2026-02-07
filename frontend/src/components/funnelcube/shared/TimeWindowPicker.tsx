'use client';

import { cn } from '@/lib/utils';

interface TimeWindowPickerProps {
  value: number;
  onChange: (days: number) => void;
  className?: string;
}

const presets = [
  { label: '24h', days: 1 },
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export function TimeWindowPicker({ value, onChange, className }: TimeWindowPickerProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-surface rounded-lg p-1', className)}>
      {presets.map((p) => (
        <button
          key={p.days}
          onClick={() => onChange(p.days)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            value === p.days
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

interface IntervalPickerProps {
  value: string;
  onChange: (interval: string) => void;
  className?: string;
}

const intervals = [
  { label: 'Hour', value: 'hour' },
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

export function IntervalPicker({ value, onChange, className }: IntervalPickerProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-surface rounded-lg p-1', className)}>
      {intervals.map((i) => (
        <button
          key={i.value}
          onClick={() => onChange(i.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            value === i.value
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          )}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
