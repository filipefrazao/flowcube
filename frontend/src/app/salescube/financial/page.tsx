"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, ArrowUpRight } from "lucide-react";
import { financialApi, saleKpiApi, type FinancialOverview, type SaleKPIs } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

function formatValue(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function FinancialPage() {
  const [overview, setOverview] = useState<any>(null);
  const [kpis, setKpis] = useState<SaleKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, kpisRes] = await Promise.all([
        financialApi.overview({ year }),
        saleKpiApi.getKpis(),
      ]);
      setOverview(overviewRes.data);
      setKpis(kpisRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Monthly chart data from breakdown object
  const monthlyData = Object.entries(overview.monthly_breakdown || {})
    .map(([key, val]: [string, any]) => ({
      name: key,
      Receita: val.revenue || 0,
      Despesas: val.expense || 0,
      Reembolsos: val.refund || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Pipeline data
  const pipeline = overview.sales_pipeline;
  const pipelineData = pipeline ? [
    { name: "Negociacao", value: pipeline.negotiation?.total || 0, count: pipeline.negotiation?.count || 0, color: "#f59e0b" },
    { name: "Proposta", value: pipeline.proposal?.total || 0, count: pipeline.proposal?.count || 0, color: "#8b5cf6" },
    { name: "Ganhas", value: pipeline.won?.total || 0, count: pipeline.won?.count || 0, color: "#22c55e" },
    { name: "Perdidas", value: pipeline.lost?.total || 0, count: pipeline.lost?.count || 0, color: "#ef4444" },
  ] : [];

  const kpiCards = [
    { label: "Receita Total", value: overview.total_revenue, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    { label: "Perdas", value: overview.total_refunds, icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    { label: "Receita Liquida", value: overview.net, icon: DollarSign, color: overview.net >= 0 ? "text-green-400" : "text-red-400", bg: overview.net >= 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20" },
    { label: "Ticket Medio", value: kpis?.summary?.average_ticket || 0, icon: ShoppingCart, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-sm text-gray-400">Visao geral financeira baseada em vendas</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={cn("border rounded-xl p-5", kpi.bg)}>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Pipeline */}
        {pipelineData.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Pipeline de Vendas</h2>
            <div className="space-y-3">
              {pipelineData.map((item) => {
                const totalPipeline = pipelineData.reduce((s, i) => s + i.value, 0) || 1;
                const pct = ((item.value / totalPipeline) * 100).toFixed(1);
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-300">{item.name}</span>
                        <span className="text-xs text-gray-500">({item.count})</span>
                      </div>
                      <span className="text-sm font-medium text-gray-200">{formatValue(item.value)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Conversion Rates */}
        {kpis && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Taxas de Conversao</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-400">{kpis.summary.conversion_rate}%</p>
                <p className="text-sm text-gray-400 mt-1">Taxa de Conversao</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-400">{kpis.summary.loss_rate}%</p>
                <p className="text-sm text-gray-400 mt-1">Taxa de Perda</p>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-indigo-400">{kpis.summary.total_sales}</p>
                <p className="text-sm text-gray-400 mt-1">Total de Vendas</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-400">{formatValue(kpis.summary.total_amount)}</p>
                <p className="text-sm text-gray-400 mt-1">Valor Total</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Receita Mensal ({year})</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#F3F4F6" }}
                  formatter={(value: number) => [formatValue(value), ""]}
                />
                <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                <Bar dataKey="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reembolsos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Products & Top Sellers */}
      {kpis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Top Produtos</h2>
            </div>
            <div className="divide-y divide-gray-700/50">
              {kpis.top_products.slice(0, 8).map((p, i) => (
                <div key={p.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                    <span className="text-sm text-gray-200 truncate max-w-[200px]">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-xs text-gray-500">{p.quantity} un</span>
                    <span className="text-sm font-medium text-green-400">{formatValue(p.revenue)}</span>
                  </div>
                </div>
              ))}
              {kpis.top_products.length === 0 && (
                <div className="px-5 py-8 text-center text-gray-500 text-sm">Nenhum produto vendido</div>
              )}
            </div>
          </div>

          {/* Top Sellers */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Top Vendedores</h2>
            </div>
            <div className="divide-y divide-gray-700/50">
              {kpis.top_sellers.slice(0, 8).map((s, i) => (
                <div key={s.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-200">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-xs text-gray-500">{s.count} vendas</span>
                    <span className="text-sm font-medium text-green-400">{formatValue(s.total_amount)}</span>
                  </div>
                </div>
              ))}
              {kpis.top_sellers.length === 0 && (
                <div className="px-5 py-8 text-center text-gray-500 text-sm">Nenhum vendedor registrado</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
