"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Presentation,
  Plus,
  Search,
  X,
  Send,
  CheckCircle,
  Clock,
  DollarSign,
  Trash2,
  Edit2,
  Filter,
  RotateCcw,
} from "lucide-react";
import {
  pitchApi,
  leadApi,
  saleApi,
  type Pitch,
  type Lead,
  type Sale,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; bg: string }> = {
  draft: { label: "Rascunho", bg: "bg-gray-500/20 text-text-secondary" },
  sent: { label: "Enviada", bg: "bg-blue-500/20 text-blue-400" },
  accepted: { label: "Aceita", bg: "bg-green-500/20 text-green-400" },
  rejected: { label: "Rejeitada", bg: "bg-red-500/20 text-red-400" },
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

export default function PitchesPage() {
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLead, setFilterLead] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterValueMin, setFilterValueMin] = useState("");
  const [filterValueMax, setFilterValueMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = !!(filterLead || filterDateFrom || filterDateTo || filterValueMin || filterValueMax);
  const clearFilters = () => { setFilterLead(""); setFilterDateFrom(""); setFilterDateTo(""); setFilterValueMin(""); setFilterValueMax(""); };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    lead: "",
    value: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;

      const [pitchesRes, leadsRes] = await Promise.all([
        pitchApi.list(params),
        leadApi.list({ limit: "200" }),
      ]);

      setPitches(pitchesRes.data.results || pitchesRes.data);
      setLeads(leadsRes.data.results || leadsRes.data);
    } catch (err) {
      console.error("Erro ao carregar propostas:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setSaving(true);
    try {
      await pitchApi.create({
        title: createForm.title,
        description: createForm.description,
        lead: createForm.lead || null,
        value: createForm.value || "0",
      });
      setShowCreateModal(false);
      setCreateForm({ title: "", description: "", lead: "", value: "" });
      fetchData();
    } catch (err) {
      console.error("Erro ao criar proposta:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      await pitchApi.send(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao enviar proposta:", err);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await pitchApi.accept(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao aceitar proposta:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta proposta?")) return;
    try {
      await pitchApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir proposta:", err);
    }
  };

  const filteredPitches = pitches.filter((p) => {
    if (filterLead && p.lead !== filterLead) return false;
    if (filterDateFrom && p.created_at && p.created_at < filterDateFrom) return false;
    if (filterDateTo && p.created_at && p.created_at > filterDateTo + "T23:59:59") return false;
    const val = parseFloat(p.value || "0");
    if (filterValueMin && val < parseFloat(filterValueMin)) return false;
    if (filterValueMax && val > parseFloat(filterValueMax)) return false;
    return true;
  });

  const totalValue = filteredPitches.reduce((sum, p) => sum + parseFloat(p.value || "0"), 0);
  const acceptedValue = pitches
    .filter((p) => p.status === "accepted")
    .reduce((sum, p) => sum + parseFloat(p.value || "0"), 0);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Presentation className="h-7 w-7 text-purple-400" />
          <h1 className="text-2xl font-bold text-text-primary">Propostas</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Nova Proposta
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-background-secondary p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Total de Propostas</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{filteredPitches.length}</p>
            </div>
            <div className="rounded-lg bg-purple-500/20 p-2.5 text-purple-400">
              <Presentation className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-secondary p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Valor Total</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{fmtCurrency(totalValue)}</p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-2.5 text-blue-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-secondary p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Aceitas</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{filteredPitches.filter((p) => p.status === "accepted").length}</p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-2.5 text-green-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-secondary p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Valor Aceito</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{fmtCurrency(acceptedValue)}</p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-2.5 text-green-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface/80 border border-border/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Buscar propostas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background-secondary/80 py-2 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background-secondary/80 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:border-primary transition-all">
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>
          <select value={filterLead} onChange={(e) => setFilterLead(e.target.value)}
            className="bg-background-secondary/80 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:border-primary transition-all">
            <option value="">Todos os Leads</option>
            {leads.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
              showFilters ? "bg-primary/20 border-primary/50 text-primary" : "bg-background-secondary/80 border-border text-text-secondary hover:text-text-primary")}>
            <Filter className="w-4 h-4" /> Filtros {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/50">
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Data De</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Data Ate</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Valor Min (R$)</label>
              <input type="number" placeholder="0,00" value={filterValueMin} onChange={(e) => setFilterValueMin(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Valor Max (R$)</label>
              <input type="number" placeholder="0,00" value={filterValueMax} onChange={(e) => setFilterValueMax(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-background-secondary">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="px-4 py-3 font-medium">Titulo</th>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criado por</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    Carregando propostas...
                  </td>
                </tr>
              ) : filteredPitches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              ) : (
                filteredPitches.map((pitch) => {
                  const st = STATUS_CONFIG[pitch.status] || STATUS_CONFIG.draft;
                  return (
                    <tr
                      key={pitch.id}
                      className="border-b border-border/50 transition hover:bg-surface-hover/40"
                    >
                      <td className="px-4 py-3 font-medium text-text-primary">{pitch.title}</td>
                      <td className="px-4 py-3 text-text-primary">{pitch.lead_name || "—"}</td>
                      <td className="px-4 py-3 font-medium text-text-primary">{fmtCurrency(pitch.value)}</td>
                      <td className="px-4 py-3">
                        <Badge text={st.label} className={st.bg} />
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{pitch.created_by_name || "—"}</td>
                      <td className="px-4 py-3 text-text-muted">{fmtDate(pitch.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {pitch.status === "draft" && (
                            <button
                              onClick={() => handleSend(pitch.id)}
                              className="rounded p-1.5 text-text-muted transition hover:bg-blue-500/10 hover:text-blue-400"
                              title="Enviar"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          {pitch.status === "sent" && (
                            <button
                              onClick={() => handleAccept(pitch.id)}
                              className="rounded p-1.5 text-text-muted transition hover:bg-green-500/10 hover:text-green-400"
                              title="Aceitar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(pitch.id)}
                            className="rounded p-1.5 text-text-muted transition hover:bg-red-500/10 hover:text-red-400"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-background-secondary shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-text-primary">Nova Proposta</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Titulo *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Titulo da proposta"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Descricao</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  placeholder="Detalhes da proposta..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-purple-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Lead</label>
                  <select
                    value={createForm.lead}
                    onChange={(e) => setCreateForm({ ...createForm, lead: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-purple-600"
                  >
                    <option value="">Nenhum</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.value}
                    onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-purple-600"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.title.trim()}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Criar Proposta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
