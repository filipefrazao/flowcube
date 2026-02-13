"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { financialApi, saleApi, type FinancialOverview, type Sale } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function FinancialPage() {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, salesRes] = await Promise.all([
        financialApi.overview().catch(() => ({ data: null })),
        saleApi.list({ stage: "won" }).catch(() => ({ data: { results: [] } })),
      ]);

      if (overviewRes.data) {
        setOverview(overviewRes.data);
      } else {
        // Fallback: calculate from sales
        const allSales = salesRes.data.results || salesRes.data || [];
        const revenue = allSales.reduce((sum: number, s: Sale) => sum + parseFloat(s.total_value || "0"), 0);
        setOverview({
          total_revenue: revenue,
          total_expenses: 0,
          net: revenue,
          monthly_breakdown: [],
        });
      }

      const salesData = salesRes.data.results || salesRes.data || [];
      setRecentSales(salesData.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (v: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Receita Total",
      value: overview?.total_revenue || 0,
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-500/10 border-green-500/20",
    },
    {
      label: "Despesas",
      value: overview?.total_expenses || 0,
      icon: TrendingDown,
      color: "text-red-400",
      bgColor: "bg-red-500/10 border-red-500/20",
    },
    {
      label: "Lucro Liquido",
      value: overview?.net || 0,
      icon: DollarSign,
      color: (overview?.net || 0) >= 0 ? "text-green-400" : "text-red-400",
      bgColor: (overview?.net || 0) >= 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20",
    },
  ];

  const chartData = overview?.monthly_breakdown?.map((m) => ({
    name: m.month,
    Receita: m.revenue,
    Despesas: m.expenses,
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Financeiro</h1>
        <p className="text-sm text-gray-400">Visao geral financeira</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={cn("border rounded-xl p-5", kpi.bgColor)}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{kpi.label}</span>
                <Icon className={cn("w-5 h-5", kpi.color)} />
              </div>
              <p className={cn("text-2xl font-bold", kpi.color)}>
                {formatValue(kpi.value)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Receita vs Despesas (Mensal)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#F3F4F6" }}
                  formatter={(value: number) => [formatValue(value), ""]}
                />
                <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                <Bar dataKey="Receita" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Vendas Recentes (Ganhas)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="px-4 py-3 text-gray-400 font-medium">Lead</th>
                <th className="px-4 py-3 text-gray-400 font-medium">Valor</th>
                <th className="px-4 py-3 text-gray-400 font-medium">Data</th>
                <th className="px-4 py-3 text-gray-400 font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-100 font-medium">{sale.lead_name || "-"}</td>
                  <td className="px-4 py-3 text-green-400 font-semibold">{formatValue(parseFloat(sale.total_value || "0"))}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {sale.closed_at ? new Date(sale.closed_at).toLocaleDateString("pt-BR") : new Date(sale.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{sale.notes || "-"}</td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">Nenhuma venda registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
