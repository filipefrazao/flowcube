"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  ExternalLink,
  Package,
  Users,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";
import {
  financialApi,
  saleApi,
  saleKpiApi,
  productApi,
  type FinancialOverview,
  type Sale,
  type SaleKPIs,
  type Product,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ============================================================================
// Helpers
// ============================================================================

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function shortId(uuid: string): string {
  return uuid.slice(0, 8).toUpperCase();
}

// Stage config
const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; text: string }> = {
  negotiation: {
    label: "Em Negociacao",
    color: "bg-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
  },
  proposal: {
    label: "Proposta",
    color: "bg-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
  },
  won: {
    label: "Aprovada",
    color: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
  },
  lost: {
    label: "Cancelada",
    color: "bg-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
  },
};

// Pipeline mapping: group stages into Backlog / Doing / Done
const PIPELINE_MAP = {
  backlog: { stages: ["negotiation", "proposal"], label: "Backlog / Em Negociacao", color: "amber" },
  doing: { stages: [] as string[], label: "Doing / Aguardando Aprovacao", color: "blue" },
  done: { stages: ["won"], label: "Done / Aprovadas", color: "emerald" },
};

// ============================================================================
// Skeleton
// ============================================================================

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-700/50", className)} />;
}

function PipelineCardSkeleton() {
  return (
    <div className="border border-gray-700 rounded-xl p-5 space-y-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// ============================================================================
// Badge component
// ============================================================================

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage] || { label: stage, bg: "bg-gray-500/10", border: "border-gray-500/30", text: "text-gray-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", cfg.bg, cfg.border, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.color)} />
      {cfg.label}
    </span>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function FinancialPage() {
  // Data state
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [kpis, setKpis] = useState<SaleKPIs | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Pipeline sales for cards
  const [negotiationSales, setNegotiationSales] = useState<Sale[]>([]);
  const [wonSales, setWonSales] = useState<Sale[]>([]);
  const [lostSales, setLostSales] = useState<Sale[]>([]);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterPipeline, setFilterPipeline] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterClosedFrom, setFilterClosedFrom] = useState("");
  const [filterClosedTo, setFilterClosedTo] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Inline edit
  const [editingSale, setEditingSale] = useState<string | null>(null);
  const [editStage, setEditStage] = useState("");

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchOverview = useCallback(async () => {
    try {
      const [ovRes, kpiRes] = await Promise.all([
        financialApi.overview(),
        saleKpiApi.getKpis(),
      ]);
      setOverview(ovRes.data);
      setKpis(kpiRes.data);
    } catch (err) {
      console.error("Failed to fetch overview:", err);
    }
  }, []);

  const fetchPipelineSales = useCallback(async () => {
    try {
      const [negRes, wonRes, lostRes] = await Promise.all([
        saleApi.list({ stage: "negotiation", limit: "10", ordering: "-total_value" }),
        saleApi.list({ stage: "won", limit: "10", ordering: "-total_value" }),
        saleApi.list({ stage: "lost", limit: "10", ordering: "-total_value" }),
      ]);
      setNegotiationSales(negRes.data.results || []);
      setWonSales(wonRes.data.results || []);
      setLostSales(lostRes.data.results || []);
    } catch (err) {
      console.error("Failed to fetch pipeline sales:", err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productApi.list({ limit: "200" });
      setProducts(res.data.results || []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    setTableLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(pageSize),
        page: String(page),
        ordering: "-created_at",
      };
      if (search) params.search = search;
      if (filterStage) params.stage = filterStage;
      if (filterProduct) params.product = filterProduct;
      if (filterDateFrom) params.created_at_after = filterDateFrom;
      if (filterDateTo) params.created_at_before = filterDateTo;
      if (filterClosedFrom) params.closed_at_after = filterClosedFrom;
      if (filterClosedTo) params.closed_at_before = filterClosedTo;
      if (filterPriceMin) params.total_value_min = filterPriceMin;
      if (filterPriceMax) params.total_value_max = filterPriceMax;

      const res = await saleApi.list(params);
      let results: Sale[] = res.data.results || [];
      const count = res.data.count || 0;

      // Client-side filters for fields not supported by backend
      if (filterClient) {
        const q = filterClient.toLowerCase();
        results = results.filter((s) => s.lead_name?.toLowerCase().includes(q));
      }
      if (filterPipeline) {
        const stages = filterPipeline === "backlog" ? ["negotiation", "proposal"] : filterPipeline === "done" ? ["won"] : [];
        if (stages.length > 0) {
          results = results.filter((s) => stages.includes(s.stage));
        }
      }

      setSales(results);
      setTotalSales(count);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    } finally {
      setTableLoading(false);
    }
  }, [page, pageSize, search, filterStage, filterProduct, filterClient, filterPipeline, filterDateFrom, filterDateTo, filterClosedFrom, filterClosedTo, filterPriceMin, filterPriceMax]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchPipelineSales(), fetchProducts()]);
      setLoading(false);
    };
    init();
  }, [fetchOverview, fetchPipelineSales, fetchProducts]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Debounced search
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
    }, 400);
  };

  // ============================================================================
  // Inline Edit
  // ============================================================================

  const handleInlineEdit = async (saleId: string) => {
    if (!editStage) return;
    try {
      await saleApi.update(saleId, { stage: editStage } as any);
      setEditingSale(null);
      setEditStage("");
      // Refresh data
      fetchSales();
      fetchOverview();
      fetchPipelineSales();
    } catch (err) {
      console.error("Failed to update sale:", err);
    }
  };

  // ============================================================================
  // Filter Reset
  // ============================================================================

  const hasActiveFilters = search || filterStage || filterPipeline || filterProduct || filterClient || filterDateFrom || filterDateTo || filterClosedFrom || filterClosedTo || filterPriceMin || filterPriceMax;

  const resetFilters = () => {
    setSearch("");
    setFilterStage("");
    setFilterPipeline("");
    setFilterProduct("");
    setFilterClient("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterClosedFrom("");
    setFilterClosedTo("");
    setFilterPriceMin("");
    setFilterPriceMax("");
    setPage(1);
  };

  // ============================================================================
  // Pagination
  // ============================================================================

  const totalPages = Math.ceil(totalSales / pageSize);

  // ============================================================================
  // Pipeline Totals (from KPIs)
  // ============================================================================

  const pipelineTotals = useMemo(() => {
    if (!kpis) return { backlog: { count: 0, total: 0 }, doing: { count: 0, total: 0 }, done: { count: 0, total: 0 }, grand: 0 };
    const neg = kpis.by_stage?.negotiation || { count: 0, total_amount: 0 };
    const prop = kpis.by_stage?.proposal || { count: 0, total_amount: 0 };
    const won = kpis.by_stage?.won || { count: 0, total_amount: 0 };
    return {
      backlog: { count: neg.count + prop.count, total: neg.total_amount + prop.total_amount },
      doing: { count: 0, total: 0 },
      done: { count: won.count, total: won.total_amount },
      grand: neg.total_amount + prop.total_amount + won.total_amount,
    };
  }, [kpis]);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PipelineCardSkeleton />
          <PipelineCardSkeleton />
          <PipelineCardSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Financeiro
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Pipeline financeira e gestao de vendas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchOverview();
              fetchPipelineSales();
              fetchSales();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Pipeline Total Header                                              */}
      {/* ================================================================== */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Pipeline Total</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Vendas Ativas</p>
              <p className="text-2xl font-bold text-white">
                {(pipelineTotals.backlog.count + pipelineTotals.done.count).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="w-px h-10 bg-gray-700" />
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Valor Total</p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatBRL(pipelineTotals.grand)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Pipeline Visual - 3 Columns                                        */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Backlog / Em Negociacao */}
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-amber-500/20 bg-amber-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <h3 className="font-semibold text-amber-300">Backlog / Em Negociacao</h3>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                {pipelineTotals.backlog.count}
              </span>
            </div>
            <p className="text-xl font-bold text-amber-400 mt-2">{formatBRL(pipelineTotals.backlog.total)}</p>
          </div>
          <div className="divide-y divide-amber-500/10 max-h-[320px] overflow-y-auto">
            {negotiationSales.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Nenhuma venda em negociacao</div>
            ) : (
              negotiationSales.map((sale) => (
                <div key={sale.id} className="p-3 hover:bg-amber-500/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {sale.lead_name || "Sem cliente"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sale.line_items?.map((li) => li.product_name).join(", ") || "Sem produto"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-amber-400 whitespace-nowrap ml-3">
                      {formatBRL(parseFloat(sale.total_value))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Doing / Aguardando Aprovacao */}
        <div className="border border-blue-500/30 bg-blue-500/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-blue-500/20 bg-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <h3 className="font-semibold text-blue-300">Doing / Aguardando Aprovacao</h3>
              </div>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                {pipelineTotals.doing.count}
              </span>
            </div>
            <p className="text-xl font-bold text-blue-400 mt-2">{formatBRL(pipelineTotals.doing.total)}</p>
          </div>
          <div className="divide-y divide-blue-500/10 max-h-[320px] overflow-y-auto">
            <div className="p-4 text-center text-gray-500 text-sm">
              Nenhuma venda aguardando aprovacao
            </div>
          </div>
        </div>

        {/* Done / Aprovadas */}
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-emerald-500/20 bg-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <h3 className="font-semibold text-emerald-300">Done / Aprovadas</h3>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                {pipelineTotals.done.count}
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-400 mt-2">{formatBRL(pipelineTotals.done.total)}</p>
          </div>
          <div className="divide-y divide-emerald-500/10 max-h-[320px] overflow-y-auto">
            {wonSales.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Nenhuma venda aprovada</div>
            ) : (
              wonSales.map((sale) => (
                <div key={sale.id} className="p-3 hover:bg-emerald-500/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {sale.lead_name || "Sem cliente"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sale.line_items?.map((li) => li.product_name).join(", ") || "Sem produto"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 whitespace-nowrap ml-3">
                      {formatBRL(parseFloat(sale.total_value))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* KPI Summary Cards                                                  */}
      {/* ================================================================== */}
      {kpis && overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Receita Total</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400">{formatBRL(overview.total_revenue)}</p>
          </div>
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Perdas / Canceladas</span>
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-400">{formatBRL(overview.total_refunds)}</p>
          </div>
          <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Receita Liquida</span>
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <p className={cn("text-xl font-bold", overview.net >= 0 ? "text-indigo-400" : "text-red-400")}>
              {formatBRL(overview.net)}
            </p>
          </div>
          <div className="border border-violet-500/20 bg-violet-500/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Ticket Medio</span>
              <ShoppingCart className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-xl font-bold text-violet-400">{formatBRL(kpis.summary.average_ticket)}</p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Filters Bar (Collapsible)                                          */}
      {/* ================================================================== */}
      <div className="border border-gray-700 rounded-xl bg-gray-800/50 overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Filtros</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </div>
          {showFilters ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showFilters && (
          <div className="px-5 pb-5 pt-2 border-t border-gray-700 space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Busca Geral */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Busca Geral</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Pesquisar vendas..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Status da Venda */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status da Venda</label>
                <select
                  value={filterStage}
                  onChange={(e) => { setFilterStage(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Todos</option>
                  <option value="negotiation">Em Negociacao</option>
                  <option value="proposal">Proposta</option>
                  <option value="won">Aprovada (Won)</option>
                  <option value="lost">Cancelada (Lost)</option>
                </select>
              </div>

              {/* Pipeline Financeira */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Pipeline Financeira</label>
                <select
                  value={filterPipeline}
                  onChange={(e) => { setFilterPipeline(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Todas</option>
                  <option value="backlog">Backlog (Negociacao)</option>
                  <option value="doing">Doing (Aguardando)</option>
                  <option value="done">Done (Aprovadas)</option>
                </select>
              </div>

              {/* Produto */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Produto</label>
                <select
                  value={filterProduct}
                  onChange={(e) => { setFilterProduct(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Todos</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Cliente */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Cliente</label>
                <input
                  type="text"
                  placeholder="Nome do cliente..."
                  value={filterClient}
                  onChange={(e) => { setFilterClient(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Data de Criacao */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data de Criacao (De)</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data de Criacao (Ate)</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Faixa de Preco Min */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preco Minimo (R$)</label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={filterPriceMin}
                  onChange={(e) => { setFilterPriceMin(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Data de Fechamento */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data de Fechamento (De)</label>
                <input
                  type="date"
                  value={filterClosedFrom}
                  onChange={(e) => { setFilterClosedFrom(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data de Fechamento (Ate)</label>
                <input
                  type="date"
                  value={filterClosedTo}
                  onChange={(e) => { setFilterClosedTo(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Faixa de Preco Max */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preco Maximo (R$)</label>
                <input
                  type="number"
                  placeholder="999.999"
                  value={filterPriceMax}
                  onChange={(e) => { setFilterPriceMax(e.target.value); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Linhas por pagina */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Linhas por Pagina</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Data Table                                                         */}
      {/* ================================================================== */}
      <div className="border border-gray-700 rounded-xl bg-gray-800/30 overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Todas as Vendas
            <span className="text-gray-500 font-normal ml-2">
              ({totalSales.toLocaleString("pt-BR")} resultados)
            </span>
          </h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Lead / Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Produto(s)</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Valor Total</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Pipeline</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Data Criacao</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Data Fechamento</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {tableLoading ? (
                Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    Nenhuma venda encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const value = parseFloat(sale.total_value);
                  const productNames = sale.line_items?.map((li) => li.product_name).filter(Boolean).join(", ") || "—";
                  const pipelineLabel =
                    sale.stage === "won" ? "Done" :
                    sale.stage === "lost" ? "Cancelada" :
                    sale.stage === "negotiation" || sale.stage === "proposal" ? "Backlog" : "—";
                  const pipelineColor =
                    sale.stage === "won" ? "text-emerald-400" :
                    sale.stage === "lost" ? "text-red-400" :
                    "text-amber-400";

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-gray-700/20 transition-colors"
                    >
                      {/* ID */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-500">
                          {shortId(sale.id)}
                        </span>
                      </td>

                      {/* Lead / Cliente */}
                      <td className="px-4 py-3">
                        {sale.lead ? (
                          <Link
                            href={`/salescube/leads?id=${sale.lead}`}
                            className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 transition-colors"
                          >
                            {sale.lead_name || "Sem nome"}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-500">Sem cliente</span>
                        )}
                      </td>

                      {/* Produto(s) */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-sm text-gray-300 truncate block" title={productNames}>
                          {productNames}
                        </span>
                      </td>

                      {/* Valor Total */}
                      <td className="px-4 py-3 text-right">
                        <span className={cn("text-sm font-semibold", value > 0 ? "text-emerald-400" : "text-gray-400")}>
                          {formatBRL(value)}
                        </span>
                      </td>

                      {/* Status (inline editable) */}
                      <td className="px-4 py-3 text-center">
                        {editingSale === sale.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <select
                              value={editStage}
                              onChange={(e) => setEditStage(e.target.value)}
                              className="bg-gray-900 border border-indigo-500 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
                              autoFocus
                            >
                              <option value="negotiation">Em Negociacao</option>
                              <option value="proposal">Proposta</option>
                              <option value="won">Aprovada</option>
                              <option value="lost">Cancelada</option>
                            </select>
                            <button
                              onClick={() => handleInlineEdit(sale.id)}
                              className="text-emerald-400 hover:text-emerald-300 text-xs px-1"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => { setEditingSale(null); setEditStage(""); }}
                              className="text-gray-500 hover:text-gray-400 text-xs px-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingSale(sale.id); setEditStage(sale.stage); }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            title="Clique para editar"
                          >
                            <StageBadge stage={sale.stage} />
                          </button>
                        )}
                      </td>

                      {/* Pipeline */}
                      <td className="px-4 py-3 text-center">
                        <span className={cn("text-xs font-medium", pipelineColor)}>
                          {pipelineLabel}
                        </span>
                      </td>

                      {/* Data Criacao */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-400">{formatDate(sale.created_at)}</span>
                      </td>

                      {/* Data Fechamento */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-400">{formatDate(sale.closed_at)}</span>
                      </td>

                      {/* Acoes */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          {sale.lead && (
                            <Link
                              href={`/salescube/leads?id=${sale.lead}`}
                              className="text-xs text-indigo-400 hover:text-indigo-300 px-1.5 py-0.5 rounded hover:bg-indigo-500/10 transition-colors"
                              title="Ver cliente"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          {sale.line_items && sale.line_items.length > 0 && sale.line_items[0].product && (
                            <Link
                              href={`/salescube/products`}
                              className="text-xs text-violet-400 hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-500/10 transition-colors"
                              title="Ver produto"
                            >
                              <Package className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-gray-500">
            Mostrando{" "}
            <span className="text-gray-300 font-medium">
              {totalSales > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>
            {" "}-{" "}
            <span className="text-gray-300 font-medium">
              {Math.min(page * pageSize, totalSales)}
            </span>
            {" "}de{" "}
            <span className="text-gray-300 font-medium">
              {totalSales.toLocaleString("pt-BR")}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400"
              title="Primeira pagina"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400"
              title="Pagina anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "w-8 h-8 rounded text-xs font-medium transition-colors",
                    page === pageNum
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:bg-gray-700"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400"
              title="Proxima pagina"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-gray-400"
              title="Ultima pagina"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
