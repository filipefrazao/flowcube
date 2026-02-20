"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Search, Loader2, X, Filter, ChevronLeft, ChevronRight,
  Pencil, Trash2, Eye, User, FileText, MessageSquare, ShoppingCart,
  GraduationCap, ClipboardList, StickyNote, Camera, Building2,
  Phone, Mail, MapPin,
} from "lucide-react";
import { miniApi, type Customer, type Pole, type Enrollment } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const STATES_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];
const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "inativo", label: "Inativo", color: "bg-gray-500/20 text-text-secondary border-border" },
  { value: "prospect", label: "Prospect", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
];
const TIPO_PESSOA_OPTIONS = [
  { value: "fisica", label: "Pessoa Fisica" },
  { value: "juridica", label: "Pessoa Juridica" },
];

const TABS = [
  { key: "info", label: "Info", icon: User },
  { key: "cadastro", label: "Cadastro", icon: FileText },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "leads", label: "Leads", icon: Eye },
  { key: "vendas", label: "Vendas", icon: ShoppingCart },
  { key: "turmas", label: "Turmas", icon: GraduationCap },
  { key: "tarefas", label: "Tarefas", icon: ClipboardList },
  { key: "notas", label: "Notas", icon: StickyNote },
  { key: "foto", label: "Foto", icon: Camera },
];

