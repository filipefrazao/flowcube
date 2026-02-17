"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Search,
  X,
  DollarSign,
  Calendar,
  Trash2,
  Edit2,
  Filter,
  RotateCcw,
} from "lucide-react";
import {
  campaignApi,
  pipelineApi,
  type Campaign,
  type Pipeline,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; bg: string }> = {
  draft: { label: "Rascunho", bg: "bg-gray-500/20 text-gray-400" },
  active: { label: "Ativa", bg: "bg-green-500/20 text-green-400" },
  paused: { label: "Pausada", bg: "bg-amber-500/20 text-amber-400" },
  completed: { label: "Concluida", bg: "bg-blue-500/20 text-blue-400" },
  cancelled: { label: "Cancelada", bg: "bg-red-500/20 text-red-400" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtCurrency(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {text}
    </span>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPipeline, setFilterPipeline] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterBudgetMin, setFilterBudgetMin] = useState("");
  const [filterBudgetMax, setFilterBudgetMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = !!(filterPipeline || filterDateFrom || filterDateTo || filterBudgetMin || filterBudgetMax);
  const clearFilters = () => { setFilterPipeline(""); setFilterDateFrom(""); setFilterDateTo(""); setFilterBudgetMin(""); setFilterBudgetMax(""); };

  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    pipeline: "",
    status: "draft",
    budget: "",
    start_date: "",
    end_date: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;

      const [campaignsRes, pipelinesRes] = await Promise.all([
        campaignApi.list(params),
        pipelineApi.list(),
      ]);

      setCampaigns(campaignsRes.data.results || campaignsRes.data);
      setPipelines(pipelinesRes.data.results || pipelinesRes.data);
    } catch (err) {
      console.error("Erro ao carregar campanhas:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingCampaign(null);
    setForm({ name: "", description: "", pipeline: "", status: "draft", budget: "", start_date: "", end_date: "" });
    setShowModal(true);
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name,
      description: campaign.description,
      pipeline: campaign.pipeline || "",
      status: campaign.status,
      budget: campaign.budget || "",
      start_date: campaign.start_date || "",
      end_date: campaign.end_date || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name,
        description: form.description,
        pipeline: form.pipeline || null,
        status: form.status,
        budget: form.budget || "0",
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editingCampaign) {
        await campaignApi.update(editingCampaign.id, data);
      } else {
        await campaignApi.create(data);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar campanha:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    try {
      await campaignApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir campanha:", err);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterPipeline && c.pipeline !== filterPipeline) return false;
    if (filterDateFrom && c.start_date && c.start_date < filterDateFrom) return false;
    if (filterDateTo && c.end_date && c.end_date > filterDateTo) return false;
    const budget = parseFloat(c.budget || "0");
    if (filterBudgetMin && budget < parseFloat(filterBudgetMin)) return false;
    if (filterBudgetMax && budget > parseFloat(filterBudgetMax)) return false;
    return true;
  });

  const totalBudget = filteredCampaigns.reduce((sum, c) => sum + parseFloat(c.budget || "0"), 0);
  const activeCount = filteredCampaigns.filter((c) => c.status === "active").length;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-indigo-400" />
          <h1 className="text-2xl font-bold text-gray-100">Campanhas</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Campanhas</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{filteredCampaigns.length}</p>
            </div>
            <div className="rounded-lg bg-indigo-500/20 p-2.5 text-indigo-400">
              <Megaphone className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Ativas</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{activeCount}</p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-2.5 text-green-400">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Orcamento Total</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{fmtCurrency(totalBudget)}</p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-2.5 text-blue-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar campanhas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900/80 py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 transition-all"
          >
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filterPipeline}
            onChange={(e) => setFilterPipeline(e.target.value)}
            className="bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 transition-all"
          >
            <option value="">Todos os Pipelines</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
              showFilters ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400" : "bg-gray-900/80 border-gray-700 text-gray-400 hover:text-gray-100")}>
            <Filter className="w-4 h-4" /> Filtros {hasActiveFilters && <span className="w-2 h-2 bg-indigo-400 rounded-full" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-100 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-700/50">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Data Inicio De</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Data Fim Ate</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Orcamento Min (R$)</label>
              <input type="number" placeholder="0,00" value={filterBudgetMin} onChange={(e) => setFilterBudgetMin(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Orcamento Max (R$)</label>
              <input type="number" placeholder="0,00" value={filterBudgetMax} onChange={(e) => setFilterBudgetMax(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Pipeline</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Orcamento</th>
                <th className="px-4 py-3 font-medium">Inicio</th>
                <th className="px-4 py-3 font-medium">Fim</th>
                <th className="px-4 py-3 font-medium text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Carregando campanhas...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Nenhuma campanha encontrada.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const st = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
                  return (
                    <tr
                      key={campaign.id}
                      className="border-b border-gray-800/50 transition hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3 font-medium text-gray-100">{campaign.name}</td>
                      <td className="px-4 py-3 text-gray-300">{campaign.pipeline_name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge text={st.label} className={st.bg} />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-100">{fmtCurrency(campaign.budget)}</td>
                      <td className="px-4 py-3 text-gray-400">{fmtDate(campaign.start_date)}</td>
                      <td className="px-4 py-3 text-gray-400">{fmtDate(campaign.end_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(campaign)}
                            className="rounded p-1.5 text-gray-500 transition hover:bg-indigo-500/10 hover:text-indigo-400"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(campaign.id)}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-100">
                {editingCampaign ? "Editar Campanha" : "Nova Campanha"}
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
                  placeholder="Nome da campanha"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Descricao</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Descricao da campanha..."
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Pipeline</label>
                  <select
                    value={form.pipeline}
                    onChange={(e) => setForm({ ...form, pipeline: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-indigo-600"
                  >
                    <option value="">Nenhum</option>
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-indigo-600"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Orcamento</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Inicio</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Fim</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-indigo-600"
                  />
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
                {saving ? "Salvando..." : editingCampaign ? "Salvar" : "Criar Campanha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
