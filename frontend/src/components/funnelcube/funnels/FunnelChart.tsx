'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Filter, Loader2, Plus, X } from 'lucide-react';
import { funnelcubeApi, type FunnelResult } from '@/lib/funnelcubeApi';

interface FunnelChartProps {
  projectId: string;
}

const STEP_COLORS = ['#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'];

export function FunnelChart({ projectId }: FunnelChartProps) {
  const [steps, setSteps] = useState<string[]>(['screen_view', 'signup', 'purchase']);
  const [newStep, setNewStep] = useState('');
  const [windowHours, setWindowHours] = useState(24);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runFunnel = async () => {
    if (steps.length < 2) return;
    setLoading(true);
    try {
      const data = await funnelcubeApi.getFunnel(projectId, steps, windowHours);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    if (newStep.trim() && !steps.includes(newStep.trim())) {
      setSteps([...steps, newStep.trim()]);
      setNewStep('');
    }
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-surface/60 backdrop-blur-sm border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-text-primary">Funnel Analysis</h3>
      </div>

      {/* Step builder */}
      <div className="space-y-2 mb-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-400 text-xs flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="text-sm text-text-primary flex-1">{step.replace(/_/g, ' ')}</span>
            {steps.length > 2 && (
              <button onClick={() => removeStep(i)} className="text-text-muted hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStep()}
            placeholder="Add event step..."
            className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={addStep}
            className="p-1.5 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg text-purple-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Window:</span>
          <select
            value={windowHours}
            onChange={(e) => setWindowHours(Number(e.target.value))}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-sm text-text-primary"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>7 days</option>
          </select>
        </div>
        <button
          onClick={runFunnel}
          disabled={loading || steps.length < 2}
          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-text-primary text-sm rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Calculate'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div>
              <span className="text-text-muted">Completion: </span>
              <span className="text-text-primary font-medium">{result.completion_rate}%</span>
            </div>
            {result.most_dropped_at && (
              <div>
                <span className="text-text-muted">Most drop-off: </span>
                <span className="text-red-400 font-medium">{result.most_dropped_at.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={result.steps}
              margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#888' }}
                tickFormatter={(v) => v.replace(/_/g, ' ')}
              />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'count') return [value, 'Users'];
                  if (name === 'conversion') return [value + '%', 'Conversion'];
                  return [value, name];
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {result.steps.map((_, i) => (
                  <Cell key={i} fill={STEP_COLORS[i % STEP_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Step table */}
          <div className="mt-3 space-y-1">
            {result.steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                    style={{ backgroundColor: STEP_COLORS[i % STEP_COLORS.length] + '30', color: STEP_COLORS[i % STEP_COLORS.length] }}>
                    {i + 1}
                  </span>
                  <span className="text-text-primary">{step.name.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-text-primary font-medium">{step.count}</span>
                  <span className="text-text-muted w-14 text-right">{step.conversion}%</span>
                  {step.drop_off !== null && (
                    <span className="text-red-400 text-xs w-16 text-right">-{step.drop_off}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
