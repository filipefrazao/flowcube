'use client';

import { useEffect, useState } from 'react';
import { Target, Loader2, ChevronDown } from 'lucide-react';
import { funnelcubeApi, type ConversionResult } from '@/lib/funnelcubeApi';

interface Props {
  projectId: string;
  days: number;
}

const DEFAULT_EVENTS = [
  'purchase',
  'signup',
  'add_to_cart',
  'checkout_start',
  'form_submit',
  'subscribe',
];

const BREAKDOWN_OPTIONS = [
  { value: '', label: 'No breakdown' },
  { value: 'source', label: 'Source' },
  { value: 'country', label: 'Country' },
  { value: 'device', label: 'Device' },
  { value: 'browser', label: 'Browser' },
  { value: 'os', label: 'OS' },
];

export function ConversionChart({ projectId, days }: Props) {
  const [event, setEvent] = useState('purchase');
  const [customEvent, setCustomEvent] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [breakdown, setBreakdown] = useState('');
  const [data, setData] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConversion();
  }, [projectId, days, event, breakdown]);

  async function loadConversion() {
    setLoading(true);
    try {
      const result = await funnelcubeApi.getConversion(projectId, event, {
        days,
        breakdown: breakdown || undefined,
      });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const handleEventChange = (value: string) => {
    if (value === '__custom__') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setEvent(value);
    }
  };

  const applyCustomEvent = () => {
    if (customEvent.trim()) {
      setEvent(customEvent.trim());
      setShowCustomInput(false);
    }
  };

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-medium text-text-primary">Conversion Analysis</h3>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Target event:</span>
          <div className="relative">
            <select
              value={showCustomInput ? '__custom__' : event}
              onChange={(e) => handleEventChange(e.target.value)}
              className="appearance-none bg-surface border border-border rounded-lg px-3 py-1.5 pr-7 text-sm text-text-primary focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {DEFAULT_EVENTS.map((e) => (
                <option key={e} value={e}>
                  {e.replace(/_/g, ' ')}
                </option>
              ))}
              {!DEFAULT_EVENTS.includes(event) && !showCustomInput && (
                <option value={event}>{event.replace(/_/g, ' ')}</option>
              )}
              <option value="__custom__">Custom...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {showCustomInput && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customEvent}
              onChange={(e) => setCustomEvent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCustomEvent()}
              placeholder="Event name..."
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <button
              onClick={applyCustomEvent}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-text-primary text-sm rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Breakdown:</span>
          <div className="relative">
            <select
              value={breakdown}
              onChange={(e) => setBreakdown(e.target.value)}
              className="appearance-none bg-surface border border-border rounded-lg px-3 py-1.5 pr-7 text-sm text-text-primary focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {BREAKDOWN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      ) : !data ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">
          No conversion data available
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Conversion Rate */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <div className="text-xs text-text-muted mb-1">Conversion Rate</div>
              <div className="text-3xl font-bold text-amber-400">
                {data.conversion_rate.toFixed(2)}%
              </div>
            </div>

            {/* Conversions */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <div className="text-xs text-text-muted mb-1">Conversions</div>
              <div className="text-3xl font-bold text-text-primary">
                {data.conversions.toLocaleString()}
              </div>
            </div>

            {/* Total Visitors */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <div className="text-xs text-text-muted mb-1">Total Visitors</div>
              <div className="text-3xl font-bold text-text-primary">
                {data.total_visitors.toLocaleString()}
              </div>
            </div>

            {/* Confidence Interval */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <div className="text-xs text-text-muted mb-1">95% Confidence</div>
              <div className="text-lg font-bold text-text-primary">
                {data.confidence_interval.lower.toFixed(2)}% &ndash;{' '}
                {data.confidence_interval.upper.toFixed(2)}%
              </div>
              <div className="mt-2 h-1.5 bg-surface-hover rounded-full overflow-hidden relative">
                <div
                  className="absolute h-full bg-amber-500/40 rounded-full"
                  style={{
                    left: `${Math.max(0, data.confidence_interval.lower)}%`,
                    width: `${Math.min(100, data.confidence_interval.upper - data.confidence_interval.lower)}%`,
                  }}
                />
                <div
                  className="absolute h-full w-0.5 bg-amber-400"
                  style={{
                    left: `${Math.min(100, data.conversion_rate)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Conversion visual bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">
                {data.conversions} of {data.total_visitors} visitors converted
              </span>
              <span className="text-xs text-amber-400 font-medium">
                {data.conversion_rate.toFixed(2)}%
              </span>
            </div>
            <div className="h-3 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, data.conversion_rate)}%` }}
              />
            </div>
          </div>

          {/* Breakdown table */}
          {data.breakdown && Array.isArray(data.breakdown) && data.breakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                Breakdown by {breakdown}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-text-muted py-2 px-3 font-medium text-xs">
                        {breakdown.charAt(0).toUpperCase() + breakdown.slice(1)}
                      </th>
                      <th className="text-right text-text-muted py-2 px-3 font-medium text-xs">
                        Conversions
                      </th>
                      <th className="text-right text-text-muted py-2 px-3 font-medium text-xs">
                        Visitors
                      </th>
                      <th className="text-right text-text-muted py-2 px-3 font-medium text-xs">
                        Rate
                      </th>
                      <th className="w-32 py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.breakdown as any[]).map((row: any, i: number) => {
                      const rate =
                        row.total_visitors > 0
                          ? (row.conversions / row.total_visitors) * 100
                          : 0;
                      return (
                        <tr
                          key={i}
                          className="border-b border-border/50 last:border-0 hover:bg-surface-hover/30 transition-colors"
                        >
                          <td className="text-text-primary py-2 px-3">
                            {row.value || row.name || 'Unknown'}
                          </td>
                          <td className="text-right text-text-primary py-2 px-3 font-medium">
                            {(row.conversions ?? 0).toLocaleString()}
                          </td>
                          <td className="text-right text-text-secondary py-2 px-3">
                            {(row.total_visitors ?? 0).toLocaleString()}
                          </td>
                          <td className="text-right text-amber-400 py-2 px-3 font-medium">
                            {rate.toFixed(2)}%
                          </td>
                          <td className="py-2 px-3">
                            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, rate)}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
