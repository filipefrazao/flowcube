"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight, GripVertical, User, Phone, Mail, Building } from "lucide-react";
import { pipelineApi, kanbanApi, leadApi, type Pipeline, type KanbanBoard, type KanbanColumn, type KanbanLeadCard } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import LeadModal from "@/components/salescube/LeadModal";
import { stageApi, type PipelineStage } from "@/lib/salesApi";

export default function KanbanPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [allStages, setAllStages] = useState<PipelineStage[]>([]);

  // Drag state
  const [draggedLead, setDraggedLead] = useState<{ leadId: string; fromStageId: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Lead modal
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Horizontal scroll
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Load kanban board when pipeline changes
  const fetchBoard = useCallback(async () => {
    if (!selectedPipeline) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page_size: "50" };
      if (searchQuery) params.search = searchQuery;
      const res = await kanbanApi.getBoard(selectedPipeline, params);
      setBoard(res.data);

      // Also fetch stages for the lead modal
      const stagesRes = await stageApi.list(selectedPipeline);
      setAllStages(stagesRes.data.results || stagesRes.data);
    } catch (err) {
      console.error("Failed to load kanban:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline, searchQuery]);

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
    try {
      await leadApi.move(draggedLead.leadId, toStageId);
      fetchBoard();
    } catch (err) {
      console.error("Failed to move lead:", err);
    }
    setDraggedLead(null);
    setDragOverStage(null);
  };

  // Load more leads for a column
  const loadMoreLeads = async (stageId: string, nextPage: number) => {
    if (!board || !selectedPipeline) return;
    try {
      const params: Record<string, string> = {
        page_size: "50",
        [`stage_${stageId}_page`]: nextPage.toString(),
      };
      if (searchQuery) params.search = searchQuery;
      const res = await kanbanApi.getBoard(selectedPipeline, params);
      const newBoard = res.data;

      // Merge only the target column
      setBoard((prev) => {
        if (!prev) return newBoard;
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            const updated = newBoard.columns.find((c) => c.stage_id === col.stage_id);
            if (updated && col.stage_id === stageId) {
              return {
                ...updated,
                leads: [...col.leads, ...updated.leads],
              };
            }
            return col;
          }),
        };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatValue = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num) || num === 0) return "";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  const openLeadModal = (leadId: string) => {
    setSelectedLeadId(leadId);
    setShowLeadModal(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900/50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Kanban</h1>
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-1.5 text-sm text-gray-100 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : board ? (
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-4 h-full" style={{ minWidth: `${board.columns.length * 300}px` }}>
            {board.columns.map((col) => (
              <div
                key={col.stage_id}
                className={cn(
                  "flex flex-col w-[280px] min-w-[280px] bg-gray-800/50 rounded-xl border transition-colors",
                  dragOverStage === col.stage_id
                    ? "border-indigo-500 bg-indigo-500/5"
                    : "border-gray-700/50"
                )}
                onDragOver={(e) => handleDragOver(e, col.stage_id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(col.stage_id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-sm font-semibold text-gray-200 truncate">{col.stage_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{col.count}</span>
                    {formatValue(col.total_value) && (
                      <span className="text-xs text-indigo-400 font-medium">{formatValue(col.total_value)}</span>
                    )}
                  </div>
                </div>

                {/* Lead Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {col.leads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead.id, col.stage_id)}
                      onClick={() => openLeadModal(lead.id)}
                      className={cn(
                        "bg-gray-900 border border-gray-700/50 rounded-lg p-3 cursor-pointer",
                        "hover:border-indigo-500/50 hover:bg-gray-900/80 transition-colors",
                        draggedLead?.leadId === lead.id && "opacity-50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-100 truncate flex-1">{lead.name}</span>
                        {lead.score > 0 && (
                          <span className="text-xs bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-2">{lead.score}</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3 h-3" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.company && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Building className="w-3 h-3" />
                            <span className="truncate">{lead.company}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {lead.assigned_to_name ? (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span className="truncate">{lead.assigned_to_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">Sem responsavel</span>
                        )}
                        {formatValue(lead.value) && (
                          <span className="text-xs font-medium text-green-400">{formatValue(lead.value)}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Load More */}
                  {col.leads.length < col.count && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadMoreLeads(col.stage_id, col.current_page + 1);
                      }}
                      className="w-full py-2 text-xs text-indigo-400 hover:text-indigo-300 bg-gray-800/50 rounded-lg transition-colors"
                    >
                      Carregar mais ({col.count - col.leads.length} restantes)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 text-gray-500">
          Selecione um pipeline para ver o Kanban
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
