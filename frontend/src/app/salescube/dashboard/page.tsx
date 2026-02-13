"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, DollarSign, TrendingUp, ShoppingCart, Calendar, BarChart3, Target, Award, Package } from "lucide-react";
import { leadApi, pipelineApi, saleKpiApi, type LeadStats, type SaleKPIs } from "@/lib/salesApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RePieChart, Pie, Cell, Legend
} from "recharts";
import { cn } from "@/lib/utils";

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatNumber(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("pt-BR");
}

const COLORS = ["#818cf8", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#22d3ee", "#fb923c", "#e879f9"];
const STAGE_COLORS: Record<string, string> = {
  won: "#22c55e",
  lost: "#ef4444",
  negotiation: "#f59e0b",
  proposal: "#8b5cf6",
};
const STAGE_LABELS: Record<string, string> = {
  won: "Ganhas",
  lost: "Perdidas",
  negotiation: "Negociacao",
  proposal: "Proposta",
};

export default function SalesCubeDashboard() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [kpis, setKpis] = useState<SaleKPIs | null>(null);
  const [pipelines, setPipelines] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("90");

  useEffect(() => {
    pipelineApi.list().then((res) => {
      const data = res.data.results || res.data;
      setPipelines(data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    fetchData();
  }, [days, selectedPipeline]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { days };
      if (selectedPipeline) params.pipeline = selectedPipeline;
      const [statsRes, kpisRes] = await Promise.all([
        leadApi.getStats(params),
        saleKpiApi.getKpis(),
      ]);
      setStats(statsRes.data);
      setKpis(kpisRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Group stages by pipeline for cleaner display
  const stagesByPipeline = useMemo(() => {
    if (!stats) return {};
    const grouped: Record<string, typeof stats.leads_per_stage> = {};
    for (const s of stats.leads_per_stage) {
      const key = s.pipeline || "Other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    }
    return grouped;
  }, [stats]);

  // Aggregate stages across pipelines for chart
  const aggregatedStages = useMemo(() => {
    if (!stats) return [];
    const map = new Map<string, { name: string; count: number; color: string }>();
    for (const s of stats.leads_per_stage) {
      const existing = map.get(s.name);
      if (existing) {
        existing.count += s.count;
      } else {
        map.set(s.name, { name: s.name, count: s.count, color: s.color });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [stats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Leads", value: formatNumber(stats.total_leads), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Vendas", value: formatNumber(kpis?.summary?.total_sales || stats.total_sales), icon: ShoppingCart, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    { label: "Receita Total", value: formatCurrency(kpis?.summary?.total_amount || stats.total_revenue), icon: DollarSign, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { label: "Taxa Conversao", value: `${kpis?.summary?.conversion_rate || stats.conversion_rate}%`, icon: TrendingUp, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    { label: "Ticket Medio", value: formatCurrency(kpis?.summary?.average_ticket || stats.avg_deal_size), icon: Target, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Pipelines", value: pipelines.length.toString(), icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  ];

  // Sales pipeline data for donut chart
  const salesPipelineData = kpis
    ? Object.entries(kpis.by_stage)
        .filter(([_, v]) => v.count > 0)
        .map(([key, v]) => ({
          name: STAGE_LABELS[key] || v.label,
          value: v.count,
          total: v.total_amount,
          color: STAGE_COLORS[key] || COLORS[0],
        }))
    : stats.sales_pipeline.map((s, i) => ({
        name: STAGE_LABELS[s.stage] || s.stage,
        value: s.count,
        total: s.total,
        color: STAGE_COLORS[s.stage] || COLORS[i % COLORS.length],
      }));

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">Visao geral do CRM</p>
        </div>
        <div className="flex items-center gap-3">
          {pipelines.length > 0 && (
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos Pipelines</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="365">1 ano</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className={cn("border rounded-xl p-4", kpi.bg)}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={cn("w-4 h-4", kpi.color)} />
            </div>
            <span className="text-xl font-bold text-white">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads per Stage (aggregated) */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Leads por Estagio</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregatedStages.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#f3f4f6" }}
                  formatter={(value: number) => [formatNumber(value), "Leads"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#818cf8">
                  {aggregatedStages.slice(0, 10).map((entry, i) => (
                    <Cell key={i} fill={entry.color !== "#ccc" ? entry.color : COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Pipeline */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Pipeline de Vendas</h3>
          <div className="h-72 flex items-center justify-center">
            {salesPipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={salesPipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {salesPipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} vendas (${formatCurrency(props.payload.total)})`,
                      name
                    ]}
                  />
                  <Legend
                    formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>}
                  />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-sm">Sem dados de vendas</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Conversion Rates + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Rates */}
        {kpis && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">Taxas de Conversao (Vendas)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-400">{kpis.summary.conversion_rate}%</p>
                <p className="text-sm text-gray-400 mt-1">Conversao</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-400">{kpis.summary.loss_rate}%</p>
                <p className="text-sm text-gray-400 mt-1">Perda</p>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-indigo-400">{formatNumber(kpis.summary.total_sales)}</p>
                <p className="text-sm text-gray-400 mt-1">Total Vendas</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-400">{formatCurrency(kpis.summary.average_ticket)}</p>
                <p className="text-sm text-gray-400 mt-1">Ticket Medio</p>
              </div>
            </div>
          </div>
        )}

        {/* Leads per Source */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Leads por Origem</h3>
          <div className="h-64">
            {stats.leads_per_source.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.leads_per_source} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="source" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                    formatter={(value: number) => [formatNumber(value), "Leads"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.leads_per_source.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sem dados</div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Resumo por Pipeline</h3>
        <div className="space-y-3">
          {stats.pipeline_summary.map((p, i) => {
            const maxCount = stats.pipeline_summary[0]?.count || 1;
            return (
              <div key={p.pipeline_id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-200">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatNumber(p.count)} leads</span>
                    <span className="text-xs font-medium text-indigo-400">{formatCurrency(p.total_value)}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(p.count / maxCount) * 100}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
          {stats.pipeline_summary.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">Sem dados</div>
          )}
        </div>
      </div>

      {/* Leads per Day */}
      {stats.leads_per_day.length > 1 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Leads por Dia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.leads_per_day} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("pt-BR")}
                  formatter={(value: number) => [formatNumber(value), "Leads"]}
                />
                <Line type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2} dot={{ r: 3, fill: "#818cf8" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Products & Top Sellers */}
      {kpis && (kpis.top_products.length > 0 || kpis.top_sellers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          {kpis.top_products.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-200">Top Produtos</h3>
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
                      <span className="text-sm font-medium text-green-400">{formatCurrency(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Sellers */}
          {kpis.top_sellers.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2">
                <Award className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-200">Top Vendedores</h3>
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
                      <span className="text-sm font-medium text-green-400">{formatCurrency(s.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Assignees (Lead-level) */}
      {stats.top_assignees.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Top Responsaveis (Leads)</h3>
          <div className="space-y-3">
            {stats.top_assignees.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-6">{i + 1}.</span>
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-200">{a.name}</span>
                    <span className="text-sm font-semibold text-indigo-400">{formatCurrency(a.total_value)}</span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${(a.count / (stats.top_assignees[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500">{a.count} leads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
