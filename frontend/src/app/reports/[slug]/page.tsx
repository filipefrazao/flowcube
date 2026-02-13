"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, Loader2, Download, Play, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { reportsApi, type ReportDefinition, type ReportResult } from "@/lib/reportsApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

export default function ReportExecutionPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [report, setReport] = useState<ReportDefinition | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  useEffect(() => { loadReport(); }, [slug]);

  async function loadReport() {
    try {
      setLoading(true);
      const data = await reportsApi.get(slug);
      setReport(data);
      const defaults: Record<string, string> = {};
      data.parameters.forEach((p) => { defaults[p.name] = p.default_value || ""; });
      setParamValues(defaults);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleExecute() {
    try {
      setExecuting(true);
      const data = await reportsApi.execute(slug, paramValues);
      setResult(data);
    } catch (err) { console.error(err); }
    finally { setExecuting(false); }
  }

  async function handleExport(format: "csv" | "xlsx") {
    try {
      const blob = format === "csv"
        ? await reportsApi.exportCsv(slug, paramValues)
        : await reportsApi.exportXlsx(slug, paramValues);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  }

  function renderChart() {
    if (!result || !report || result.rows.length === 0) return null;
    const cols = result.columns;
    const labelKey = cols[0];
    const valueKey = cols[1];

    switch (report.chart_type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={result.rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={labelKey} tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
              <Bar dataKey={valueKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={result.rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={labelKey} tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
              <Line type="monotone" dataKey={valueKey} stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={result.rows} dataKey={valueKey} nameKey={labelKey} cx="50%" cy="50%" outerRadius={150} label>
                {result.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={result.rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={labelKey} tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
              <Area type="monotone" dataKey={valueKey} stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex h-screen bg-gray-900">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center text-gray-400">Relatorio nao encontrado</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/reports" className="text-gray-400 hover:text-gray-200"><ArrowLeft className="w-5 h-5" /></Link>
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">{report.name}</h1>
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <button onClick={() => handleExport("csv")} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs">
                <Download className="w-3 h-3" /> CSV
              </button>
              <button onClick={() => handleExport("xlsx")} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs">
                <Download className="w-3 h-3" /> XLSX
              </button>
            </div>
          )}
        </header>

        <div className="p-6 flex-1 overflow-auto">
          <p className="text-sm text-gray-400 mb-6">{report.description}</p>

          {report.parameters.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-200 mb-3">Parametros</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.parameters.map((p) => (
                  <div key={p.name}>
                    <label className="block text-xs text-gray-400 mb-1">{p.label}{p.required && " *"}</label>
                    {p.param_type === "select" ? (
                      <select value={paramValues[p.name] || ""} onChange={(e) => setParamValues({ ...paramValues, [p.name]: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-indigo-500">
                        <option value="">Selecione...</option>
                        {p.choices?.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input type={p.param_type === "date" ? "date" : p.param_type === "number" ? "number" : "text"}
                        value={paramValues[p.name] || ""} onChange={(e) => setParamValues({ ...paramValues, [p.name]: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-indigo-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleExecute} disabled={executing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium mb-6 disabled:opacity-50">
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Executar Relatorio
          </button>

          {result && (
            <>
              {report.chart_type !== "table" && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
                  {renderChart()}
                </div>
              )}

              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{result.total_rows} resultado(s)</span>
                  <span className="text-xs text-gray-500">Executado em {new Date(result.executed_at).toLocaleString("pt-BR")}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {result.columns.map((col) => (
                          <th key={col} className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          {result.columns.map((col) => (
                            <td key={col} className="px-4 py-2 text-sm text-gray-300">{String(row[col] ?? "-")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
