"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LeadsPerDayChartProps {
  data: Array<{ date: string; count: number }>;
}

export default function LeadsPerDayChart({ data }: LeadsPerDayChartProps) {
  const formatted = data.map((item) => {
    const [, month, day] = item.date.split("-");
    return { ...item, label: `${day}/${month}` };
  });

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const maxDay = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0;
  const minDay = data.length > 0 ? Math.min(...data.map((d) => d.count)) : 0;

  if (data.length === 0) {
    return (
      <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Leads Diarios</h3>
        <p className="text-xs text-text-muted mb-4">Visao geral dos leads diarios</p>
        <div className="flex items-center justify-center h-[200px] text-text-muted text-sm">
          Sem dados para o periodo selecionado
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Leads Diarios</h3>
          <p className="text-xs text-text-muted">Visao geral dos leads diarios</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs text-text-secondary">Leads Contactados</span>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="leadAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#21262d" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#484f58" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#484f58" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#161b22",
                border: "1px solid #21262d",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e5e7eb",
              }}
              labelStyle={{ color: "#484f58" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Leads"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="url(#leadAreaGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
        <div className="text-center">
          <p className="text-xl font-bold text-text-primary">{total}</p>
          <p className="text-[11px] text-text-muted">Total de Leads</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-text-primary">{maxDay}</p>
          <p className="text-[11px] text-text-muted">Maximo em um dia</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-text-primary">{minDay}</p>
          <p className="text-[11px] text-text-muted">Minimo em um dia</p>
        </div>
      </div>
    </div>
  );
}