const emptyForm = (): Partial<Customer> => ({
  name: "", email: "", phone: "", cpf: "", cnpj: "",
  tipo_pessoa: "fisica", company: "", position: "",
  address: "", city: "", state: "", zip_code: "",
  photo_url: "", birth_date: null, notes: "",
  status: "ativo", pole: null,
});

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Search & filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTipoPessoa, setFilterTipoPessoa] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterPole, setFilterPole] = useState("");
  const [filterCreatedAfter, setFilterCreatedAfter] = useState("");
  const [filterCreatedBefore, setFilterCreatedBefore] = useState("");
  const [sortField, setSortField] = useState("name");
  const [showFilters, setShowFilters] = useState(false);

  // Create/Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Customer>>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Detail drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerEnrollments, setCustomerEnrollments] = useState<Enrollment[]>([]);
  const [noteText, setNoteText] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

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
        ordering: sortField,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus) params.status = filterStatus;
      if (filterTipoPessoa) params.tipo_pessoa = filterTipoPessoa;
      if (filterState) params.state = filterState;
      if (filterCity) params.city = filterCity;
      if (filterPole) params.pole = filterPole;
      if (filterCreatedAfter) params.created_after = filterCreatedAfter;
      if (filterCreatedBefore) params.created_before = filterCreatedBefore;

      const [custData, poleData] = await Promise.all([
        miniApi.listCustomers(params),
        miniApi.listPoles({ limit: 200 }),
      ]);
      setCustomers(custData.results || []);
      setTotalCount(custData.count || 0);
      setPoles(poleData.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, filterStatus, filterTipoPessoa, filterState, filterCity, filterPole, filterCreatedAfter, filterCreatedBefore, sortField]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditingId(c.id);
    setForm({
      name: c.name, email: c.email, phone: c.phone, cpf: c.cpf, cnpj: c.cnpj,
      tipo_pessoa: c.tipo_pessoa, company: c.company, position: c.position,
      address: c.address, city: c.city, state: c.state, zip_code: c.zip_code,
      photo_url: c.photo_url, birth_date: c.birth_date,
      notes: c.notes, status: c.status, pole: c.pole,
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload: Record<string, any> = { ...form };
      if (!payload.pole) payload.pole = null;
      if (!payload.birth_date) payload.birth_date = null;
      if (editingId) {
        await miniApi.updateCustomer(editingId, payload);
      } else {
        await miniApi.createCustomer(payload);
      }
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao salvar");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cliente?")) return;
    try { await miniApi.deleteCustomer(id); fetchData(); if (selectedCustomer?.id === id) setSelectedCustomer(null); } catch (err) { console.error(err); }
  }

  async function openDetail(c: Customer) {
    setSelectedCustomer(c);
    setActiveTab("info");
    setDetailLoading(true);
    try {
      const [enroll, notesData] = await Promise.all([
        miniApi.getCustomerEnrollments(c.id),
        miniApi.getCustomerNotes(c.id),
      ]);
      setCustomerEnrollments(enroll || []);
      setCustomerNotes(notesData.notes || "");
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  }

  async function handleAddNote() {
    if (!noteText.trim() || !selectedCustomer) return;
    try {
      const result = await miniApi.addCustomerNote(selectedCustomer.id, noteText.trim());
      setCustomerNotes(result.notes || "");
      setNoteText("");
    } catch (err) { console.error(err); }
  }

  async function handleDetailSave() {
    if (!selectedCustomer) return;
    try {
      setSaving(true);
      await miniApi.updateCustomer(selectedCustomer.id, form);
      fetchData();
      const updated = await miniApi.getCustomer(selectedCustomer.id);
      setSelectedCustomer(updated);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao salvar");
    } finally { setSaving(false); }
  }

  // When selectedCustomer changes, update form for inline editing
  useEffect(() => {
    if (selectedCustomer) {
      setForm({
        name: selectedCustomer.name, email: selectedCustomer.email, phone: selectedCustomer.phone,
        cpf: selectedCustomer.cpf, cnpj: selectedCustomer.cnpj, tipo_pessoa: selectedCustomer.tipo_pessoa,
        company: selectedCustomer.company, position: selectedCustomer.position,
        address: selectedCustomer.address, city: selectedCustomer.city, state: selectedCustomer.state,
        zip_code: selectedCustomer.zip_code, photo_url: selectedCustomer.photo_url,
        birth_date: selectedCustomer.birth_date, notes: selectedCustomer.notes,
        status: selectedCustomer.status, pole: selectedCustomer.pole,
      });
    }
  }, [selectedCustomer]);

  function getStatusBadge(status: string) {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", opt?.color || "bg-gray-500/20 text-text-secondary border-border")}>{opt?.label || status}</span>;
  }

  function clearFilters() {
    setFilterStatus(""); setFilterTipoPessoa(""); setFilterState(""); setFilterCity("");
    setFilterPole(""); setFilterCreatedAfter(""); setFilterCreatedBefore(""); setSearch(""); setSortField("name");
  }

  const hasActiveFilters = filterStatus || filterTipoPessoa || filterState || filterCity || filterPole || filterCreatedAfter || filterCreatedBefore || search;

  const inputClass = "w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors";
  const labelClass = "block text-sm font-medium text-text-primary mb-1.5";
  const selectClass = "px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary";

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Clientes</h1>
            <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">{totalCount}</span>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </header>

        {/* Filters */}
        <div className="border-b border-border bg-background/50 px-6 py-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" placeholder="Buscar nome, email, CPF, telefone..." value={search}
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
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className={selectClass}>
                <option value="">Todos Status</option>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={filterTipoPessoa} onChange={(e) => { setFilterTipoPessoa(e.target.value); setPage(1); }} className={selectClass}>
                <option value="">Tipo Pessoa</option>
                {TIPO_PESSOA_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={filterState} onChange={(e) => { setFilterState(e.target.value); setPage(1); }} className={selectClass}>
                <option value="">Estado/UF</option>
                {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="text" placeholder="Cidade" value={filterCity} onChange={(e) => { setFilterCity(e.target.value); setPage(1); }} className={selectClass} />
              <select value={filterPole} onChange={(e) => { setFilterPole(e.target.value); setPage(1); }} className={selectClass}>
                <option value="">Todos Polos</option>
                {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={sortField} onChange={(e) => { setSortField(e.target.value); setPage(1); }} className={selectClass}>
                <option value="name">Ordenar: Nome A-Z</option>
                <option value="-name">Ordenar: Nome Z-A</option>
                <option value="-created_at">Ordenar: Mais Recente</option>
                <option value="created_at">Ordenar: Mais Antigo</option>
                <option value="city">Ordenar: Cidade</option>
                <option value="state">Ordenar: Estado</option>
              </select>
              <div className="flex items-center gap-2">
                <input type="date" placeholder="De" value={filterCreatedAfter} onChange={(e) => { setFilterCreatedAfter(e.target.value); setPage(1); }}
                  className={cn(selectClass, "flex-1")} title="Data inicio" />
              </div>
              <div className="flex items-center gap-2">
                <input type="date" placeholder="Ate" value={filterCreatedBefore} onChange={(e) => { setFilterCreatedBefore(e.target.value); setPage(1); }}
                  className={cn(selectClass, "flex-1")} title="Data fim" />
              </div>
            </div>
          )}
        </div>

        {/* Content: Table + Detail Drawer */}
        <div className="flex-1 flex overflow-hidden">
          {/* Table */}
          <div className={cn("flex-1 overflow-auto p-6 transition-all", selectedCustomer ? "w-1/2" : "w-full")}>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : customers.length === 0 ? (
              <div className="text-center py-20 text-text-muted">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-text-secondary">Nenhum cliente encontrado</p>
                <p className="text-sm mt-1">Cadastre um novo cliente para comecar.</p>
              </div>
            ) : (
              <>
                <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Nome</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">CPF/CNPJ</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Telefone</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Cidade</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">UF</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Tipo</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Cadastro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {customers.map((c) => (
                        <tr key={c.id} onClick={() => openDetail(c)}
                          className={cn("hover:bg-surface-hover/40 transition-colors cursor-pointer",
                            selectedCustomer?.id === c.id && "bg-primary/10 border-l-2 border-l-primary")}>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-text-primary">{c.name}</span>
                            {c.company && <p className="text-xs text-text-muted">{c.company}</p>}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-primary">{c.cpf || c.cnpj || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-primary max-w-[150px] truncate">{c.email || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-primary">{c.phone || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-primary">{c.city || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-primary">{c.state || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{c.tipo_pessoa === "juridica" ? "PJ" : "PF"}</td>
                          <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-sm text-text-secondary">
                    <span>{totalCount} cliente{totalCount !== 1 ? "s" : ""}</span>
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

          {/* Detail Drawer */}
          {selectedCustomer && (
            <div className="w-1/2 border-l border-border bg-background flex flex-col overflow-hidden">
              {/* Drawer header */}
              <div className="border-b border-border px-6 py-4 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-text-primary">{selectedCustomer.name}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(selectedCustomer)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-primary transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(selectedCustomer.id)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setSelectedCustomer(null)} className="p-1.5 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedCustomer.email}</span>}
                  {selectedCustomer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedCustomer.phone}</span>}
                  {selectedCustomer.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedCustomer.city}/{selectedCustomer.state}</span>}
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-border px-6 shrink-0 overflow-x-auto">
                <div className="flex gap-0 min-w-max">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={cn("flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                          activeTab === tab.key
                            ? "border-primary text-primary"
                            : "border-transparent text-text-muted hover:text-text-primary")}>
                        <Icon className="w-3.5 h-3.5" /> {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-6">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                ) : (
                  <>
                    {/* TAB: Info */}
                    {activeTab === "info" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelClass}>Nome</label>
                            <input type="text" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Email</label>
                            <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Telefone</label>
                            <input type="text" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>CPF</label>
                            <input type="text" value={form.cpf || ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>CNPJ</label>
                            <input type="text" value={form.cnpj || ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Status</label>
                            <select value={form.status || "ativo"} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className={inputClass}>
                              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelClass}>Cidade</label>
                            <input type="text" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Estado</label>
                            <select value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass}>
                              <option value="">Selecione...</option>
                              {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button onClick={handleDetailSave} disabled={saving}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Alteracoes
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB: Cadastro */}
                    {activeTab === "cadastro" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelClass}>Tipo Pessoa</label>
                            <select value={form.tipo_pessoa || "fisica"} onChange={(e) => setForm({ ...form, tipo_pessoa: e.target.value as any })} className={inputClass}>
                              {TIPO_PESSOA_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div><label className={labelClass}>Data Nascimento</label>
                            <input type="date" value={form.birth_date || ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })} className={inputClass} /></div>
                          <div><label className={labelClass}>Empresa</label>
                            <input type="text" value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Cargo</label>
                            <input type="text" value={form.position || ""} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Endereco</label>
                            <input type="text" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>CEP</label>
                            <input type="text" value={form.zip_code || ""} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} className={inputClass} /></div>
                          <div><label className={labelClass}>Polo</label>
                            <select value={form.pole || ""} onChange={(e) => setForm({ ...form, pole: e.target.value || null })} className={inputClass}>
                              <option value="">Nenhum</option>
                              {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="bg-background-secondary rounded-lg border border-border p-4">
                          <p className="text-xs text-text-muted mb-1">Data de Cadastro</p>
                          <p className="text-sm text-text-primary">{new Date(selectedCustomer.created_at).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="bg-background-secondary rounded-lg border border-border p-4">
                          <p className="text-xs text-text-muted mb-1">Ultima Atualizacao</p>
                          <p className="text-sm text-text-primary">{new Date(selectedCustomer.updated_at).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button onClick={handleDetailSave} disabled={saving}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar Alteracoes
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB: Chat */}
                    {activeTab === "chat" && (
                      <div className="text-center py-10 text-text-muted">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Conversas vinculadas ao cliente</p>
                        <p className="text-xs text-text-muted mt-1">Integracao com ChatCube/WhatsApp em breve.</p>
                      </div>
                    )}

                    {/* TAB: Leads */}
                    {activeTab === "leads" && (
                      <div className="text-center py-10 text-text-muted">
                        <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Leads associados ao cliente</p>
                        {selectedCustomer.lead ? (
                          <p className="text-xs text-primary mt-2">Lead vinculado: {selectedCustomer.lead}</p>
                        ) : (
                          <p className="text-xs text-text-muted mt-1">Nenhum lead vinculado.</p>
                        )}
                      </div>
                    )}

                    {/* TAB: Vendas */}
                    {activeTab === "vendas" && (
                      <div className="text-center py-10 text-text-muted">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Vendas associadas ao cliente</p>
                        <p className="text-xs text-text-muted mt-1">Integracao com SalesCube em breve.</p>
                      </div>
                    )}

                    {/* TAB: Turmas */}
                    {activeTab === "turmas" && (
                      <div>
                        {customerEnrollments.length === 0 ? (
                          <div className="text-center py-10 text-text-muted">
                            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Nenhuma matricula encontrada.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {customerEnrollments.map((e) => (
                              <div key={e.id} className="bg-background-secondary rounded-lg border border-border p-4 flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{e.class_name || "Turma"}</p>
                                  <p className="text-xs text-text-muted">Matriculado em {new Date(e.enrolled_at).toLocaleDateString("pt-BR")}</p>
                                </div>
                                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                  e.status === "confirmado" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                  e.status === "pendente" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                  e.status === "ausente" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                  e.status === "transferido" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                                  "bg-gray-500/20 text-text-secondary border-border"
                                )}>
                                  {e.status === "pendente" ? "Pendente" : e.status === "confirmado" ? "Confirmado" : e.status === "ausente" ? "Ausente" : e.status === "sem_contato" ? "Sem Contato" : e.status === "transferido" ? "Transferido" : e.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: Tarefas */}
                    {activeTab === "tarefas" && (
                      <div className="text-center py-10 text-text-muted">
                        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Tarefas vinculadas ao cliente</p>
                        <p className="text-xs text-text-muted mt-1">Integracao com SalesCube Tasks em breve.</p>
                      </div>
                    )}

                    {/* TAB: Notas */}
                    {activeTab === "notas" && (
                      <div>
                        <div className="mb-4">
                          <div className="flex gap-2">
                            <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Adicionar uma nota..."
                              onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                              className={cn(inputClass, "flex-1")} />
                            <button onClick={handleAddNote} disabled={!noteText.trim()}
                              className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                              Adicionar
                            </button>
                          </div>
                        </div>
                        {customerNotes ? (
                          <div className="bg-background-secondary rounded-lg border border-border p-4 space-y-2">
                            {customerNotes.split("\n").filter(Boolean).reverse().map((note, i) => (
                              <div key={i} className="text-sm text-text-primary border-b border-border pb-2 last:border-0 last:pb-0">
                                {note}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-text-muted">
                            <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Nenhuma nota.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: Foto */}
                    {activeTab === "foto" && (
                      <div className="text-center">
                        <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-background-secondary border-2 border-border flex items-center justify-center overflow-hidden">
                          {selectedCustomer.photo_url ? (
                            <img src={selectedCustomer.photo_url} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-16 h-16 text-text-secondary" />
                          )}
                        </div>
                        <div className="max-w-sm mx-auto">
                          <label className={labelClass}>URL da Foto</label>
                          <input type="url" value={form.photo_url || ""} onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                            placeholder="https://..." className={inputClass} />
                          <button onClick={handleDetailSave} disabled={saving}
                            className="mt-3 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors w-full">
                            Salvar Foto
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-background-secondary rounded-xl border border-border p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">{editingId ? "Editar Cliente" : "Novo Cliente"}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-surface-hover transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Nome *</label>
                    <input type="text" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className={inputClass} /></div>
                  <div><label className={labelClass}>Email</label>
                    <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className={inputClass} /></div>
                  <div><label className={labelClass}>Telefone</label>
                    <input type="text" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" className={inputClass} /></div>
                  <div><label className={labelClass}>Tipo Pessoa</label>
                    <select value={form.tipo_pessoa || "fisica"} onChange={(e) => setForm({ ...form, tipo_pessoa: e.target.value as any })} className={inputClass}>
                      {TIPO_PESSOA_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>CPF</label>
                    <input type="text" value={form.cpf || ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" className={inputClass} /></div>
                  <div><label className={labelClass}>CNPJ</label>
                    <input type="text" value={form.cnpj || ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" className={inputClass} /></div>
                  <div><label className={labelClass}>Empresa</label>
                    <input type="text" value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Cargo</label>
                    <input type="text" value={form.position || ""} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Cidade</label>
                    <input type="text" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} /></div>
                  <div><label className={labelClass}>Estado</label>
                    <select value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass}>
                      <option value="">Selecione...</option>
                      {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Status</label>
                    <select value={form.status || "ativo"} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className={inputClass}>
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Polo</label>
                    <select value={form.pole || ""} onChange={(e) => setForm({ ...form, pole: e.target.value || null })} className={inputClass}>
                      <option value="">Nenhum</option>
                      {poles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm transition-colors">Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !form.name}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Salvar" : "Criar Cliente"}
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
