"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, RefreshCw, Settings, GripVertical, Search, X } from "lucide-react";
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
import { pipelineApi, stageApi, leadApi, type Pipeline, type PipelineStage, type Lead } from "@/lib/salesApi";
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
          <div className="flex items-start justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-100 truncate flex-1">{lead.name}</h4>
            {lead.score > 0 && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0",
                  lead.score >= 80 ? "bg-green-500/20 text-green-400" :
                  lead.score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-gray-700 text-gray-400"
                )}
              >
                {lead.score}
              </span>
            )}
          </div>
          {lead.company && <p className="text-xs text-gray-500 mb-1 truncate">{lead.company}</p>}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs font-medium text-indigo-400">{formatCurrency(lead.value)}</span>
            {lead.source && lead.source !== "manual" && (
              <span className="text-[10px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">{lead.source}</span>
            )}
          </div>
          {(lead.phone || lead.email) && (
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-600">
              {lead.phone && <span>{lead.phone}</span>}
              {lead.email && <span className="truncate">{lead.email}</span>}
            </div>
          )}
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
      <div className="flex items-start justify-between mb-1">
        <h4 className="text-sm font-medium text-gray-100 truncate flex-1">{lead.name}</h4>
        {lead.score > 0 && (
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2",
              lead.score >= 80 ? "bg-green-500/20 text-green-400" :
              lead.score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
              "bg-gray-700 text-gray-400"
            )}
          >
            {lead.score}
          </span>
        )}
      </div>
      {lead.company && <p className="text-xs text-gray-500 truncate">{lead.company}</p>}
      <span className="text-xs font-medium text-indigo-400">{formatCurrency(lead.value)}</span>
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
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", value: "0", source: "manual" });

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
      const [stagesRes, leadsRes] = await Promise.all([
        stageApi.list(activePipeline),
        leadApi.list({ pipeline: activePipeline }),
      ]);
      const stagesData: PipelineStage[] = stagesRes.data.results || stagesRes.data;
      const leadsData: Lead[] = leadsRes.data.results || leadsRes.data;

      const sorted = [...stagesData].sort((a, b) => a.order - b.order);
      setStages(sorted);

      const grouped: Record<string, Lead[]> = {};
      for (const s of sorted) grouped[s.id] = [];
      for (const lead of leadsData) {
        if (grouped[lead.stage]) grouped[lead.stage].push(lead);
        else {
          const firstStage = sorted[0];
          if (firstStage) grouped[firstStage.id]?.push(lead);
        }
      }
      setLeadsByStage(grouped);
    } catch (err) {
      console.error("Failed to load board:", err);
    } finally {
      setLoading(false);
    }
  }, [activePipeline]);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);
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
      await leadApi.create({ ...newLead, stage: addToStage });
      setShowAddModal(false);
      setNewLead({ name: "", email: "", phone: "", company: "", value: "0", source: "manual" });
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Quadro</h1>
            <p className="text-xs text-gray-400">Kanban de Vendas</p>
          </div>
          {pipelines.length > 0 && (
            <select
              value={activePipeline}
              onChange={(e) => setActivePipeline(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 w-48"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
              </button>
            )}
          </div>
          <button onClick={fetchBoard} className="p-2 text-gray-400 hover:text-gray-100 transition-colors" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowPipelineManager(true)} className="p-2 text-gray-400 hover:text-gray-100 transition-colors" title="Gerenciar Pipelines">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

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
              <input type="text" placeholder="Nome *" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <input type="email" placeholder="Email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
                <input type="tel" placeholder="Telefone" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Empresa" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
                <input type="number" placeholder="Valor (R$)" value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              </div>
              <select value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                <option value="manual">Manual</option>
                <option value="website">Website</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="referral">Indicacao</option>
                <option value="event">Evento</option>
                <option value="other">Outro</option>
              </select>
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
