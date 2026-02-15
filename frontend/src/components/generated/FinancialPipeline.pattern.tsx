/**
 * REFERENCE PATTERN: v0 Pipeline Financial Component
 * Used in: /salescube/financial/page.tsx
 *
 * Key design patterns for financial dashboards with pipeline stages.
 */

// ============================================================================
// Pattern: Stage Configuration Map
// ============================================================================

const STAGE_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  text: string;
}> = {
  prospecting: {
    label: "Prospeccao",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
  },
  qualification: {
    label: "Qualificacao",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
  },
  proposal: {
    label: "Proposta",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
  },
  negotiation: {
    label: "Negociacao",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
  },
  won: {
    label: "Ganhas",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-400",
  },
  lost: {
    label: "Perdidas",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
  },
};

// ============================================================================
// Pattern: BRL Currency Formatter
// ============================================================================

function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

// ============================================================================
// Pattern: KPI Cards Row (Financial)
// ============================================================================

/*
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <KpiCard
    icon={<DollarSign />}
    label="Receita Total"
    value={formatBRL(overview.total_revenue)}
    trend={`+${overview.growth_pct}%`}
    trendUp={true}
    color="text-green-400"
    bg="bg-green-400/10"
  />
  <KpiCard
    icon={<ShoppingCart />}
    label="Total de Vendas"
    value={overview.total_sales}
    color="text-blue-400"
    bg="bg-blue-400/10"
  />
  <KpiCard
    icon={<TrendingUp />}
    label="Ticket Medio"
    value={formatBRL(overview.avg_ticket)}
    color="text-purple-400"
    bg="bg-purple-400/10"
  />
  <KpiCard
    icon={<TrendingDown />}
    label="Taxa de Conversao"
    value={`${overview.conversion_rate}%`}
    color="text-orange-400"
    bg="bg-orange-400/10"
  />
</div>
*/

// ============================================================================
// Pattern: Pipeline Stage Overview (Horizontal Cards)
// ============================================================================

/*
<div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
  {Object.entries(STAGE_CONFIG).map(([key, config]) => {
    const stageData = overview.by_stage?.[key] || { count: 0, total: 0 };
    return (
      <button
        key={key}
        onClick={() => setStageFilter(key)}
        className={cn(
          "p-3 rounded-lg border transition-all",
          config.bg, config.border,
          stageFilter === key && "ring-2 ring-primary"
        )}
      >
        <p className={cn("text-lg font-bold", config.text)}>{stageData.count}</p>
        <p className="text-xs text-text-muted">{config.label}</p>
        <p className={cn("text-xs font-medium mt-1", config.text)}>
          {formatBRL(stageData.total)}
        </p>
      </button>
    );
  })}
</div>
*/

// ============================================================================
// Pattern: Paginated Sales Table with Sort + Filter
// ============================================================================

/*
Key state variables:
- sortField: "created_at" | "total" | "product_name"
- sortDir: "asc" | "desc"
- stageFilter: string (from STAGE_CONFIG keys)
- page: number
- pageSize: number (default 20)

Sort handler:
function handleSort(field: string) {
  if (sortField === field) {
    setSortDir(d => d === "asc" ? "desc" : "asc");
  } else {
    setSortField(field);
    setSortDir("desc");
  }
}

Table header with sort indicator:
<th onClick={() => handleSort("total")} className="cursor-pointer">
  Valor
  {sortField === "total" && (sortDir === "asc" ? <ChevronUp /> : <ChevronDown />)}
</th>

Pagination:
<div className="flex items-center justify-between">
  <span>Mostrando {start+1}-{end} de {total}</span>
  <div className="flex gap-1">
    <button onClick={() => setPage(1)}><ChevronsLeft /></button>
    <button onClick={() => setPage(p => Math.max(1, p-1))}><ChevronLeft /></button>
    <button onClick={() => setPage(p => Math.min(maxPage, p+1))}><ChevronRight /></button>
    <button onClick={() => setPage(maxPage)}><ChevronsRight /></button>
  </div>
</div>
*/

export { STAGE_CONFIG, formatBRL };
