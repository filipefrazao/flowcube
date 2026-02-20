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

  const COLORS = ["#F59E0B", "#D97706"];

  if (totalLeads === 0) {
    return (
      <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Percentual de Conversao</h3>
        <p className="text-xs text-text-muted mb-4">Leads Contactados vs Leads Convertidos</p>
        <div className="flex items-center justify-center h-[200px] text-text-muted text-sm">
          Sem Dados
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-1">Percentual de Conversao</h3>
      <p className="text-xs text-text-muted mb-2">Leads Contactados vs Leads Convertidos</p>

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
                backgroundColor: "#161b22",
                border: "1px solid #21262d",
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
            <p className="text-lg font-bold text-text-primary">{conversionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-text-muted">Conversao</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 pt-3 border-t border-border/50 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs text-text-secondary">
            Total: {totalLeads}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/70" />
          <span className="text-xs text-text-secondary">
            Convertidos: {converted}
          </span>
        </div>
      </div>
    </div>
  );
}
