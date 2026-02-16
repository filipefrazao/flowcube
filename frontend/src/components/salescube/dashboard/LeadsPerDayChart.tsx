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
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-1">Leads Diarios</h3>
        <p className="text-xs text-gray-500 mb-4">Visao geral dos leads diarios</p>
        <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
          Sem dados para o periodo selecionado
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Leads Diarios</h3>
          <p className="text-xs text-gray-500">Visao geral dos leads diarios</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs text-gray-400">Leads Contactados</span>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="leadAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#374151" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e5e7eb",
              }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Leads"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#leadAreaGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700/50">
        <div className="text-center">
          <p className="text-xl font-bold text-white">{total}</p>
          <p className="text-[11px] text-gray-500">Total de Leads</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white">{maxDay}</p>
          <p className="text-[11px] text-gray-500">Maximo em um dia</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white">{minDay}</p>
          <p className="text-[11px] text-gray-500">Minimo em um dia</p>
        </div>
      </div>
    </div>
  );
}
