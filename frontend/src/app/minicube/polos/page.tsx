"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MapPin, Plus, Search, Loader2, X, Filter, ChevronLeft, ChevronRight,
  Pencil, Trash2, Building2, GraduationCap, Users,
} from "lucide-react";
import { miniApi, type Pole, type Location } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const STATES_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "inativo", label: "Inativo", color: "bg-gray-500/20 text-text-secondary border-gray-500/30" },
];

export default function PolosPage() {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", address: "", city: "", state: "", zip_code: "", phone: "",
    email: "", status: "ativo" as string, notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus) params.status = filterStatus;
      if (filterState) params.state = filterState;
      if (filterCity) params.city = filterCity;

      const data = await miniApi.listPoles(params);
      setPoles(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, filterStatus, filterState, filterCity]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", address: "", city: "", state: "", zip_code: "", phone: "", email: "", status: "ativo", notes: "" });
    setShowForm(true);
  }

  function openEdit(p: Pole) {
    setEditingId(p.id);
    setFormData({
      name: p.name, address: p.address, city: p.city, state: p.state,
      zip_code: p.zip_code || "", phone: p.phone || "", email: p.email || "",
      status: p.status, notes: p.notes || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload: Record<string, any> = { ...formData };
      if (editingId) {
        await miniApi.updatePole(editingId, payload);
      } else {
        await miniApi.createPole(payload);
      }
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao salvar polo");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este polo? Turmas e clientes vinculados perderao a referencia.")) return;
    try { await miniApi.deletePole(id); fetchData(); } catch (err) { console.error(err); }
  }

  function getStatusBadge(status: string) {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", opt?.color || "bg-gray-500/20 text-text-secondary border-gray-500/30")}>{opt?.label || status}</span>;
  }

  function clearFilters() {
    setFilterStatus(""); setFilterState(""); setFilterCity(""); setSearch("");
  }

  const hasActiveFilters = filterStatus || filterState || filterCity || search;
  const inputClass = "w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors";
  const labelClass = "block text-sm font-medium text-text-primary mb-1.5";

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Polos</h1>
            <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">{totalCount}</span>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Novo Polo
          </button>
        </header>

        {/* Filters */}
        <div className="border-b border-border bg-background/50 px-6 py-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" placeholder="Buscar polo..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors",
                showFilters ? "border-primary text-primary bg-primary/10" : "border-border text-text-secondary hover:border-border")}>
              <Filter className="w-4 h-4" /> Filtros
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-text-muted hover:text-text-primary transition-colors">Limpar filtros</button>
            )}
          </div>
          {showFilters && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary">
                <option value="">Todos Status</option>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={filterState} onChange={(e) => { setFilterState(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary">
                <option value="">Estado/UF</option>
                {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="text" placeholder="Cidade" value={filterCity}
                onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary w-40" />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : poles.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-text-secondary">Nenhum polo encontrado</p>
              <p className="text-sm mt-1">Crie um novo polo para comecar.</p>
            </div>
          ) : (
            <>
              <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Nome</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Endereco</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Cidade</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">UF</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Unidades</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Turmas</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Clientes</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Criacao</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {poles.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-hover/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-text-primary">{p.name}</span>
                          {p.phone && <p className="text-xs text-text-muted">{p.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary max-w-[200px] truncate">{p.address || "-"}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{p.city || "-"}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{p.state || "-"}</td>
                        <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-text-primary">
                            <Building2 className="w-3.5 h-3.5 text-text-muted" /> {p.locations_count || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-text-primary">
                            <GraduationCap className="w-3.5 h-3.5 text-text-muted" /> {p.classes_count || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-text-primary">
                            <Users className="w-3.5 h-3.5 text-text-muted" /> {p.customers_count || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(p)} title="Editar"
                              className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} title="Excluir"
                              className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-text-secondary">
                  <span>{totalCount} polo{totalCount !== 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                      className="p-2 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-text-primary">Pagina {page} de {totalPages}</span>
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                      className="p-2 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create/Edit Dialog */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-background-secondary rounded-xl border border-border p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">{editingId ? "Editar Polo" : "Novo Polo"}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-surface-hover transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Nome *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do polo" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Endereco</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, numero, bairro" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Cidade</label>
                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Estado</label>
                    <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className={inputClass}>
                      <option value="">Selecione...</option>
                      {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>CEP</label>
                    <input type="text" value={formData.zip_code} onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      placeholder="00000-000" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="polo@exemplo.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputClass}>
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Observacoes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas internas sobre o polo..." className={inputClass} rows={3} />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm transition-colors">Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !formData.name}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Salvar" : "Criar Polo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
