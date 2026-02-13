"use client";

import { useState, useEffect } from "react";
import { Users, DollarSign, TrendingUp, ShoppingCart, Calendar } from "lucide-react";
import { leadApi, type LeadStats } from "@/lib/salesApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function SalesCubeDashboard() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  useEffect(() => {
    fetchStats();
  }, [days]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await leadApi.getStats({ days });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Leads", value: stats.total_leads, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Total Vendas", value: stats.total_sales, icon: ShoppingCart, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Receita Total", value: formatCurrency(stats.total_revenue), icon: DollarSign, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Taxa Conversao", value: stats.total_leads > 0 ? `${((stats.total_sales / stats.total_leads) * 100).toFixed(1)}%` : "0%", icon: TrendingUp, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">Visao geral do CRM</p>
        </div>
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
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium uppercase">{kpi.label}</span>
              <div className={cn("p-2 rounded-lg", kpi.bg)}>
                <kpi.icon className={cn("w-4 h-4", kpi.color)} />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads per Stage */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Leads por Estagio</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.leads_per_stage} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#f3f4f6" }}
                  itemStyle={{ color: "#818cf8" }}
                  formatter={(value: number) => [value, "Leads"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.leads_per_stage.map((entry, index) => (
                    <rect key={index} fill={entry.color || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leads per Day */}
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
                  labelStyle={{ color: "#f3f4f6" }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("pt-BR")}
                  formatter={(value: number) => [value, "Leads"]}
                />
                <Line type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2} dot={{ r: 3, fill: "#818cf8" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Assignees */}
      {stats.top_assignees.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Top Vendedores</h3>
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
