"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Plus, Search, Loader2, X, Filter, ChevronLeft, ChevronRight,
  Eye, Pencil, Trash2, Calendar, Users, ClipboardCheck,
} from "lucide-react";
import { miniApi, type MiniClass, type Location, type Pole } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "proxima", label: "Proxima", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "em_andamento", label: "Em Andamento", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "finalizada", label: "Finalizada", color: "bg-gray-500/20 text-text-secondary border-gray-500/30" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

export default function TurmasPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<MiniClass[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterPole, setFilterPole] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", location: "", pole: "", product: "",
    capacity: 30, status: "proxima" as string,
    start_date: "", end_date: "",
  });
  const [saving, setSaving] = useState(false);

  // Debounce search
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
      if (filterLocation) params.location = filterLocation;
      if (filterPole) params.pole = filterPole;

      const [classData, locData, poleData] = await Promise.all([
        miniApi.listClasses(params),
        miniApi.listLocations({ limit: 200 }),
        miniApi.listPoles({ limit: 200 }),
      ]);
      setClasses(classData.results || []);
      setTotalCount(classData.count || 0);
      setLocations(locData.results || []);
      setPoles(poleData.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, filterStatus, filterLocation, filterPole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", description: "", location: "", pole: "", product: "", capacity: 30, status: "proxima", start_date: "", end_date: "" });
    setShowForm(true);
  }

  function openEdit(c: MiniClass) {
    setEditingId(c.id);
    setFormData({
      name: c.name, description: c.description,
      location: c.location || "", pole: c.pole || "", product: c.product || "",
      capacity: c.capacity, status: c.status,
      start_date: c.start_date || "", end_date: c.end_date || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload: Record<string, any> = { ...formData };
      payload.instructor = null;
      if (!payload.start_date) payload.start_date = null;
      if (!payload.end_date) payload.end_date = null;
      if (!payload.pole) payload.pole = null;
      if (!payload.product) payload.product = null;
      if (!payload.location) { alert("Selecione uma unidade."); setSaving(false); return; }
      if (editingId) {
        await miniApi.updateClass(editingId, payload);
      } else {
        await miniApi.createClass(payload);
      }
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao salvar turma");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta turma?")) return;
    try { await miniApi.deleteClass(id); fetchData(); } catch (err) { console.error(err); }
  }

  function getStatusBadge(status: string) {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", opt?.color || "bg-gray-500/20 text-text-secondary border-gray-500/30")}>
        {opt?.label || status}
      </span>
    );
  }

  function clearFilters() {
    setFilterStatus("");
    setFilterLocation("");
    setFilterPole("");
    setSearch("");
  }

  const hasActiveFilters = filterStatus || filterLocation || filterPole || search;

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Turmas</h1>
            <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">{totalCount}</span>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nova Turma
          </button>
        </header>

        {/* Filters Bar */}
        <div className="border-b border-border bg-background/50 px-6 py-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" placeholder="Buscar turma..." value={search}
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
              <select value={filterPole} onChange={(e) => { setFilterPole(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary">
                <option value="">Todos Polos</option>
                {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={filterLocation} onChange={(e) => { setFilterLocation(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary">
                <option value="">Todas Unidades</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name} - {l.city}/{l.state}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : classes.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-text-secondary">Nenhuma turma encontrada</p>
              <p className="text-sm mt-1">Crie uma nova turma para comecar.</p>
            </div>
          ) : (
            <>
              <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Nome</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Produto</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Unidade</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Polo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Alunos</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Inicio</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Termino</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {classes.map((c) => (
                      <tr key={c.id} className="hover:bg-surface-hover/40 transition-colors cursor-pointer" onClick={() => router.push(`/minicube/turmas/${c.id}`)}>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-text-primary">{c.name}</span>
                          {c.description && <p className="text-xs text-text-muted mt-0.5 truncate max-w-[200px]">{c.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary">{c.product_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{c.location_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{c.pole_name || "-"}</td>
                        <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-text-primary">
                            <Users className="w-3.5 h-3.5 text-text-muted" /> {c.enrollments_count || c.students_count || 0}/{c.capacity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "-"}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "-"}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => router.push(`/minicube/turmas/${c.id}`)} title="Ver Detalhes"
                              className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => router.push(`/minicube/turmas/${c.id}/presenca`)} title="Presenca"
                              className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-green-400 transition-colors">
                              <ClipboardCheck className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEdit(c)} title="Editar"
                              className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(c.id)} title="Excluir"
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
                  <span>{totalCount} turma{totalCount !== 1 ? "s" : ""} encontrada{totalCount !== 1 ? "s" : ""}</span>
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
            <div className="bg-background-secondary rounded-xl border border-border p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">{editingId ? "Editar Turma" : "Nova Turma"}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-surface-hover transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Nome *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da turma"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Polo</label>
                    <select value={formData.pole} onChange={(e) => setFormData({ ...formData, pole: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors">
                      <option value="">Selecione...</option>
                      {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Unidade *</label>
                    <select value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors">
                      <option value="">Selecione...</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name} - {l.city}/{l.state}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Descricao</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descricao da turma"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Capacidade</label>
                    <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors">
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Data Inicio</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Data Termino</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm transition-colors">Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !formData.name || !formData.location}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Salvar" : "Criar Turma"}
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
