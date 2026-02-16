"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LeadSourceChartProps {
  data: Array<{ source: string; count: number }>;
}

export default function LeadSourceChart({ data }: LeadSourceChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 10);

  if (sorted.length === 0) {
    return (
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-1">Leads por Origem</h3>
        <p className="text-xs text-gray-500 mb-4">Distribuicao por canal de origem</p>
        <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
          Sem dados para exibir
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Leads por Origem</h3>
          <p className="text-xs text-gray-500">Distribuicao por canal de origem</p>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#374151" />
            <XAxis
              dataKey="source"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={60}
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
            />
            <Bar
              dataKey="count"
              name="Leads"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
