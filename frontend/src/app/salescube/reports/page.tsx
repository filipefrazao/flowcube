"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  X,
  Play,
  Clock,
  Edit2,
  Trash2,
  Download,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  reportTemplateApi,
  reportLogApi,
  type ReportTemplate,
  type ReportLog,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { label: string; bg: string }> = {
  sales: { label: "Vendas", bg: "bg-green-500/20 text-green-400" },
  leads: { label: "Leads", bg: "bg-blue-500/20 text-blue-400" },
  financial: { label: "Financeiro", bg: "bg-amber-500/20 text-amber-400" },
  custom: { label: "Personalizado", bg: "bg-purple-500/20 text-purple-400" },
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtDateTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {text}
    </span>
  );
}

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"templates" | "history">("templates");

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    template_type: "sales",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, logsRes] = await Promise.all([
        reportTemplateApi.list(),
        reportLogApi.list(),
      ]);

      setTemplates(templatesRes.data.results || templatesRes.data);
      setLogs(logsRes.data.results || logsRes.data);
    } catch (err) {
      console.error("Erro ao carregar relatorios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setForm({ name: "", description: "", template_type: "sales", is_active: true });
    setShowModal(true);
  };

  const openEditModal = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description,
      template_type: template.template_type,
      is_active: template.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingTemplate) {
        await reportTemplateApi.update(editingTemplate.id, form);
      } else {
        await reportTemplateApi.create(form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar template:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    try {
      await reportTemplateApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir template:", err);
    }
  };

  const handleGenerate = async (id: string) => {
    setGenerating(id);
    try {
      await reportTemplateApi.generate(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao gerar relatorio:", err);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-indigo-400" />
          <h1 className="text-2xl font-bold text-gray-100">Relatorios</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Novo Template
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Templates</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{templates.length}</p>
            </div>
            <div className="rounded-lg bg-indigo-500/20 p-2.5 text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Ativos</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{templates.filter((t) => t.is_active).length}</p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-2.5 text-green-400">
              <ToggleRight className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Gerados</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{logs.length}</p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-2.5 text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1 w-fit">
        <button
          onClick={() => setActiveTab("templates")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition",
            activeTab === "templates" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-100"
          )}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition",
            activeTab === "history" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-100"
          )}
        >
          Historico
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Criado por</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      Carregando templates...
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      Nenhum template encontrado.
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => {
                    const typeCfg = TYPE_CONFIG[template.template_type] || TYPE_CONFIG.custom;
                    return (
                      <tr key={template.id} className="border-b border-gray-800/50 transition hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-100">{template.name}</span>
                          {template.description && (
                            <p className="mt-0.5 text-xs text-gray-500 truncate max-w-xs">{template.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge text={typeCfg.label} className={typeCfg.bg} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            text={template.is_active ? "Ativo" : "Inativo"}
                            className={template.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-400">{template.created_by_name || "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(template.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleGenerate(template.id)}
                              disabled={generating === template.id}
                              className="rounded p-1.5 text-gray-500 transition hover:bg-green-500/10 hover:text-green-400 disabled:opacity-50"
                              title="Gerar Relatorio"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(template)}
                              className="rounded p-1.5 text-gray-500 transition hover:bg-indigo-500/10 hover:text-indigo-400"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="rounded p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Gerado por</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                      Carregando historico...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                      Nenhum relatorio gerado ainda.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-800/50 transition hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-gray-100">{log.template_name || log.template}</td>
                      <td className="px-4 py-3 text-gray-400">{log.generated_by_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDateTime(log.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-100">
                {editingTemplate ? "Editar Template" : "Novo Template"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do template"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Descricao</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Descricao do template..."
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Tipo</label>
                  <select
                    value={form.template_type}
                    onChange={(e) => setForm({ ...form, template_type: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-indigo-600"
                  >
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Status</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition",
                      form.is_active
                        ? "border-green-700/50 bg-green-950/20 text-green-400"
                        : "border-gray-700 bg-gray-950 text-gray-400"
                    )}
                  >
                    {form.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {form.is_active ? "Ativo" : "Inativo"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-800 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingTemplate ? "Salvar" : "Criar Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
