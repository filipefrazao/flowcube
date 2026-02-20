"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, User, Phone, Mail, Building, Clock, Tag,
  GripVertical, ChevronLeft, ChevronRight, LayoutGrid, X,
} from "lucide-react";
import {
  pipelineApi, kanbanApi, leadApi, stageApi,
  type Pipeline, type KanbanBoard, type KanbanColumn, type KanbanLeadCard, type PipelineStage,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import LeadModal from "@/components/salescube/LeadModal";

// ============================================================================
// Helpers
// ============================================================================

function formatBRL(v: string) {
  const num = parseFloat(v);
  if (isNaN(num) || num === 0) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 30) return `${diffDays}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  website: "Website",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  referral: "Indicacao",
  event: "Evento",
  other: "Outro",
};

// ============================================================================
// Column Skeleton
// ============================================================================

function ColumnSkeleton() {
  return (
    <div className="flex flex-col w-[290px] min-w-[290px] bg-surface/50 rounded-xl border border-border/50 animate-pulse">
      <div className="px-3 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-full h-3 bg-surface-hover rounded" />
          <div className="w-8 h-3 bg-surface-hover rounded-full" />
        </div>
      </div>
      <div className="p-2 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-background-secondary rounded-lg p-3 space-y-2">
            <div className="h-3.5 bg-surface-hover rounded w-3/4" />
            <div className="h-2.5 bg-surface rounded w-1/2" />
            <div className="h-2.5 bg-surface rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Quick Add Lead Form
// ============================================================================

function QuickAddLead({
  stageId,
  pipelineId,
  onCreated,
  onCancel,
}: {
  stageId: string;
  pipelineId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await leadApi.create({ name, phone, stage: stageId, pipeline: pipelineId });
      onCreated();
    } catch (err) {
      console.error("Erro ao criar lead:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-background-secondary border border-primary/30 rounded-lg p-2.5 space-y-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="Nome do lead *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
        className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:border-primary outline-none"
      />
      <input
        type="tel"
        placeholder="Telefone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
        className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:border-primary outline-none"
      />
      <div className="flex justify-end gap-1.5">
        <button onClick={onCancel} className="px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="px-2.5 py-1 text-[10px] bg-primary hover:bg-primary-hover text-gray-900 rounded disabled:opacity-50 transition-colors"
        >
          {saving ? "..." : "Criar"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Lead Card Component
// ============================================================================

function LeadCard({
  lead,
  isDragging,
  onDragStart,
  onClick,
}: {
  lead: KanbanLeadCard;
  isDragging: boolean;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const sourceLabel = SOURCE_LABELS[lead.source] || lead.source;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "group bg-background-secondary border border-border/50 rounded-lg p-3 cursor-pointer select-none",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-150",
        isDragging && "opacity-40 scale-95"
      )}
    >
      {/* Top row: name + score */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <GripVertical className="w-3 h-3 text-text-secondary group-hover:text-text-muted shrink-0 transition-colors" />
          <span className="text-sm font-medium text-text-primary truncate">{lead.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead.score > 0 && (
            <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded">
              {lead.score}
            </span>
          )}
          <span className="text-[10px] text-text-muted">{timeAgo(lead.created_at)}</span>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-0.5 ml-[18px]">
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.company && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Building className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.company}</span>
          </div>
        )}
      </div>

      {/* Footer: assigned + value + source */}
      <div className="flex items-center justify-between mt-2 ml-[18px]">
        <div className="flex items-center gap-2 min-w-0">
          {lead.assigned_to_name ? (
            <div className="flex items-center gap-1 text-[10px] text-text-muted min-w-0">
              <div className="w-4 h-4 rounded-full bg-surface-hover flex items-center justify-center shrink-0">
                <User className="w-2.5 h-2.5 text-text-secondary" />
              </div>
              <span className="truncate max-w-[80px]">{lead.assigned_to_name}</span>
            </div>
          ) : (
            <span className="text-[10px] text-text-secondary">Sem resp.</span>
          )}
          {lead.source && lead.source !== "manual" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-text-muted border border-border/50 truncate max-w-[70px]">
              {sourceLabel}
            </span>
          )}
        </div>
        {formatBRL(lead.value) && (
          <span className="text-xs font-semibold text-primary shrink-0">{formatBRL(lead.value)}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Kanban Column Component
// ============================================================================

function KanbanColumnView({
  col,
  isDragOver,
  draggedLeadId,
  pipelineId,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onLeadClick,
  onLoadMore,
  onLeadCreated,
}: {
  col: KanbanColumn;
  isDragOver: boolean;
  draggedLeadId: string | null;
  pipelineId: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragStart: (leadId: string) => void;
  onLeadClick: (leadId: string) => void;
  onLoadMore: () => void;
  onLeadCreated: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight * 0.8;
    if (isNearBottom && col.leads.length < col.count) {
      setIsLoadingMore(true);
      onLoadMore();
      setTimeout(() => setIsLoadingMore(false), 1000);
    }
  }, [col.leads.length, col.count, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const hasValue = formatBRL(col.total_value);

  return (
    <div
      className={cn(
        "flex flex-col w-[290px] min-w-[290px] rounded-xl border transition-all duration-200",
        isDragOver
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border/50 bg-surface/40"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Color bar */}
      <div className="h-1 rounded-t-xl" style={{ backgroundColor: col.color || "#6366f1" }} />

      {/* Column Header */}
      <div className="px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate">{col.stage_name}</span>
            <span className="text-[10px] bg-surface-hover/80 text-text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">
              {col.count}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasValue && (
              <span className="text-[10px] text-primary font-semibold">{hasValue}</span>
            )}
            <button
              onClick={() => setShowAddForm(true)}
              className="p-1 text-text-muted hover:text-primary hover:bg-surface-hover/50 rounded transition-all"
              title="Adicionar lead"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {/* Probability bar */}
        {col.probability > 0 && col.probability < 100 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${col.probability}%`,
                  backgroundColor: col.color || "#6366f1",
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-[9px] text-text-muted shrink-0">{col.probability}%</span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-2"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        {/* Quick Add Form */}
        {showAddForm && (
          <QuickAddLead
            stageId={col.stage_id}
            pipelineId={pipelineId}
            onCreated={() => { setShowAddForm(false); onLeadCreated(); }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {col.leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            isDragging={draggedLeadId === lead.id}
            onDragStart={() => onDragStart(lead.id)}
            onClick={() => onLeadClick(lead.id)}
          />
        ))}

        {/* Loading indicator for infinite scroll */}
        {isLoadingMore && col.leads.length < col.count && (
          <div className="flex items-center justify-center py-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {col.leads.length === 0 && !showAddForm && (
          <div className="text-center py-6">
            <LayoutGrid className="w-6 h-6 text-text-secondary mx-auto mb-1.5" />
            <p className="text-xs text-text-muted">Nenhum lead</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-1.5 text-[10px] text-primary hover:text-primary transition-colors"
            >
              + Adicionar
            </button>
          </div>
        )}
      </div>

      {/* Column footer with remaining count */}
      {col.leads.length > 0 && col.leads.length < col.count && !isLoadingMore && (
        <div className="px-3 py-1.5 border-t border-border/30 text-center">
          <span className="text-[10px] text-text-muted">
            {col.leads.length} de {col.count} leads
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Kanban Page
// ============================================================================

export default function KanbanPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [allStages, setAllStages] = useState<PipelineStage[]>([]);

  // Drag state
  const [draggedLead, setDraggedLead] = useState<{ leadId: string; fromStageId: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Lead modal
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Pipeline tabs scroll
  const tabsRef = useRef<HTMLDivElement>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load pipelines
  useEffect(() => {
    pipelineApi.list().then((res) => {
      const data = res.data.results || res.data;
      setPipelines(data);
      if (data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0].id);
      }
    });
  }, []);

  // Load kanban board
  const fetchBoard = useCallback(async () => {
    if (!selectedPipeline) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page_size: "50" };
      if (debouncedSearch) params.search = debouncedSearch;
      const [boardRes, stagesRes] = await Promise.all([
        kanbanApi.getBoard(selectedPipeline, params),
        stageApi.list(selectedPipeline),
      ]);
      setBoard(boardRes.data);
      setAllStages(stagesRes.data.results || stagesRes.data);
    } catch (err) {
      console.error("Failed to load kanban:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline, debouncedSearch]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Drag handlers
  const handleDragStart = (leadId: string, fromStageId: string) => {
    setDraggedLead({ leadId, fromStageId });
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (toStageId: string) => {
    if (!draggedLead || draggedLead.fromStageId === toStageId) {
      setDraggedLead(null);
      setDragOverStage(null);
      return;
    }

    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      let movedLead: KanbanLeadCard | undefined;
      const cols = prev.columns.map((col) => {
        if (col.stage_id === draggedLead.fromStageId) {
          const lead = col.leads.find((l) => l.id === draggedLead.leadId);
          if (lead) movedLead = lead;
          return { ...col, leads: col.leads.filter((l) => l.id !== draggedLead.leadId), count: col.count - 1 };
        }
        return col;
      });
      if (movedLead) {
        return {
          ...prev,
          columns: cols.map((col) =>
            col.stage_id === toStageId
              ? { ...col, leads: [movedLead!, ...col.leads], count: col.count + 1 }
              : col
          ),
        };
      }
      return { ...prev, columns: cols };
    });

    try {
      await leadApi.move(draggedLead.leadId, toStageId);
    } catch (err) {
      console.error("Failed to move lead:", err);
      fetchBoard(); // Revert on error
    }
    setDraggedLead(null);
    setDragOverStage(null);
  };

  // Load more leads for a column
  const loadMoreLeads = useCallback(async (stageId: string) => {
    if (!board || !selectedPipeline) return;
    const col = board.columns.find((c) => c.stage_id === stageId);
    if (!col || col.leads.length >= col.count) return;

    try {
      const params: Record<string, string> = {
        page_size: "50",
        [`stage_${stageId}_page`]: (col.current_page + 1).toString(),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await kanbanApi.getBoard(selectedPipeline, params);
      const newBoard = res.data;

      setBoard((prev) => {
        if (!prev) return newBoard;
        return {
          ...prev,
          columns: prev.columns.map((c) => {
            if (c.stage_id === stageId) {
              const updated = newBoard.columns.find((nc) => nc.stage_id === stageId);
              if (updated) {
                return {
                  ...updated,
                  leads: [...c.leads, ...updated.leads],
                };
              }
            }
            return c;
          }),
        };
      });
    } catch (err) {
      console.error(err);
    }
  }, [board, selectedPipeline, debouncedSearch]);

  // Pipeline tab scroll
  const scrollTabs = (dir: "left" | "right") => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  // Board totals
  const boardTotals = board
    ? {
        leads: board.columns.reduce((s, c) => s + c.count, 0),
        value: board.columns.reduce((s, c) => s + parseFloat(c.total_value || "0"), 0),
      }
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-border bg-background-secondary/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-text-primary">Kanban</h1>
            {boardTotals && (
              <div className="flex items-center gap-3 ml-3 text-xs text-text-muted">
                <span>{boardTotals.leads} leads</span>
                {boardTotals.value > 0 && (
                  <span className="text-primary font-medium">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(boardTotals.value)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-10 pr-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* Pipeline Tabs */}
        {pipelines.length > 0 && (
          <div className="flex items-center gap-1">
            {pipelines.length > 4 && (
              <button
                onClick={() => scrollTabs("left")}
                className="p-1 text-text-muted hover:text-text-primary shrink-0 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div
              ref={tabsRef}
              className="flex items-center gap-1 overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {pipelines.map((p) => {
                const isActive = selectedPipeline === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPipeline(p.id)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all",
                      isActive
                        ? "bg-primary text-gray-900 shadow-sm shadow-primary/20"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    )}
                  >
                    {p.name}
                    {isActive && p.is_default && (
                      <span className="ml-1.5 text-[9px] text-primary opacity-70">padrao</span>
                    )}
                  </button>
                );
              })}
            </div>
            {pipelines.length > 4 && (
              <button
                onClick={() => scrollTabs("right")}
                className="p-1 text-text-muted hover:text-text-primary shrink-0 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full">
            {[1, 2, 3, 4, 5].map((i) => (
              <ColumnSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : board ? (
        <div ref={boardScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div
            className="flex gap-4 h-full"
            style={{ minWidth: `${board.columns.length * 306}px` }}
          >
            {board.columns.map((col) => (
              <KanbanColumnView
                key={col.stage_id}
                col={col}
                isDragOver={dragOverStage === col.stage_id}
                draggedLeadId={draggedLead?.leadId || null}
                pipelineId={selectedPipeline}
                onDragOver={(e) => handleDragOver(e, col.stage_id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(col.stage_id)}
                onDragStart={(leadId) => handleDragStart(leadId, col.stage_id)}
                onLeadClick={(leadId) => { setSelectedLeadId(leadId); setShowLeadModal(true); }}
                onLoadMore={() => loadMoreLeads(col.stage_id)}
                onLeadCreated={() => fetchBoard()}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 text-text-muted">
          <div className="text-center">
            <LayoutGrid className="w-12 h-12 text-text-secondary mx-auto mb-3" />
            <p>Selecione um pipeline para ver o Kanban</p>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showLeadModal && selectedLeadId && (
        <LeadModal
          leadId={selectedLeadId}
          stages={allStages}
          onClose={() => { setShowLeadModal(false); setSelectedLeadId(null); }}
          onUpdated={() => { fetchBoard(); }}
        />
      )}
    </div>
  );
}
