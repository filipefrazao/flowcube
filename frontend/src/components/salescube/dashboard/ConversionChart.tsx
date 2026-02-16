"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ConversionChartProps {
  totalLeads: number;
  totalSales: number;
  conversionRate: number;
}

export default function ConversionChart({
  totalLeads,
  totalSales,
  conversionRate,
}: ConversionChartProps) {
  const converted = totalSales;
  const notConverted = Math.max(totalLeads - converted, 0);

  const chartData = [
    { name: "Nao Convertidos", value: notConverted },
    { name: "Convertidos", value: converted },
  ];

  const COLORS = ["#6366f1", "#8b5cf6"];

  if (totalLeads === 0) {
    return (
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-1">Percentual de Conversao</h3>
        <p className="text-xs text-gray-500 mb-4">Leads Contactados vs Leads Convertidos</p>
        <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
          Sem Dados
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-1">Percentual de Conversao</h3>
      <p className="text-xs text-gray-500 mb-2">Leads Contactados vs Leads Convertidos</p>

      <div className="relative h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e5e7eb",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{conversionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-gray-500">Conversao</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 pt-3 border-t border-gray-700/50 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs text-gray-400">
            Total: {totalLeads}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs text-gray-400">
            Convertidos: {converted}
          </span>
        </div>
      </div>
    </div>
  );
}
