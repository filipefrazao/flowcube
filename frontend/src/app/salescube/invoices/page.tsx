"use client";

import { useState, useEffect, useCallback } from "react";
import { Receipt, Plus, DollarSign, Clock, CheckCircle, AlertTriangle, Search, X, Trash2, Eye, Filter, RotateCcw } from "lucide-react";
import { invoiceApi, leadApi, productApi, type Invoice, type InvoiceItemType, type Lead, type Product, type InvoiceSummary } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; strikethrough?: boolean }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-text-secondary" },
  sent: { label: "Enviada", color: "bg-blue-500/20 text-blue-400" },
  paid: { label: "Paga", color: "bg-green-500/20 text-green-400" },
  overdue: { label: "Vencida", color: "bg-red-500/20 text-red-400" },
  cancelled: { label: "Cancelada", color: "bg-gray-500/20 text-text-muted", strikethrough: true },
};

function formatCurrency(v: string | number) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterValueMin, setFilterValueMin] = useState("");
  const [filterValueMax, setFilterValueMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = !!(filterDateFrom || filterDateTo || filterValueMin || filterValueMax);
  const clearFilters = () => { setFilterDateFrom(""); setFilterDateTo(""); setFilterValueMin(""); setFilterValueMax(""); };

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ lead: "", issue_date: todayStr(), due_date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newItem, setNewItem] = useState({ product: "", description: "", quantity: 1, unit_price: "0" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;

      const [invRes, leadRes, prodRes, sumRes] = await Promise.all([
        invoiceApi.list(params),
        leadApi.list(),
        productApi.list(),
        invoiceApi.summary(),
      ]);
      setInvoices(invRes.data.results || invRes.data);
      setLeads(leadRes.data.results || leadRes.data);
      setProducts(prodRes.data.results || prodRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error("Erro ao carregar faturas:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Summary helpers ---
  const statusCount = (st: string) => summary?.by_status.find((s) => s.status === st)?.count ?? 0;
  const statusTotal = (st: string) => summary?.by_status.find((s) => s.status === st)?.total ?? 0;

  // --- Create invoice ---
  const handleCreate = async () => {
    if (!createForm.due_date) return;
    setSaving(true);
    try {
      await invoiceApi.create({
        lead: createForm.lead || null,
        issue_date: createForm.issue_date,
        due_date: createForm.due_date,
        notes: createForm.notes,
      });
      setShowCreateModal(false);
      setCreateForm({ lead: "", issue_date: todayStr(), due_date: "", notes: "" });
      fetchData();
    } catch (err) {
      console.error("Erro ao criar fatura:", err);
    } finally {
      setSaving(false);
    }
  };

  // --- Detail modal ---
  const openDetail = async (invoice: Invoice) => {
    try {
      const res = await invoiceApi.get(invoice.id);
      setSelectedInvoice(res.data);
      setNewItem({ product: "", description: "", quantity: 1, unit_price: "0" });
      setShowDetailModal(true);
    } catch (err) {
      console.error("Erro ao carregar fatura:", err);
    }
  };

  const handleAddItem = async () => {
    if (!selectedInvoice || (!newItem.product && !newItem.description)) return;
    try {
      const res = await invoiceApi.addItem(selectedInvoice.id, {
        product: newItem.product || null,
        description: newItem.description || products.find((p) => p.id === newItem.product)?.name || "Item",
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
      });
      setSelectedInvoice(res.data);
      setNewItem({ product: "", description: "", quantity: 1, unit_price: "0" });
      fetchData();
    } catch (err) {
      console.error("Erro ao adicionar item:", err);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedInvoice) return;
    try {
      const res = await invoiceApi.removeItem(selectedInvoice.id, itemId);
      setSelectedInvoice(res.data);
      fetchData();
    } catch (err) {
      console.error("Erro ao remover item:", err);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedInvoice) return;
    try {
      const res = await invoiceApi.markPaid(selectedInvoice.id);
      setSelectedInvoice(res.data);
      fetchData();
    } catch (err) {
      console.error("Erro ao marcar como paga:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta fatura?")) return;
    try {
      await invoiceApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir fatura:", err);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filterDateFrom && inv.issue_date && inv.issue_date < filterDateFrom) return false;
    if (filterDateTo && inv.due_date && inv.due_date > filterDateTo) return false;
    const total = parseFloat(inv.total || "0");
    if (filterValueMin && total < parseFloat(filterValueMin)) return false;
    if (filterValueMax && total > parseFloat(filterValueMax)) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" /> Faturas
          </h1>
          <p className="text-sm text-text-secondary mt-1">{filteredInvoices.length} faturas encontradas</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Nova Fatura
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg"><Receipt className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-xs text-text-secondary">Total Faturas</p>
              <p className="text-xl font-bold text-text-primary">{summary?.total_invoices ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg"><DollarSign className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-xs text-text-secondary">Total Valor</p>
              <p className="text-xl font-bold text-text-primary">{formatCurrency(summary?.total_value ?? 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg"><CheckCircle className="w-5 h-5 text-green-400" /></div>
            <div>
              <p className="text-xs text-text-secondary">Pagas</p>
              <p className="text-xl font-bold text-text-primary">{statusCount("paid")} <span className="text-sm font-normal text-text-muted">({formatCurrency(statusTotal("paid"))})</span></p>
            </div>
          </div>
        </div>
        <div className="bg-background-secondary border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-text-secondary">Vencidas</p>
              <p className="text-xl font-bold text-text-primary">{summary?.overdue_count ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface/80 border border-border/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Buscar por numero..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background-secondary/80 border border-border rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-background-secondary/80 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:border-primary transition-all">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
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
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Emissao De</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Vencimento Ate</label>
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
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-background-secondary border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-text-secondary font-medium">Numero</th>
                  <th className="px-4 py-3 text-text-secondary font-medium">Lead / Contato</th>
                  <th className="px-4 py-3 text-text-secondary font-medium">Status</th>
                  <th className="px-4 py-3 text-text-secondary font-medium">Emissao</th>
                  <th className="px-4 py-3 text-text-secondary font-medium">Vencimento</th>
                  <th className="px-4 py-3 text-text-secondary font-medium">Total</th>
                  <th className="px-4 py-3 text-text-secondary font-medium w-24">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                  return (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-surface-hover/40 transition-colors">
                      <td className="px-4 py-3 text-text-primary font-mono font-medium">#{inv.number}</td>
                      <td className="px-4 py-3 text-text-primary">{inv.lead_name || inv.contact_name || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", sc.color, sc.strikethrough && "line-through")}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(inv.issue_date)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-text-secondary", inv.status === "overdue" && "text-red-400 font-medium")}>{formatDate(inv.due_date)}</span>
                      </td>
                      <td className="px-4 py-3 text-primary font-semibold">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetail(inv)} title="Ver detalhes" className="p-1.5 text-text-muted hover:text-primary transition-colors"><Eye className="w-4 h-4" /></button>
                          {inv.status !== "paid" && inv.status !== "cancelled" && (
                            <button onClick={async () => { await invoiceApi.markPaid(inv.id); fetchData(); }} title="Marcar como paga" className="p-1.5 text-text-muted hover:text-green-400 transition-colors"><CheckCircle className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => handleDelete(inv.id)} title="Excluir" className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-text-muted">Nenhuma fatura encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateModal(false)}>
          <div className="bg-background-secondary border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary">Nova Fatura</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Lead</label>
                <select value={createForm.lead} onChange={(e) => setCreateForm({ ...createForm, lead: e.target.value })} className="w-full bg-background border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="">Selecionar lead (opcional)</option>
                  {leads.map((l) => (<option key={l.id} value={l.id}>{l.name}{l.company ? ` - ${l.company}` : ""}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Data de Emissao</label>
                  <input type="date" value={createForm.issue_date} onChange={(e) => setCreateForm({ ...createForm, issue_date: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Vencimento *</label>
                  <input type="date" value={createForm.due_date} onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Observacoes</label>
                <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} rows={3} placeholder="Notas ou observacoes..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={!createForm.due_date || saving} className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-text-primary rounded-lg text-sm transition-colors">{saving ? "Salvando..." : "Criar Fatura"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDetailModal(false)}>
          <div className="bg-background-secondary border border-border rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Fatura #{selectedInvoice.number}</h2>
                <p className="text-xs text-text-secondary mt-0.5">{selectedInvoice.lead_name || selectedInvoice.contact_name || "Sem lead vinculado"}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedInvoice.status !== "paid" && selectedInvoice.status !== "cancelled" && (
                  <button onClick={handleMarkPaid} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-text-primary rounded-lg text-xs font-medium transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Marcar como Paga
                  </button>
                )}
                <button onClick={() => setShowDetailModal(false)} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Status</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", STATUS_CONFIG[selectedInvoice.status]?.color)}>{STATUS_CONFIG[selectedInvoice.status]?.label}</span>
              </div>
              <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Emissao</p>
                <p className="text-sm text-text-primary mt-1">{formatDate(selectedInvoice.issue_date)}</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Vencimento</p>
                <p className={cn("text-sm mt-1", selectedInvoice.status === "overdue" ? "text-red-400 font-medium" : "text-text-primary")}>{formatDate(selectedInvoice.due_date)}</p>
              </div>
              <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Total</p>
                <p className="text-sm text-primary font-bold mt-1">{formatCurrency(selectedInvoice.total)}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" /> Itens da Fatura
              </h3>
              <div className="bg-background border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-3 py-2 text-text-muted font-medium text-xs">Descricao</th>
                      <th className="px-3 py-2 text-text-muted font-medium text-xs text-center">Qtd</th>
                      <th className="px-3 py-2 text-text-muted font-medium text-xs text-right">Preco Unit.</th>
                      <th className="px-3 py-2 text-text-muted font-medium text-xs text-right">Subtotal</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="px-3 py-2 text-text-primary">{item.product_name || item.description}</td>
                        <td className="px-3 py-2 text-text-secondary text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-text-secondary text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2 text-primary text-right font-medium">{formatCurrency(item.subtotal)}</td>
                        <td className="px-3 py-2">
                          {selectedInvoice.status === "draft" && (
                            <button onClick={() => handleRemoveItem(item.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {selectedInvoice.items.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-text-muted text-xs">Nenhum item adicionado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{formatCurrency(selectedInvoice.subtotal)}</span></div>
                {parseFloat(selectedInvoice.discount) > 0 && <div className="flex justify-between text-text-secondary"><span>Desconto</span><span className="text-red-400">-{formatCurrency(selectedInvoice.discount)}</span></div>}
                {parseFloat(selectedInvoice.tax) > 0 && <div className="flex justify-between text-text-secondary"><span>Impostos</span><span>+{formatCurrency(selectedInvoice.tax)}</span></div>}
                <div className="flex justify-between text-text-primary font-bold border-t border-border pt-1"><span>Total</span><span className="text-primary">{formatCurrency(selectedInvoice.total)}</span></div>
              </div>
            </div>

            {/* Add Item (only for draft) */}
            {selectedInvoice.status === "draft" && (
              <div className="bg-background border border-border rounded-lg p-4">
                <h4 className="text-xs text-text-secondary font-medium mb-3">Adicionar Item</h4>
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] text-text-muted mb-1 block">Produto</label>
                    <select value={newItem.product} onChange={(e) => {
                      const p = products.find((pr) => pr.id === e.target.value);
                      setNewItem({ ...newItem, product: e.target.value, description: p?.name || "", unit_price: p?.price || "0" });
                    }} className="w-full bg-background-secondary border border-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:border-primary focus:outline-none">
                      <option value="">Selecionar produto</option>
                      {products.filter((p) => p.active).map((p) => (<option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] text-text-muted mb-1 block">Qtd</label>
                    <input type="number" min={1} value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })} className="w-full bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary text-center focus:border-primary focus:outline-none" />
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] text-text-muted mb-1 block">Preco</label>
                    <input type="number" step="0.01" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} className="w-full bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none" />
                  </div>
                  <button onClick={handleAddItem} disabled={!newItem.product && !newItem.description} className="px-3 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-text-primary rounded-lg text-xs font-medium transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedInvoice.notes && (
              <div className="mt-4 bg-background border border-border rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Observacoes</p>
                <p className="text-sm text-text-primary">{selectedInvoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
