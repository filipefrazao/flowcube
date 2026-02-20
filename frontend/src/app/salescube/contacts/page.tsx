"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Plus, Upload, Download, Search, Trash2, Edit, Merge, Filter,
  ChevronLeft, ChevronRight, X, Check, AlertCircle, UserCheck, UserX, Globe, Star,
} from "lucide-react";
import { contactApi, type Contact } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const SOURCES = ["manual", "website", "whatsapp", "indicacao", "evento", "trafego_pago", "organico"];
const STATES_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];
const PAGE_SIZE = 25;

const emptyForm = (): Partial<Contact> => ({
  name: "", email: "", phone: "", company: "", city: "", state: "",
  source: "manual", is_active: true, is_starred: false, notes: "",
});

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStarred, setFilterStarred] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<Partial<Contact>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Merge
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState<string>("");

  // CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // ── Debounce search ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Fetch contacts ───────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: PAGE_SIZE.toString(),
        offset: ((page - 1) * PAGE_SIZE).toString(),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterSource) params.source = filterSource;
      if (filterActive) params.is_active = filterActive;
      if (filterState) params.state = filterState;
      if (filterStarred) params.is_starred = "true";

      const res = await contactApi.list(params);
      const data = res.data;
      setContacts(data.results || data);
      setTotalCount(data.count ?? (data.results || data).length);
    } catch (err) {
      console.error("Erro ao carregar contatos", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterSource, filterActive, filterState, filterStarred]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── Selection helpers ────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  // ── CRUD handlers ───────────────────────────────────────────────────
  const openCreate = () => {
    setEditingContact(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm({ ...contact });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { setFormError("Nome e obrigatorio."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editingContact) {
        await contactApi.update(editingContact.id, form);
      } else {
        await contactApi.create(form);
      }
      setModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Erro ao salvar contato.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStar = async (contact: Contact) => {
    try {
      await contactApi.update(contact.id, { is_starred: !contact.is_starred });
      setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, is_starred: !c.is_starred } : c));
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} contato(s) selecionado(s)?`)) return;
    try {
      await contactApi.bulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      fetchContacts();
    } catch (err) {
      console.error(err);
    }
  };

  // ── CSV import / export ──────────────────────────────────────────────
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("Importando...");
    try {
      const res = await contactApi.importCsv(file);
      const count = res.data?.imported ?? 0;
      setImportStatus(`${count} contato(s) importado(s) com sucesso.`);
      fetchContacts();
    } catch (err: any) {
      setImportStatus(err?.response?.data?.detail || "Erro na importacao.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleExportCsv = async () => {
    try {
      const res = await contactApi.export();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contatos.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar", err);
    }
  };

  // ── Merge ────────────────────────────────────────────────────────────
  const openMerge = () => {
    if (selectedIds.size < 2) { alert("Selecione pelo menos 2 contatos para mesclar."); return; }
    setMergePrimaryId(Array.from(selectedIds)[0]);
    setMergeOpen(true);
  };

  const handleMerge = async () => {
    const duplicates = Array.from(selectedIds).filter((id) => id !== mergePrimaryId);
    try {
      await contactApi.merge(mergePrimaryId, duplicates);
      setMergeOpen(false);
      setSelectedIds(new Set());
      fetchContacts();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Erro ao mesclar contatos.");
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────
  const activeCount = contacts.filter((c) => c.is_active).length;
  const inactiveCount = contacts.filter((c) => !c.is_active).length;
  const starredCount = contacts.filter((c) => c.is_starred).length;
  const sourcesMap = contacts.reduce<Record<string, number>>((acc, c) => {
    const src = c.source || "manual";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});
  const topSource = Object.entries(sourcesMap).sort((a, b) => b[1] - a[1])[0];

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text-primary p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Contatos</h1>
          <span className="text-sm text-text-secondary">({totalCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors">
            <Upload className="h-4 w-4" /> Importar CSV
          </button>
          <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors">
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary rounded-lg font-medium transition-colors">
            <Plus className="h-4 w-4" /> Novo Contato
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: String(totalCount), color: "text-text-primary", bg: "bg-gray-500/10", icon: Users },
          { label: "Ativos", value: String(activeCount), color: "text-primary", bg: "bg-primary/10", icon: UserCheck },
          { label: "Inativos", value: String(inactiveCount), color: "text-red-400", bg: "bg-red-500/10", icon: UserX },
          { label: "Favoritos", value: String(starredCount), color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Star },
        ].map((s, i) => (
          <div key={i} className="bg-background-secondary border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wide">{s.label}</span>
              <div className={cn("p-1.5 rounded-lg", s.bg)}><s.icon className={cn("w-3.5 h-3.5", s.color)} /></div>
            </div>
            <span className={cn("text-lg font-bold capitalize", s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Import status toast */}
      {importStatus && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/15 border border-primary/30 rounded-lg text-sm text-primary">
          <AlertCircle className="h-4 w-4" /> {importStatus}
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text" placeholder="Buscar por nome, email, telefone ou empresa..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-secondary border border-border rounded-lg text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-lg transition-colors", showFilters ? "bg-primary border-primary text-text-primary" : "bg-background-secondary border-border hover:bg-surface-hover text-text-primary")}>
          <Filter className="h-4 w-4" /> Filtros
        </button>
        <button onClick={() => { setFilterStarred(!filterStarred); setPage(1); }} className={cn("flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-lg transition-colors", filterStarred ? "bg-yellow-600/20 border-yellow-600 text-yellow-400" : "bg-background-secondary border-border hover:bg-surface-hover text-text-primary")}>
          <Star className={cn("h-4 w-4", filterStarred && "fill-yellow-400")} /> Favoritos
        </button>

        {selectedIds.size > 0 && (
          <>
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-2.5 text-sm bg-red-600/20 hover:bg-red-600/30 border border-red-700 text-red-400 rounded-lg transition-colors">
              <Trash2 className="h-4 w-4" /> Excluir ({selectedIds.size})
            </button>
            <button onClick={openMerge} className="flex items-center gap-1.5 px-3 py-2.5 text-sm bg-amber-600/20 hover:bg-amber-600/30 border border-amber-700 text-amber-400 rounded-lg transition-colors">
              <Merge className="h-4 w-4" /> Mesclar ({selectedIds.size})
            </button>
          </>
        )}
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-background-secondary border border-border rounded-lg">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary uppercase tracking-wider">Fonte</label>
            <select value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}
              className="block w-40 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todas</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-secondary uppercase tracking-wider">Status</label>
            <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
              className="block w-40 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-secondary uppercase tracking-wider">Estado</label>
            <select value={filterState} onChange={(e) => { setFilterState(e.target.value); setPage(1); }}
              className="block w-40 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterSource(""); setFilterActive(""); setFilterState(""); setPage(1); }}
            className="self-end px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Limpar filtros</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-background-secondary border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-secondary/80">
                <th className="w-10 px-4 py-3 text-left">
                  <input type="checkbox" checked={contacts.length > 0 && selectedIds.size === contacts.length}
                    onChange={toggleSelectAll} className="rounded border-border bg-surface text-primary focus:ring-primary focus:ring-offset-0" />
                </th>
                <th className="w-10 px-2 py-3"></th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">Telefone</th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">Empresa</th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">Cidade</th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">UF</th>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">Fonte</th>
                <th className="px-4 py-3 text-center font-semibold text-text-primary">Ativo</th>
                <th className="px-4 py-3 text-right font-semibold text-text-primary">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-text-muted">Carregando...</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-text-muted">Nenhum contato encontrado.</td></tr>
              ) : contacts.map((c) => (
                <tr key={c.id} className={cn("border-b border-border/50 hover:bg-surface-hover/40 transition-colors", selectedIds.has(c.id) && "bg-primary/10")}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}
                      className="rounded border-border bg-surface text-primary focus:ring-primary focus:ring-offset-0" />
                  </td>
                  <td className="px-2 py-3">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleStar(c); }}
                      className="p-1 text-text-muted hover:text-yellow-400 transition-colors">
                      <Star className={cn("h-4 w-4", c.is_starred && "fill-yellow-400 text-yellow-400")} />
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">{c.name}</td>
                  <td className="px-4 py-3 text-text-primary">{c.email || "-"}</td>
                  <td className="px-4 py-3 text-text-primary">{c.phone || "-"}</td>
                  <td className="px-4 py-3 text-text-primary">{c.company || "-"}</td>
                  <td className="px-4 py-3 text-text-primary">{c.city || "-"}</td>
                  <td className="px-4 py-3 text-text-primary">{c.state || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-surface text-text-primary border border-border">{c.source?.replace(/_/g, " ") || "-"}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("inline-block h-2.5 w-2.5 rounded-full", c.is_active ? "bg-emerald-500" : "bg-text-muted")} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface-hover rounded-md transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-sm text-text-secondary">{totalCount} contato(s) encontrado(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-hover transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-text-primary">Pagina {page} de {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-hover transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg mx-4 bg-background-secondary border border-border rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">{editingContact ? "Editar Contato" : "Novo Contato"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertCircle className="h-4 w-4" />{formError}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-text-secondary mb-1">Nome *</label>
                  <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Email</label>
                  <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Telefone</label>
                  <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Empresa</label>
                  <input value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Fonte</label>
                  <select value={form.source || "manual"} onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    {SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Cidade</label>
                  <input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Estado</label>
                  <select value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Selecione</option>
                    {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={form.is_active ?? true}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded border-border bg-surface text-primary focus:ring-primary" />
                  <label htmlFor="is_active" className="text-sm text-text-primary">Contato ativo</label>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-text-secondary mb-1">Observacoes</label>
                  <textarea rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary hover:bg-primary disabled:opacity-50 rounded-lg transition-colors">
                <Check className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Merge Modal ──────────────────────────────────────────────────── */}
      {mergeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMergeOpen(false)} />
          <div className="relative w-full max-w-md mx-4 bg-background-secondary border border-border rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Merge className="h-5 w-5 text-amber-400" /> Mesclar Contatos</h2>
              <button onClick={() => setMergeOpen(false)} className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-text-secondary">Selecione o contato principal. Os demais serao mesclados nele e removidos.</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {contacts.filter((c) => selectedIds.has(c.id)).map((c) => (
                  <label key={c.id} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    mergePrimaryId === c.id ? "border-primary bg-primary/15" : "border-border bg-surface/50 hover:bg-surface-hover")}>
                    <input type="radio" name="primary" value={c.id} checked={mergePrimaryId === c.id}
                      onChange={() => setMergePrimaryId(c.id)}
                      className="text-primary focus:ring-primary bg-surface border-border" />
                    <div>
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-text-secondary ml-2">{c.email || c.phone || ""}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setMergeOpen(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleMerge}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors">
                <Merge className="h-4 w-4" /> Mesclar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
