"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Handshake,
  CheckCircle2,
  ShieldCheck,
  ShoppingCart,
  XCircle,
  Trophy,
  Medal,
  Filter,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { saleKpiApi, leadApi, type SaleKPIs, type LeadStats } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import dynamic from "next/dynamic";

// Lazy-load chart components (Recharts requires client-side rendering)
const LeadsPerDayChart = dynamic(() => import("@/components/salescube/dashboard/LeadsPerDayChart"), { ssr: false });
const LeadsPerStageChart = dynamic(() => import("@/components/salescube/dashboard/LeadsPerStageChart"), { ssr: false });
const ConversionChart = dynamic(() => import("@/components/salescube/dashboard/ConversionChart"), { ssr: false });
const LeadSourceChart = dynamic(() => import("@/components/salescube/dashboard/LeadSourceChart"), { ssr: false });
const TopAssigneesChart = dynamic(() => import("@/components/salescube/dashboard/TopAssigneesChart"), { ssr: false });

// ============================================================================
// Types
// ============================================================================

interface Squad {
  id: string;
  name: string;
}

interface BusinessUnit {
  id: string;
  name: string;
}

interface SellerRanking {
  name: string;
  photo?: string;
  count: number;
  total_amount: number;
}

interface DashboardFilters {
  squad: string;
  unidade_geradora: string;
  unidade_realizadora: string;
  status_pagamento: string;
  status: string;
  data_criacao_inicio: string;
  data_criacao_fim: string;
  data_fechamento_inicio: string;
  data_fechamento_fim: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(2).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace(".", ",")}K`;
  }
  return formatBRL(value);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getFirstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ============================================================================
// Skeleton Components
// ============================================================================

function SkeletonCard() {
  return (
    <div className="bg-surface/60 border border-border/50 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 bg-surface-hover rounded" />
        <div className="h-8 w-8 bg-surface-hover rounded-lg" />
      </div>
      <div className="h-6 w-16 bg-surface-hover rounded mb-2" />
      <div className="h-4 w-32 bg-surface-hover rounded mb-3" />
      <div className="h-2 w-full bg-surface-hover rounded-full" />
    </div>
  );
}

function SkeletonPodium() {
  return (
    <div className="bg-surface/60 border border-border/50 rounded-2xl p-6 animate-pulse">
      <div className="h-5 w-40 bg-surface-hover rounded mb-8 mx-auto" />
      <div className="flex items-end justify-center gap-4 h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-surface-hover rounded-full" />
          <div className="h-3 w-20 bg-surface-hover rounded" />
          <div className="w-24 h-32 bg-surface-hover rounded-t-lg" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 bg-surface-hover rounded-full" />
          <div className="h-3 w-24 bg-surface-hover rounded" />
          <div className="w-28 h-44 bg-surface-hover rounded-t-lg" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 bg-surface-hover rounded-full" />
          <div className="h-3 w-18 bg-surface-hover rounded" />
          <div className="w-22 h-24 bg-surface-hover rounded-t-lg" />
        </div>
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-surface/60 border border-border/50 rounded-2xl p-6 animate-pulse">
      <div className="h-5 w-36 bg-surface-hover rounded mb-6" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-border/30">
          <div className="h-4 w-6 bg-surface-hover rounded" />
          <div className="h-10 w-10 bg-surface-hover rounded-full" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-surface-hover rounded" />
          </div>
          <div className="h-4 w-12 bg-surface-hover rounded" />
          <div className="h-4 w-24 bg-surface-hover rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// KPI Card Component
// ============================================================================

interface KPICardProps {
  title: string;
  count: number;
  amount: number;
  percentage?: number;
  icon: React.ReactNode;
  color: "amber" | "green" | "blue" | "indigo" | "red";
  delay?: number;
}

const colorMap = {
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    text: "text-amber-400",
    bar: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  green: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    text: "text-primary",
    bar: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    text: "text-blue-400",
    bar: "bg-blue-500",
    glow: "shadow-blue-500/20",
  },
  indigo: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    text: "text-primary",
    bar: "bg-primary",
    glow: "shadow-primary/20",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    text: "text-red-400",
    bar: "bg-red-500",
    glow: "shadow-red-500/20",
  },
};

function KPICard({ title, count, amount, percentage, icon, color, delay = 0 }: KPICardProps) {
  const c = colorMap[color];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`${c.bg} ${c.border} border rounded-2xl p-5 transition-all duration-500 hover:shadow-lg ${c.glow} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">
          {title}
        </span>
        <div className={`${c.iconBg} p-2 rounded-lg`}>
          {icon}
        </div>
      </div>

      <div className="mb-1">
        <span className={`text-2xl font-bold ${c.text}`}>{count}</span>
        <span className="text-xs text-text-muted ml-2">vendas</span>
      </div>

      <div className="text-sm text-text-primary font-medium mb-3">
        {formatBRL(amount)}
      </div>

      {percentage !== undefined && (
        <div className="relative">
          <div className="w-full bg-surface-hover/50 rounded-full h-1.5">
            <div
              className={`${c.bar} h-1.5 rounded-full transition-all duration-1000 ease-out`}
              style={{ width: visible ? `${Math.min(percentage, 100)}%` : "0%" }}
            />
          </div>
          <span className="text-[10px] text-text-muted mt-1 block text-right">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Podium Component
// ============================================================================

function PodiumPosition({
  seller,
  position,
  height,
  avatarSize,
  delay,
}: {
  seller: SellerRanking | null;
  position: 1 | 2 | 3;
  height: string;
  avatarSize: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const podiumColors: Record<number, { bg: string; border: string; badge: string; text: string }> = {
    1: { bg: "bg-gradient-to-t from-yellow-600/30 to-yellow-500/10", border: "border-yellow-500/40", badge: "bg-yellow-500", text: "text-yellow-400" },
    2: { bg: "bg-gradient-to-t from-gray-500/30 to-gray-400/10", border: "border-gray-400/40", badge: "bg-gray-400", text: "text-text-primary" },
    3: { bg: "bg-gradient-to-t from-amber-700/30 to-amber-600/10", border: "border-amber-600/40", badge: "bg-amber-600", text: "text-amber-500" },
  };

  const pc = podiumColors[position];

  if (!seller) {
    return (
      <div className="flex flex-col items-center">
        <div className={`${avatarSize} rounded-full bg-surface-hover/50 border-2 border-border flex items-center justify-center`}>
          <Users className="w-5 h-5 text-text-muted" />
        </div>
        <p className="text-xs text-text-muted mt-2">---</p>
        <div
          className={`w-24 sm:w-28 ${pc.bg} ${pc.border} border rounded-t-xl mt-3 flex items-center justify-center transition-all duration-700`}
          style={{ height: visible ? height : "0px" }}
        >
          <span className="text-2xl font-bold text-text-muted">{position}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Badge */}
      <div className="relative mb-2">
        <div
          className={`${avatarSize} rounded-full bg-surface-hover border-3 ${pc.border} flex items-center justify-center text-text-primary font-bold text-lg overflow-hidden`}
          style={{ borderWidth: "3px" }}
        >
          {seller.photo ? (
            <img src={seller.photo} alt={seller.name} className="w-full h-full object-cover" />
          ) : (
            <span className={position === 1 ? "text-lg" : "text-sm"}>{getInitials(seller.name)}</span>
          )}
        </div>
        <div
          className={`absolute -top-1 -right-1 ${pc.badge} w-6 h-6 rounded-full flex items-center justify-center text-text-primary text-xs font-bold shadow-lg`}
        >
          {position}
        </div>
      </div>

      {/* Name */}
      <p className={`text-sm font-semibold ${pc.text} text-center max-w-[120px] truncate`}>
        {seller.name}
      </p>
      <p className="text-xs text-text-secondary font-medium">{formatCompact(seller.total_amount)}</p>
      <p className="text-[10px] text-text-muted">{seller.count} vendas</p>

      {/* Podium Bar */}
      <div
        className={`w-24 sm:w-28 ${pc.bg} ${pc.border} border rounded-t-xl mt-3 flex items-end justify-center pb-3 transition-all duration-1000 ease-out`}
        style={{ height: visible ? height : "0px" }}
      >
        {position === 1 && <Trophy className="w-8 h-8 text-yellow-400 animate-pulse" />}
        {position === 2 && <Medal className="w-7 h-7 text-text-primary" />}
        {position === 3 && <Medal className="w-6 h-6 text-amber-500" />}
      </div>
    </div>
  );
}

// ============================================================================
// Filter Bar Component
// ============================================================================

interface FilterBarProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  squads: Squad[];
  units: BusinessUnit[];
  onReset: () => void;
}

function FilterBar({ filters, onChange, squads, units, onReset }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof DashboardFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "data_criacao_inicio" || key === "data_criacao_fim") return false;
    return value !== "";
  });

  return (
    <div className="bg-surface/60 border border-border/50 rounded-2xl overflow-hidden">
      {/* Filter Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-hover/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">Filtros</span>
          {hasActiveFilters && (
            <span className="bg-primary text-text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Ativos
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {/* Filter Body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-border/30 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Squad */}
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Squad
              </label>
              <select
                value={filters.squad}
                onChange={(e) => update("squad", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              >
                <option value="">Todos</option>
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Unidade Geradora */}
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Unidade Geradora
              </label>
              <select
                value={filters.unidade_geradora}
                onChange={(e) => update("unidade_geradora", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              >
                <option value="">Todas</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Unidade Realizadora */}
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Unidade Realizadora
              </label>
              <select
                value={filters.unidade_realizadora}
                onChange={(e) => update("unidade_realizadora", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              >
                <option value="">Todas</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Status Pagamento */}
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Status Pagamento
              </label>
              <select
                value={filters.status_pagamento}
                onChange={(e) => update("status_pagamento", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              >
                <option value="">Todos</option>
                <option value="sem_pagamento">Sem Pagamento</option>
                <option value="parcial">Parcial</option>
                <option value="liquidado">Liquidado</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => update("status", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              >
                <option value="">Todos</option>
                <option value="fechado">Fechado</option>
                <option value="negociando">Negociando</option>
                <option value="cancelado">Cancelado</option>
                <option value="rejeitado">Rejeitado</option>
              </select>
            </div>

            {/* Data Criacao - Inicio */}
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Data Criacao (De)
              </label>
              <input
                type="date"
                value={filters.data_criacao_inicio}
                onChange={(e) => update("data_criacao_inicio", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
            </div>

            {/* Data Criacao - Fim */}
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Data Criacao (Ate)
              </label>
              <input
                type="date"
                value={filters.data_criacao_fim}
                onChange={(e) => update("data_criacao_fim", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
            </div>

            {/* Data Fechamento */}
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Data Fechamento (De)
              </label>
              <input
                type="date"
                value={filters.data_fechamento_inicio}
                onChange={(e) => update("data_fechamento_inicio", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Second Row for remaining date + reset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-1.5 block">
                Data Fechamento (Ate)
              </label>
              <input
                type="date"
                value={filters.data_fechamento_fim}
                onChange={(e) => update("data_fechamento_fim", e.target.value)}
                className="w-full bg-background-secondary/60 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 bg-surface-hover/50 hover:bg-surface-hover text-text-primary rounded-lg text-sm transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function SalesCubeDashboard() {
  const [kpis, setKpis] = useState<SaleKPIs | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vendas" | "leads">("vendas");

  const defaultFilters: DashboardFilters = {
    squad: "",
    unidade_geradora: "",
    unidade_realizadora: "",
    status_pagamento: "",
    status: "",
    data_criacao_inicio: getFirstDayOfMonth(),
    data_criacao_fim: getToday(),
    data_fechamento_inicio: "",
    data_fechamento_fim: "",
  };

  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  // Load squads and units on mount
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [squadsRes, unitsRes] = await Promise.all([
          apiClient.get("/settings/squads/").catch(() => ({ data: { results: [] } })),
          apiClient.get("/settings/units/").catch(() => ({ data: { results: [] } })),
        ]);
        setSquads(squadsRes.data.results || []);
        setUnits(unitsRes.data.results || []);
      } catch (err) {
        console.error("Error loading metadata:", err);
      }
    };
    loadMeta();
  }, []);

  // Build API params from filters
  const buildParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {};
    if (filters.squad) params.squad = filters.squad;
    if (filters.unidade_geradora) params.unidade_geradora = filters.unidade_geradora;
    if (filters.unidade_realizadora) params.unidade_realizadora = filters.unidade_realizadora;
    if (filters.status_pagamento) params.status_pagamento = filters.status_pagamento;
    if (filters.status) params.status = filters.status;
    if (filters.data_criacao_inicio) params.created_after = filters.data_criacao_inicio;
    if (filters.data_criacao_fim) params.created_before = filters.data_criacao_fim;
    if (filters.data_fechamento_inicio) params.closed_after = filters.data_fechamento_inicio;
    if (filters.data_fechamento_fim) params.closed_before = filters.data_fechamento_fim;
    return params;
  }, [filters]);

  // Fetch KPIs and Lead Stats when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = buildParams();
        const leadParams: Record<string, string> = {};
        if (filters.data_criacao_inicio) leadParams.start_date = filters.data_criacao_inicio;
        if (filters.data_criacao_fim) leadParams.end_date = filters.data_criacao_fim;

        const [kpiRes, leadStatsRes] = await Promise.all([
          saleKpiApi.getKpis(params),
          leadApi.getStats(leadParams).catch(() => ({ data: null })),
        ]);
        setKpis(kpiRes.data);
        setLeadStats(leadStatsRes.data);
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError("Erro ao carregar dados do dashboard. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [buildParams]);

  // Compute derived values
  const dashboardData = useMemo(() => {
    if (!kpis) return null;

    const negotiation = kpis.by_stage.negotiation || { count: 0, total_amount: 0, percentage: 0 };
    const won = kpis.by_stage.won || { count: 0, total_amount: 0, percentage: 0 };
    const proposal = kpis.by_stage.proposal || { count: 0, total_amount: 0, percentage: 0 };
    const lost = kpis.by_stage.lost || { count: 0, total_amount: 0, percentage: 0 };

    // "Total Vendas" = Aguardando Aprovacao (proposal) + Aprovadas (won)
    const totalVendas = {
      count: proposal.count + won.count,
      amount: proposal.total_amount + won.total_amount,
    };

    // Sort sellers by total_amount descending
    const sellers = [...(kpis.top_sellers || [])].sort(
      (a, b) => b.total_amount - a.total_amount
    );

    return {
      emNegociacao: { count: negotiation.count, amount: negotiation.total_amount, percentage: negotiation.percentage },
      fechadas: { count: won.count, amount: won.total_amount, percentage: won.percentage },
      aprovadas: { count: proposal.count, amount: proposal.total_amount, percentage: proposal.percentage },
      totalVendas,
      canceladas: { count: lost.count, amount: lost.total_amount, percentage: lost.percentage },
      sellers,
      top3: [sellers[0] || null, sellers[1] || null, sellers[2] || null] as [
        SellerRanking | null,
        SellerRanking | null,
        SellerRanking | null,
      ],
    };
  }, [kpis]);

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Visao geral do desempenho comercial e leads
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface/60 border border-border/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("vendas")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "vendas"
                ? "bg-primary text-gray-900"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 inline-block mr-1.5" />
            Vendas
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "leads"
                ? "bg-primary text-gray-900"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Users className="w-3.5 h-3.5 inline-block mr-1.5" />
            Leads
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        squads={squads}
        units={units}
        onReset={handleResetFilters}
      />

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonPodium />
            <SkeletonTable />
          </div>
        </>
      )}

      {/* ================================================================ */}
      {/* VENDAS TAB                                                       */}
      {/* ================================================================ */}
      {!loading && activeTab === "vendas" && dashboardData && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <KPICard
              title="Em Negociacao"
              count={dashboardData.emNegociacao.count}
              amount={dashboardData.emNegociacao.amount}
              percentage={dashboardData.emNegociacao.percentage}
              icon={<Handshake className="w-4 h-4 text-amber-400" />}
              color="amber"
              delay={0}
            />
            <KPICard
              title="Fechadas"
              count={dashboardData.fechadas.count}
              amount={dashboardData.fechadas.amount}
              percentage={dashboardData.fechadas.percentage}
              icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
              color="green"
              delay={100}
            />
            <KPICard
              title="Aprovadas"
              count={dashboardData.aprovadas.count}
              amount={dashboardData.aprovadas.amount}
              percentage={dashboardData.aprovadas.percentage}
              icon={<ShieldCheck className="w-4 h-4 text-blue-400" />}
              color="blue"
              delay={200}
            />
            <KPICard
              title="Total Vendas"
              count={dashboardData.totalVendas.count}
              amount={dashboardData.totalVendas.amount}
              icon={<ShoppingCart className="w-4 h-4 text-primary" />}
              color="indigo"
              delay={300}
            />
            <KPICard
              title="Canceladas"
              count={dashboardData.canceladas.count}
              amount={dashboardData.canceladas.amount}
              percentage={dashboardData.canceladas.percentage}
              icon={<XCircle className="w-4 h-4 text-red-400" />}
              color="red"
              delay={400}
            />
          </div>

          {/* Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface/40 border border-border/30 rounded-xl p-4 text-center">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Total Geral</p>
              <p className="text-lg font-bold text-text-primary">{kpis?.summary.total_sales ?? 0}</p>
              <p className="text-xs text-text-secondary">{formatBRL(kpis?.summary.total_amount ?? 0)}</p>
            </div>
            <div className="bg-surface/40 border border-border/30 rounded-xl p-4 text-center">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Ticket Medio</p>
              <p className="text-lg font-bold text-text-primary">{formatBRL(kpis?.summary.average_ticket ?? 0)}</p>
            </div>
            <div className="bg-surface/40 border border-border/30 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] text-text-muted uppercase tracking-wider">Conversao</p>
              </div>
              <p className="text-lg font-bold text-primary">{kpis?.summary.conversion_rate ?? 0}%</p>
            </div>
            <div className="bg-surface/40 border border-border/30 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                <p className="text-[11px] text-text-muted uppercase tracking-wider">Perda</p>
              </div>
              <p className="text-lg font-bold text-red-400">{kpis?.summary.loss_rate ?? 0}%</p>
            </div>
          </div>

          {/* Podium + Ranking Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Podium */}
            <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-2 text-center flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Top 3 Vendedores
              </h3>
              <p className="text-xs text-text-muted text-center mb-8">Ranking por valor total de vendas</p>

              <div className="flex items-end justify-center gap-3 sm:gap-6 min-h-[320px]">
                {/* 2nd Place */}
                <PodiumPosition
                  seller={dashboardData.top3[1]}
                  position={2}
                  height="140px"
                  avatarSize="w-16 h-16"
                  delay={600}
                />

                {/* 1st Place */}
                <PodiumPosition
                  seller={dashboardData.top3[0]}
                  position={1}
                  height="180px"
                  avatarSize="w-20 h-20"
                  delay={400}
                />

                {/* 3rd Place */}
                <PodiumPosition
                  seller={dashboardData.top3[2]}
                  position={3}
                  height="110px"
                  avatarSize="w-14 h-14"
                  delay={800}
                />
              </div>
            </div>

            {/* Full Ranking Table */}
            <div className="bg-surface/60 border border-border/50 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 flex items-center gap-2">
                <Users className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold text-text-primary">Ranking Completo</h3>
                <span className="text-xs text-text-muted ml-auto">
                  {dashboardData.sellers.length} vendedor{dashboardData.sellers.length !== 1 ? "es" : ""}
                </span>
              </div>

              <div className="max-h-[380px] overflow-y-auto">
                {dashboardData.sellers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                    <Users className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">Nenhum vendedor encontrado</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-surface">
                      <tr className="text-[10px] text-text-muted uppercase tracking-wider">
                        <th className="text-left pl-6 py-2.5 font-medium w-12">#</th>
                        <th className="text-left py-2.5 font-medium">Vendedor</th>
                        <th className="text-center py-2.5 font-medium w-20">Vendas</th>
                        <th className="text-right pr-6 py-2.5 font-medium w-32">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {dashboardData.sellers.map((seller, index) => {
                        const position = index + 1;
                        const positionColor =
                          position === 1
                            ? "text-yellow-400 font-bold"
                            : position === 2
                            ? "text-text-primary font-bold"
                            : position === 3
                            ? "text-amber-500 font-bold"
                            : "text-text-muted";

                        return (
                          <tr
                            key={`${seller.name}-${index}`}
                            className="hover:bg-surface-hover/20 transition-colors group"
                          >
                            <td className={`pl-6 py-3 text-sm ${positionColor}`}>
                              {position}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center text-text-primary text-xs font-semibold flex-shrink-0">
                                  {getInitials(seller.name)}
                                </div>
                                <span className="text-sm text-text-primary truncate max-w-[160px] group-hover:text-text-primary transition-colors">
                                  {seller.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <span className="text-sm text-text-secondary bg-surface-hover/40 px-2 py-0.5 rounded-full">
                                {seller.count}
                              </span>
                            </td>
                            <td className="pr-6 py-3 text-right">
                              <span className="text-sm font-medium text-primary">
                                {formatBRL(seller.total_amount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Top Products */}
          {kpis && kpis.top_products && kpis.top_products.length > 0 && (
            <div className="bg-surface/60 border border-border/50 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold text-text-primary">Top Produtos</h3>
                <span className="text-xs text-text-muted ml-auto">
                  {kpis.top_products.length} produtos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-px bg-surface-hover/30">
                {kpis.top_products.slice(0, 10).map((product, i) => {
                  const maxRevenue = kpis.top_products[0]?.revenue || 1;
                  const pct = (product.revenue / maxRevenue) * 100;
                  return (
                    <div
                      key={product.name}
                      className="bg-surface/80 p-4 hover:bg-surface-hover/30 transition-colors relative overflow-hidden"
                    >
                      {/* Background bar */}
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-primary/40 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />

                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-text-muted font-medium">#{i + 1}</span>
                        <span className="text-[10px] text-text-muted">{product.quantity} un</span>
                      </div>
                      <p className="text-sm text-text-primary font-medium truncate mb-1" title={product.name}>
                        {product.name}
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        {formatBRL(product.revenue)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ================================================================ */}
      {/* LEADS TAB - PROD-faithful lead engagement metrics                */}
      {/* ================================================================ */}
      {!loading && activeTab === "leads" && (
        <>
          {leadStats ? (
            <>
              {/* Lead Engagement KPI Cards (PROD TopCards equivalent) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">Total de Leads</span>
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-primary">{leadStats.total_leads}</p>
                  <p className="text-xs text-text-muted mt-1">Leads contactados no periodo</p>
                </div>

                <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">Vendas Realizadas</span>
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-primary">{leadStats.total_sales}</p>
                  <p className="text-xs text-text-muted mt-1">Leads convertidos em venda</p>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">Taxa de Conversao</span>
                    <div className="bg-purple-500/20 p-2 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-purple-400">{leadStats.conversion_rate.toFixed(1)}%</p>
                  <p className="text-xs text-text-muted mt-1">Percentual de respostas</p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">Ticket Medio</span>
                    <div className="bg-amber-500/20 p-2 rounded-lg">
                      <ShoppingCart className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-amber-400">{formatBRL(leadStats.avg_deal_size)}</p>
                  <p className="text-xs text-text-muted mt-1">Valor medio por negocio</p>
                </div>
              </div>

              {/* Revenue + Highlight Cards Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-primary/20 to-amber-600/20 border border-primary/30 rounded-2xl p-5">
                  <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">Receita Total</span>
                  <p className="text-2xl font-bold text-text-primary mt-2">{formatBRL(leadStats.total_revenue)}</p>
                  <p className="text-xs text-text-secondary mt-1">{leadStats.total_sales} vendas no periodo</p>
                </div>

                {/* Pipeline Summary Cards */}
                {leadStats.pipeline_summary.slice(0, 2).map((pipe) => (
                  <div key={pipe.pipeline_id} className="bg-surface/60 border border-border/50 rounded-2xl p-5">
                    <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">{pipe.name}</span>
                    <p className="text-2xl font-bold text-text-primary mt-2">{pipe.count}</p>
                    <p className="text-xs text-primary mt-1">{formatBRL(pipe.total_value)}</p>
                  </div>
                ))}
              </div>

              {/* Leads per Day Area Chart (PROD NewsletterCampaign equivalent) */}
              <LeadsPerDayChart data={leadStats.leads_per_day} />

              {/* Charts Row: Leads per Stage + Conversion Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LeadsPerStageChart data={leadStats.leads_per_stage} />
                <ConversionChart
                  totalLeads={leadStats.total_leads}
                  totalSales={leadStats.total_sales}
                  conversionRate={leadStats.conversion_rate}
                />
              </div>

              {/* Charts Row: Lead Source + Top Assignees */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LeadSourceChart data={leadStats.leads_per_source} />
                <TopAssigneesChart data={leadStats.top_assignees} />
              </div>

              {/* Sales Pipeline */}
              {leadStats.sales_pipeline && leadStats.sales_pipeline.length > 0 && (
                <div className="bg-surface/60 border border-border/50 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Funil de Vendas</h3>
                  <div className="space-y-3">
                    {leadStats.sales_pipeline.map((stage, i) => {
                      const maxCount = leadStats.sales_pipeline[0]?.count || 1;
                      const pct = (stage.count / maxCount) * 100;
                      return (
                        <div key={stage.stage} className="flex items-center gap-4">
                          <span className="text-sm text-text-primary w-32 truncate">{stage.stage}</span>
                          <div className="flex-1 relative">
                            <div className="w-full bg-surface-hover/50 rounded-full h-6">
                              <div
                                className="h-6 rounded-full bg-gradient-to-r from-primary to-amber-600 flex items-center justify-end pr-3 transition-all duration-700"
                                style={{ width: `${Math.max(pct, 8)}%` }}
                              >
                                <span className="text-[11px] font-semibold text-text-primary">{stage.count}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-primary font-medium w-28 text-right">
                            {formatBRL(stage.total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <Users className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhum dado de leads disponivel</p>
              <p className="text-sm">Ajuste os filtros ou aguarde novos leads.</p>
            </div>
          )}
        </>
      )}

      {/* Empty State (vendas tab) */}
      {!loading && activeTab === "vendas" && !error && !kpis && (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhum dado disponivel</p>
          <p className="text-sm">Ajuste os filtros ou aguarde novas vendas.</p>
        </div>
      )}
    </div>
  );
}
