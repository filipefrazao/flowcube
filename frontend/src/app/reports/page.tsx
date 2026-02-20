"use client";

import { useEffect, useState } from "react";
import { BarChart3, PieChart, LineChart, Table, AreaChart, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { reportsApi, type ReportDefinition } from "@/lib/reportsApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

const chartIcons: Record<string, any> = {
  bar: BarChart3,
  pie: PieChart,
  line: LineChart,
  table: Table,
  area: AreaChart,
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const data = await reportsApi.list();
      setReports(data.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex h-screen bg-background-secondary">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background-secondary flex items-center px-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Relatorios</h1>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum relatorio disponivel</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {reports.map((r) => {
                const Icon = chartIcons[r.chart_type] || BarChart3;
                return (
                  <div key={r.id} className="bg-surface rounded-lg border border-border p-5 hover:border-primary/50 transition-colors flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">{r.name}</h3>
                        <span className="text-xs text-text-muted">{r.chart_type}</span>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary mb-4 flex-1 line-clamp-2">{r.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">{r.parameters.length} parametro(s)</span>
                      <Link href={`/reports/${r.slug}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-xs font-medium">
                        <Play className="w-3 h-3" /> Executar
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
