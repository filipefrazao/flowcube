"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, X, Edit2, DollarSign, ChevronLeft, ChevronRight,
  Filter, Download, Trash2, Eye, ShoppingCart, CalendarDays, User,
  Package, CreditCard, ArrowUpDown, RotateCcw
} from "lucide-react";
import { saleApi, saleKpiApi, leadApi, productApi, pipelineApi, type Sale, type Lead, type Product, type SaleLineItem, type SaleKPIs, type Pipeline } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

/* ── Stage / Status configs ─────────────────────────────────────────── */
const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  negotiation: { label: "Negociando", color: "text-blue-400", bg: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  proposal:    { label: "Proposta",   color: "text-purple-400", bg: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  won:         { label: "Fechado",    color: "text-primary", bg: "bg-primary/20 text-primary border-primary/30" },
  lost:        { label: "Perdida",    color: "text-red-400", bg: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const PAYMENT_CONFIG: Record<string, { label: string; bg: string }> = {
  sem_pagamento: { label: "Sem Pagamento", bg: "bg-gray-500/20 text-text-secondary border-gray-500/30" },
  parcial:       { label: "Parcial",       bg: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  liquidado:     { label: "Liquidado",     bg: "bg-primary/20 text-primary border-primary/30" },
};

function formatBRL(v: string | number) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatDateISO(d: string) {
  if (!d) return "";
  return d.slice(0, 10);
}

const PAGE_SIZE = 20;

export default function SalesPage() {
  /* ── Data state ─────────────────────────────────────────────────── */
  const [sales, setSales] = useState<Sale[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [kpis, setKpis] = useState<SaleKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Filter state ───────────────────────────────────────────────── */
  const [showFilters, setShowFilters] = useState(false);
  const [filterStage, setFilterStage] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");

  /* ── Modal state ────────────────────────────────────────────────── */
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [form, setForm] = useState({ lead: "", total_value: "0", stage: "negotiation", notes: "" });
  const [lineItems, setLineItems] = useState<Array<{ product: string; quantity: number; unit_price: string }>>([]);
  const [saving, setSaving] = useState(false);

  /* ── Data fetching ──────────────────────────────────────────────── */
  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        page: String(currentPage),
      };
      if (filterStage) params.stage = filterStage;
      if (filterSearch) params.search = filterSearch;

      const [salesRes, kpiRes] = await Promise.all([
        saleApi.list(params),
        saleKpiApi.getKpis(),
      ]);

      const salesData = salesRes.data;
      setSales(salesData.results || salesData);
      setTotalCount(salesData.count || 0);
      setKpis(kpiRes.data);
    } catch (err) {
      console.error("Erro ao carregar vendas:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStage, filterSearch]);

  const fetchRefs = useCallback(async () => {
    try {
      const [leadsRes, productsRes, pipelinesRes] = await Promise.all([
        leadApi.list({ limit: "500" }),
        productApi.list({ limit: "500" }),
        pipelineApi.list(),
      ]);
      setLeads(leadsRes.data.results || leadsRes.data);
      setProducts(productsRes.data.results || productsRes.data);
      setPipelines(pipelinesRes.data.results || pipelinesRes.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchRefs(); }, [fetchRefs]);
  useEffect(() => { fetchSales(); }, [fetchSales]);

  /* ── Computed values ────────────────────────────────────────────── */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  /* ── Client-side secondary filters (date range, price range) ──── */
  const filtered = sales.filter((s) => {
    if (filterDateFrom) {
      const d = new Date(s.created_at);
      if (d < new Date(filterDateFrom)) return false;
    }
    if (filterDateTo) {
      const d = new Date(s.created_at);
      if (d > new Date(filterDateTo + "T23:59:59")) return false;
    }
    if (filterPriceMin && parseFloat(s.total_value) < parseFloat(filterPriceMin)) return false;
    if (filterPriceMax && parseFloat(s.total_value) > parseFloat(filterPriceMax)) return false;
    return true;
  });

  /* ── Modal handlers ─────────────────────────────────────────────── */
  const openCreateModal = () => {
    setEditingSale(null);
    setForm({ lead: "", total_value: "0", stage: "negotiation", notes: "" });
    setLineItems([]);
    setShowModal(true);
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setForm({
      lead: sale.lead || "",
      total_value: sale.total_value,
      stage: sale.stage,
      notes: sale.notes || "",
    });
    setLineItems(
      (sale.line_items || []).map((li) => ({
        product: li.product || "",
        quantity: li.quantity,
        unit_price: li.unit_price,
      }))
    );
    setShowModal(true);
  };

  const openDetailModal = (sale: Sale) => {
    setViewingSale(sale);
    setShowDetailModal(true);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { product: "", quantity: 1, unit_price: "0" }]);
  };

  const removeLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
    const total = updated.reduce((sum, li) => sum + parseFloat(li.unit_price || "0") * li.quantity, 0);
    setForm((f) => ({ ...f, total_value: total.toFixed(2) }));
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
    const total = updated.reduce((sum, li) => sum + parseFloat(li.unit_price || "0") * li.quantity, 0);
    setForm((f) => ({ ...f, total_value: total.toFixed(2) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingSale) {
        await saleApi.update(editingSale.id, form);
      } else {
        const res = await saleApi.create(form);
        const saleId = res.data.id;
        for (const li of lineItems) {
          if (li.product) {
            await saleApi.addLineItem(saleId, {
              product: li.product,
              quantity: li.quantity,
              unit_price: li.unit_price,
            });
          }
        }
      }
      setShowModal(false);
      fetchSales();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta venda?")) return;
    try {
      await saleApi.delete(id);
      fetchSales();
    } catch (err) {
      console.error(err);
    }
  };

  const clearFilters = () => {
    setFilterStage("");
    setFilterSearch("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterPriceMin("");
    setFilterPriceMax("");
    setCurrentPage(1);
  };

  const hasActiveFilters = filterStage || filterSearch || filterDateFrom || filterDateTo || filterPriceMin || filterPriceMax;

  /* ── KPI Cards ──────────────────────────────────────────────────── */
  const kpiCards = kpis ? [
    { label: "Total Vendas", value: String(kpis.summary.total_sales), icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Receita Total", value: formatBRL(kpis.summary.total_amount), icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { label: "Ticket Medio", value: formatBRL(kpis.summary.average_ticket), icon: CreditCard, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Taxa Conversao", value: `${kpis.summary.conversion_rate.toFixed(1)}%`, icon: ArrowUpDown, color: "text-amber-400", bg: "bg-amber-500/10" },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" />
            Vendas
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {totalCount} vendas registradas
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Nova Venda
        </button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi, i) => (
            <div key={i} className="bg-surface/80 border border-border/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-secondary font-medium uppercase tracking-wide">{kpi.label}</span>
                <div className={cn("p-2 rounded-lg", kpi.bg)}>
                  <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                </div>
              </div>
              <p className={cn("text-xl font-bold", kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters Bar ─────────────────────────────────────────── */}
      <div className="bg-surface/80 border border-border/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
        {/* Primary row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por lead, produto, notas..."
              value={filterSearch}
              onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-background-secondary/80 border border-border rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
          <select
            value={filterStage}
            onChange={(e) => { setFilterStage(e.target.value); setCurrentPage(1); }}
            className="bg-background-secondary/80 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:border-primary transition-all"
          >
            <option value="">Todos os Status</option>
            {Object.entries(STAGE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
              showFilters
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-background-secondary/80 border-border text-text-secondary hover:text-text-primary"
            )}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/50">
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Data Criacao De</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Data Criacao Ate</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Valor Minimo (R$)</label>
              <input type="number" placeholder="0,00" value={filterPriceMin} onChange={(e) => setFilterPriceMin(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Valor Maximo (R$)</label>
              <input type="number" placeholder="0,00" value={filterPriceMax} onChange={(e) => setFilterPriceMax(e.target.value)} className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-surface/80 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left bg-background-secondary/50">
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Lead / Cliente</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Produto(s)</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Valor (R$)</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Itens</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Data Criacao</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Fechamento</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide w-24">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => {
                  const stageConfig = STAGE_CONFIG[sale.stage] || STAGE_CONFIG.negotiation;
                  const productNames = (sale.line_items || []).map((li) => li.product_name).filter(Boolean);
                  return (
                    <tr key={sale.id} className="border-b border-border/30 hover:bg-surface-hover/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-text-primary font-medium truncate max-w-[160px]">
                            {sale.lead_name || "Sem lead"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5 max-w-[200px]">
                          {productNames.length > 0 ? (
                            productNames.slice(0, 2).map((name, i) => (
                              <span key={i} className="text-xs text-text-primary truncate">{name}</span>
                            ))
                          ) : (
                            <span className="text-xs text-text-muted">-</span>
                          )}
                          {productNames.length > 2 && (
                            <span className="text-[10px] text-primary">+{productNames.length - 2} mais</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-primary font-semibold">{formatBRL(sale.total_value)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border", stageConfig.bg)}>
                          {stageConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-secondary bg-surface-hover/50 px-2 py-0.5 rounded">
                          {sale.line_items?.length || 0} {(sale.line_items?.length || 0) === 1 ? "item" : "itens"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{formatDate(sale.created_at)}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{formatDate(sale.closed_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetailModal(sale)} className="p-1.5 text-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all" title="Detalhes">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(sale)} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(sale.id)} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <ShoppingCart className="w-10 h-10 text-text-secondary mx-auto mb-3" />
                      <p className="text-text-muted">Nenhuma venda encontrada</p>
                      <p className="text-text-muted text-xs mt-1">Tente ajustar os filtros ou crie uma nova venda</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <span className="text-xs text-text-muted">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-surface-hover/50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded text-xs font-medium transition-all",
                        currentPage === pageNum
                          ? "bg-primary text-gray-900"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-hover/50"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-surface-hover/50 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────── */}
      {showDetailModal && viewingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Detalhes da Venda
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface-hover/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-background-secondary/60 rounded-lg p-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wide block mb-1">Lead / Cliente</span>
                <span className="text-sm text-text-primary font-medium">{viewingSale.lead_name || "Sem lead"}</span>
              </div>
              <div className="bg-background-secondary/60 rounded-lg p-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wide block mb-1">Valor Total</span>
                <span className="text-sm text-primary font-bold">{formatBRL(viewingSale.total_value)}</span>
              </div>
              <div className="bg-background-secondary/60 rounded-lg p-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wide block mb-1">Status</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", (STAGE_CONFIG[viewingSale.stage] || STAGE_CONFIG.negotiation).bg)}>
                  {(STAGE_CONFIG[viewingSale.stage] || STAGE_CONFIG.negotiation).label}
                </span>
              </div>
              <div className="bg-background-secondary/60 rounded-lg p-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wide block mb-1">Fechamento</span>
                <span className="text-sm text-text-primary">{formatDate(viewingSale.closed_at)}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-4">
              <h3 className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-3">Itens da Venda</h3>
              {(viewingSale.line_items || []).length > 0 ? (
                <div className="space-y-2">
                  {viewingSale.line_items!.map((li) => (
                    <div key={li.id} className="flex items-center justify-between bg-background-secondary/60 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-primary">{li.product_name || "Produto"}</span>
                        <span className="text-[10px] text-text-muted">x{li.quantity}</span>
                      </div>
                      <span className="text-sm text-primary font-medium">{formatBRL(li.subtotal)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-4">Nenhum item registrado</p>
              )}
            </div>

            {/* Notes */}
            {viewingSale.notes && (
              <div className="bg-background-secondary/60 rounded-lg p-3 mb-4">
                <span className="text-[10px] text-text-muted uppercase tracking-wide block mb-1">Observacoes</span>
                <p className="text-sm text-text-primary">{viewingSale.notes}</p>
              </div>
            )}

            <div className="text-[10px] text-text-muted text-right">
              Criado em {formatDate(viewingSale.created_at)}
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                {editingSale ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                {editingSale ? "Editar Venda" : "Nova Venda"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface-hover/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Lead */}
              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Lead / Cliente</label>
                <select value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} className="w-full bg-background-secondary border border-border text-text-primary rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all">
                  <option value="">Sem lead vinculado</option>
                  {leads.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </select>
              </div>

              {/* Stage */}
              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Status da Venda</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(STAGE_CONFIG).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setForm({ ...form, stage: k })}
                      className={cn(
                        "text-xs py-2 px-2 rounded-lg border font-medium transition-all text-center",
                        form.stage === k ? v.bg : "bg-background-secondary border-border text-text-muted hover:border-border"
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] text-text-secondary font-medium uppercase tracking-wide">Itens da Venda</label>
                  <button onClick={addLineItem} className="text-xs text-primary hover:text-primary flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Adicionar item
                  </button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((li, i) => (
                    <div key={i} className="flex items-center gap-2 bg-background-secondary/60 rounded-lg p-2.5">
                      <select
                        value={li.product}
                        onChange={(e) => {
                          updateLineItem(i, "product", e.target.value);
                          const p = products.find((p) => p.id === e.target.value);
                          if (p) updateLineItem(i, "unit_price", p.price);
                        }}
                        className="flex-1 bg-background-secondary border border-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:border-primary transition-all"
                      >
                        <option value="">Selecionar produto</option>
                        {products.map((p) => (<option key={p.id} value={p.id}>{p.name} - {formatBRL(p.price)}</option>))}
                      </select>
                      <input
                        type="number" min={1} value={li.quantity}
                        onChange={(e) => updateLineItem(i, "quantity", parseInt(e.target.value) || 1)}
                        className="w-16 bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary text-center focus:border-primary transition-all"
                        title="Quantidade"
                      />
                      <input
                        type="number" step="0.01" value={li.unit_price}
                        onChange={(e) => updateLineItem(i, "unit_price", e.target.value)}
                        className="w-24 bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:border-primary transition-all"
                        placeholder="Preco"
                      />
                      <span className="text-xs text-text-secondary w-20 text-right font-medium">
                        {formatBRL((parseFloat(li.unit_price || "0") * li.quantity).toString())}
                      </span>
                      <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {lineItems.length === 0 && (
                    <p className="text-xs text-text-muted text-center py-3">Nenhum item adicionado</p>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-background-secondary rounded-lg px-4 py-3 border border-border/50">
                <span className="text-sm text-text-secondary font-medium">Total da Venda</span>
                <span className="text-xl font-bold text-primary">{formatBRL(form.total_value)}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Observacoes</label>
                <textarea
                  placeholder="Adicione notas sobre esta venda..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover/50 transition-all">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
              >
                {saving ? "Salvando..." : "Salvar Venda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
