"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TopAssigneesChartProps {
  data: Array<{ name: string; count: number; total_value: number }>;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TopAssigneesChart({ data }: TopAssigneesChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 8);

  if (sorted.length === 0) {
    return (
      <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Top Responsaveis</h3>
        <p className="text-xs text-text-muted mb-4">Leads por responsavel</p>
        <div className="flex items-center justify-center h-[200px] text-text-muted text-sm">
          Sem dados para exibir
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Top Responsaveis</h3>
          <p className="text-xs text-text-muted">Leads por responsavel</p>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#21262d" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#484f58" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#484f58" }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#161b22",
                border: "1px solid #21262d",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e5e7eb",
              }}
              formatter={(value: number, _name: string, entry: any) => {
                const d = entry.payload;
                return [`${value} leads (${formatBRL(d.total_value)})`, "Quantidade"];
              }}
            />
            <Bar dataKey="count" fill="#F59E0B" radius={[0, 6, 6, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
