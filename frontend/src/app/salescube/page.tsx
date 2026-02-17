"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, RefreshCw, Settings, GripVertical, Search, X, Phone, Calendar, ChevronLeft, ChevronRight, Users, DollarSign, BarChart3, TrendingUp } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { pipelineApi, stageApi, leadApi, originApi, kanbanApi, type Pipeline, type PipelineStage, type Lead, type Origin, type KanbanLeadCard } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import LeadModal from "@/components/salescube/LeadModal";
import PipelineManager from "@/components/salescube/PipelineManager";

// ============================================================================
// Sortable Lead Card
// ============================================================================

function SortableLeadCard({
  lead,
  onClick,
}: {
  lead: Lead;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors cursor-pointer group",
        isDragging && "opacity-30"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3.5 h-3.5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Name + relative time (PROD style) */}
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-gray-100 truncate flex-1">{lead.name}</h4>
            <span className="text-[10px] text-gray-500 ml-1 flex-shrink-0 whitespace-nowrap">{timeAgo(lead.created_at)}</span>
          </div>
          {/* Phone */}
          {lead.phone && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <Phone className="w-3 h-3 text-gray-600" />
              <span className="text-xs text-gray-300 truncate">{lead.phone}</span>
            </div>
          )}
          {/* Email */}
          {lead.email && (
            <p className="text-xs text-gray-500 truncate mb-1">{lead.email}</p>
          )}
          {/* Origin chip + date (PROD style) */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-400 bg-gray-900 px-2 py-0.5 rounded-lg truncate max-w-[60%]">
              {lead.origin_name || "Origem desconhecida"}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-gray-600">
              <Calendar className="w-3 h-3" />
              <span>{new Date(lead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Droppable Column
// ============================================================================

function KanbanColumn({
  stage,
  leads,
  onAddLead,
  onLeadClick,
}: {
  stage: PipelineStage;
  leads: Lead[];
  onAddLead: () => void;
  onLeadClick: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage.id}`,
    data: { type: "column", stageId: stage.id },
  });

  const totalValue = leads.reduce((sum, l) => sum + parseFloat(l.value || "0"), 0);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || "#6366f1" }} />
          <h3 className="text-sm font-semibold text-gray-100 truncate">{stage.name}</h3>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">{leads.length}</span>
        </div>
        <button onClick={onAddLead} className="p-1 text-gray-500 hover:text-indigo-400 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="px-1 mb-2">
        <span className="text-xs text-gray-500">{formatCurrency(totalValue.toString())}</span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto rounded-lg p-1 transition-colors min-h-[100px]",
          isOver && "bg-indigo-500/5 ring-1 ring-indigo-500/20"
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-600">Arraste leads aqui</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Drag Overlay Card (ghost while dragging)
// ============================================================================

function DragOverlayCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-gray-800 border-2 border-indigo-500 rounded-lg p-3 w-72 shadow-2xl shadow-indigo-500/20 rotate-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-gray-100 truncate flex-1">{lead.name}</h4>
        <span className="text-[10px] text-gray-500 ml-1">{timeAgo(lead.created_at)}</span>
      </div>
      {lead.phone && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <Phone className="w-3 h-3 text-gray-600" />
          <span className="text-xs text-gray-300">{lead.phone}</span>
        </div>
      )}
      <span className="text-[10px] text-gray-400 bg-gray-900 px-2 py-0.5 rounded-lg">
        {lead.origin_name || "Origem desconhecida"}
      </span>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(v: string | number) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "R$ 0";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 30) return `${diffDays}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ============================================================================
// Main Kanban Page
// ============================================================================

export default function SalesCubeKanban() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<string>("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToStage, setAddToStage] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showPipelineManager, setShowPipelineManager] = useState(false);

  // New lead form
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", value: "0", source: "manual", origin: "" });
  const [origins, setOrigins] = useState<Origin[]>([]);

  // DnD state
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ========================================================================
  // Data fetching
  // ========================================================================

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await pipelineApi.list();
      const data = res.data.results || res.data;
      setPipelines(data);
      if (data.length > 0 && !activePipeline) {
        const defaultP = data.find((p: Pipeline) => p.is_default) || data[0];
        setActivePipeline(defaultP.id);
      }
    } catch (err) {
      console.error("Failed to load pipelines:", err);
    }
  }, [activePipeline]);

  const fetchBoard = useCallback(async () => {
    if (!activePipeline) return;
    setLoading(true);
    try {
      const boardRes = await kanbanApi.getBoard(activePipeline, { page_size: "500" });
      const columns = boardRes.data.columns || [];

      const stagesFromBoard: PipelineStage[] = columns.map((col) => ({
        id: col.stage_id,
        name: col.stage_name,
        color: col.color,
        order: col.order,
        probability: col.probability,
        pipeline: activePipeline,
      }));
      setStages(stagesFromBoard);

      const grouped: Record<string, Lead[]> = {};
      for (const col of columns) {
        grouped[col.stage_id] = col.leads.map((card) => ({
          ...card,
          stage: col.stage_id,
          origin_name: card.origin_name || null,
        } as unknown as Lead));
      }
      setLeadsByStage(grouped);
    } catch (err) {
      console.error("Failed to load board:", err);
    } finally {
      setLoading(false);
    }
  }, [activePipeline]);

  const fetchOrigins = useCallback(async () => {
    try {
      const res = await originApi.list({ limit: "500" });
      setOrigins(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to load origins:", err);
    }
  }, []);

  useEffect(() => { fetchPipelines(); fetchOrigins(); }, [fetchPipelines, fetchOrigins]);
  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // ========================================================================
  // DnD handlers
  // ========================================================================

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = active.data.current?.lead as Lead;
    if (lead) setActiveDragLead(lead);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    // Find source stage
    let sourceStageId = "";
    for (const [stageId, leads] of Object.entries(leadsByStage)) {
      if (leads.find((l) => l.id === activeLeadId)) {
        sourceStageId = stageId;
        break;
      }
    }

    // Determine target stage
    let targetStageId = "";
    if (overId.startsWith("column-")) {
      targetStageId = overId.replace("column-", "");
    } else {
      // Over another lead - find its stage
      for (const [stageId, leads] of Object.entries(leadsByStage)) {
        if (leads.find((l) => l.id === overId)) {
          targetStageId = stageId;
          break;
        }
      }
    }

    if (!sourceStageId || !targetStageId || sourceStageId === targetStageId) return;

    // Optimistically move the lead between columns
    setLeadsByStage((prev) => {
      const next = { ...prev };
      const lead = next[sourceStageId].find((l) => l.id === activeLeadId);
      if (!lead) return prev;
      next[sourceStageId] = next[sourceStageId].filter((l) => l.id !== activeLeadId);
      next[targetStageId] = [...next[targetStageId], { ...lead, stage: targetStageId }];
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragLead(null);
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    // Find current stage of the lead
    let currentStageId = "";
    for (const [stageId, leads] of Object.entries(leadsByStage)) {
      if (leads.find((l) => l.id === activeLeadId)) {
        currentStageId = stageId;
        break;
      }
    }

    if (!currentStageId) return;

    // Persist the move to backend
    try {
      await leadApi.move(activeLeadId, currentStageId);
    } catch (err) {
      console.error("Failed to move lead:", err);
      fetchBoard(); // Revert on error
    }
  };

  // ========================================================================
  // Lead CRUD
  // ========================================================================

  const handleAddLead = async () => {
    try {
      const payload: Record<string, any> = { ...newLead, stage: addToStage };
      if (!payload.origin) delete payload.origin;
      await leadApi.create(payload);
      setShowAddModal(false);
      setNewLead({ name: "", email: "", phone: "", company: "", value: "0", source: "manual", origin: "" });
      await fetchBoard();
    } catch (err) {
      console.error("Failed to add lead:", err);
    }
  };

  const handleLeadUpdated = () => {
    fetchBoard();
    setShowLeadModal(false);
    setSelectedLead(null);
  };

  // ========================================================================
  // Filtered leads
  // ========================================================================

  const getFilteredLeads = (stageLeads: Lead[]) => {
    if (!searchQuery) return stageLeads;
    const q = searchQuery.toLowerCase();
    return stageLeads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q)
    );
  };

  // ========================================================================
  // Render
  // ========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header - Board Tab Bar (PROD style) */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Add Board Button */}
            <button
              onClick={() => setShowPipelineManager(true)}
              className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0 transition-colors"
              title="Adicionar Quadro"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Board Tabs with scroll */}
            <div className="flex items-center flex-1 min-w-0 overflow-hidden">
              <div className="flex overflow-x-auto scrollbar-hide border-t-2 border-l-2 border-r-2 border-gray-700 rounded-t-lg">
                {pipelines.map((p) => {
                  const isSelected = activePipeline === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (activePipeline !== p.id) setActivePipeline(p.id);
                      }}
                      className={cn(
                        "flex items-center gap-1 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors rounded-t-lg",
                        isSelected
                          ? "bg-gray-800/60 text-white"
                          : "text-gray-400 hover:bg-gray-800/30 hover:text-gray-200"
                      )}
                    >
                      {p.name}
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPipelineManager(true);
                          }}
                          className="ml-1 p-0.5 text-gray-500 hover:text-gray-300"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Pesquisar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-8 py-1.5 text-sm text-gray-100 placeholder-gray-500 w-52"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {(() => {
        const allLeads = Object.values(leadsByStage).flat();
        const totalLeads = allLeads.length;
        const totalValue = allLeads.reduce((sum, l) => sum + parseFloat(l.value || "0"), 0);
        const avgTicket = totalLeads > 0 ? totalValue / totalLeads : 0;
        return (
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Leads</p>
                <p className="text-lg font-bold text-blue-400">{totalLeads.toLocaleString("pt-BR")}</p>
              </div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Valor Total</p>
                <p className="text-lg font-bold text-green-400">{formatCurrency(totalValue)}</p>
              </div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Etapas</p>
                <p className="text-lg font-bold text-purple-400">{stages.length}</p>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Ticket Médio</p>
                <p className="text-lg font-bold text-amber-400">{formatCurrency(avgTicket)}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Kanban Board with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={getFilteredLeads(leadsByStage[stage.id] || [])}
              onAddLead={() => {
                setAddToStage(stage.id);
                setShowAddModal(true);
              }}
              onLeadClick={(lead) => {
                setSelectedLead(lead);
                setShowLeadModal(true);
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragLead ? <DragOverlayCard lead={activeDragLead} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Quick Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Novo Lead</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Nome *" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" autoFocus />
                <input type="tel" placeholder="Telefone *" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="email" placeholder="Email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
                <select value={newLead.origin} onChange={(e) => setNewLead({ ...newLead, origin: e.target.value })} className="bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                  <option value="">Origem *</option>
                  {origins.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100 transition-colors">Cancelar</button>
              <button onClick={handleAddLead} disabled={!newLead.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showLeadModal && selectedLead && (
        <LeadModal
          leadId={selectedLead.id}
          stages={stages}
          onClose={() => { setShowLeadModal(false); setSelectedLead(null); }}
          onUpdated={handleLeadUpdated}
        />
      )}

      {/* Pipeline Manager */}
      <PipelineManager
        open={showPipelineManager}
        onClose={() => setShowPipelineManager(false)}
        activePipelineId={activePipeline}
        onPipelineChange={() => { fetchPipelines(); fetchBoard(); }}
      />
    </div>
  );
}
