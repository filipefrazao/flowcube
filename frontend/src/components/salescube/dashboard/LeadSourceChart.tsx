"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LeadSourceChartProps {
  data: Array<{ source: string; count: number }>;
}

export default function LeadSourceChart({ data }: LeadSourceChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 10);

  if (sorted.length === 0) {
    return (
      <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Leads por Origem</h3>
        <p className="text-xs text-text-muted mb-4">Distribuicao por canal de origem</p>
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
          <h3 className="text-sm font-semibold text-text-primary">Leads por Origem</h3>
          <p className="text-xs text-text-muted">Distribuicao por canal de origem</p>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#21262d" />
            <XAxis
              dataKey="source"
              tick={{ fontSize: 10, fill: "#484f58" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={60}
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
            />
            <Bar
              dataKey="count"
              name="Leads"
              fill="#F59E0B"
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
