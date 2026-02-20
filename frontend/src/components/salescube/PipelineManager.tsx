"use client";

import { useState, useEffect } from "react";
import { X, Plus, GripVertical, Trash2, Edit2, Palette } from "lucide-react";
import { pipelineApi, stageApi, type Pipeline, type PipelineStage } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const STAGE_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#2563eb", "#64748b",
];

interface PipelineManagerProps {
  open: boolean;
  onClose: () => void;
  activePipelineId?: string;
  onPipelineChange?: () => void;
}

export default function PipelineManager({ open, onClose, activePipelineId, onPipelineChange }: PipelineManagerProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(false);

  // Pipeline form
  const [showPipelineForm, setShowPipelineForm] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [pipelineName, setPipelineName] = useState("");

  // Stage form
  const [showStageForm, setShowStageForm] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [stageForm, setStageForm] = useState({ name: "", color: "#6366f1", order: 0, probability: 50 });

  useEffect(() => {
    if (open) fetchPipelines();
  }, [open]);

  useEffect(() => {
    if (selectedPipeline) fetchStages();
  }, [selectedPipeline]);

  const fetchPipelines = async () => {
    try {
      const res = await pipelineApi.list();
      const list = res.data.results || res.data;
      setPipelines(list);
      if (activePipelineId) {
        setSelectedPipeline(activePipelineId);
      } else if (list.length > 0) {
        setSelectedPipeline(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStages = async () => {
    setLoading(true);
    try {
      const res = await stageApi.list(selectedPipeline);
      const list = res.data.results || res.data;
      setStages(list.sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Pipeline CRUD
  const openPipelineCreate = () => {
    setEditingPipeline(null);
    setPipelineName("");
    setShowPipelineForm(true);
  };

  const openPipelineEdit = (p: Pipeline) => {
    setEditingPipeline(p);
    setPipelineName(p.name);
    setShowPipelineForm(true);
  };

  const savePipeline = async () => {
    try {
      if (editingPipeline) {
        await pipelineApi.update(editingPipeline.id, { name: pipelineName });
      } else {
        const res = await pipelineApi.create({ name: pipelineName });
        setSelectedPipeline(res.data.id);
      }
      setShowPipelineForm(false);
      fetchPipelines();
      onPipelineChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  const deletePipeline = async (id: string) => {
    if (!confirm("Excluir este pipeline e todas as suas colunas?")) return;
    try {
      await pipelineApi.delete(id);
      fetchPipelines();
      onPipelineChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  // Stage CRUD
  const openStageCreate = () => {
    setEditingStage(null);
    setStageForm({ name: "", color: "#6366f1", order: stages.length, probability: 50 });
    setShowStageForm(true);
  };

  const openStageEdit = (s: PipelineStage) => {
    setEditingStage(s);
    setStageForm({ name: s.name, color: s.color || "#6366f1", order: s.order, probability: s.probability || 50 });
    setShowStageForm(true);
  };

  const saveStage = async () => {
    try {
      const data = { ...stageForm, pipeline: selectedPipeline };
      if (editingStage) {
        await stageApi.update(editingStage.id, data);
      } else {
        await stageApi.create(data);
      }
      setShowStageForm(false);
      fetchStages();
      onPipelineChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteStage = async (id: string) => {
    if (!confirm("Excluir esta coluna? Leads nela ficarao sem estagio.")) return;
    try {
      await stageApi.delete(id);
      fetchStages();
      onPipelineChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  const moveStage = async (stageId: string, direction: "up" | "down") => {
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stages.length) return;

    try {
      await Promise.all([
        stageApi.update(stages[idx].id, { order: stages[swapIdx].order }),
        stageApi.update(stages[swapIdx].id, { order: stages[idx].order }),
      ]);
      fetchStages();
      onPipelineChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Gerenciar Pipelines</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Pipeline Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="flex-1 bg-input border border-input-border text-text-primary rounded-lg px-3 py-2 text-sm"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={openPipelineCreate} className="p-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg transition-colors" title="Novo Pipeline">
              <Plus className="w-4 h-4" />
            </button>
            {selectedPipeline && (
              <>
                <button
                  onClick={() => {
                    const p = pipelines.find((x) => x.id === selectedPipeline);
                    if (p) openPipelineEdit(p);
                  }}
                  className="p-2 text-text-secondary hover:text-primary transition-colors"
                  title="Renomear"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {pipelines.length > 1 && (
                  <button
                    onClick={() => deletePipeline(selectedPipeline)}
                    className="p-2 text-text-secondary hover:text-red-400 transition-colors"
                    title="Excluir Pipeline"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Pipeline Form (inline) */}
          {showPipelineForm && (
            <div className="bg-background-secondary border border-border rounded-lg p-3 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">{editingPipeline ? "Renomear Pipeline" : "Novo Pipeline"}</h3>
              <input
                type="text"
                placeholder="Nome do pipeline"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowPipelineForm(false)} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">Cancelar</button>
                <button onClick={savePipeline} disabled={!pipelineName.trim()} className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-xs disabled:opacity-50">Salvar</button>
              </div>
            </div>
          )}

          {/* Stages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-secondary">Colunas (Estagios)</h3>
              <button onClick={openStageCreate} className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
                <Plus className="w-3 h-3" /> Nova Coluna
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stages.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">Nenhuma coluna criada</div>
            ) : (
              <div className="space-y-1.5">
                {stages.map((stage, idx) => (
                  <div key={stage.id} className="flex items-center gap-2 bg-background-secondary border border-border rounded-lg px-3 py-2.5 group">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveStage(stage.id, "up")}
                        disabled={idx === 0}
                        className="text-text-muted hover:text-text-secondary disabled:opacity-20 text-[10px] leading-none"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveStage(stage.id, "down")}
                        disabled={idx === stages.length - 1}
                        className="text-text-muted hover:text-text-secondary disabled:opacity-20 text-[10px] leading-none"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || "#6366f1" }} />
                    <span className="flex-1 text-sm text-text-primary">{stage.name}</span>
                    <span className="text-[10px] text-text-muted">{stage.probability || 0}%</span>
                    <span className="text-[10px] text-text-muted">#{stage.order}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openStageEdit(stage)} className="p-1 text-text-muted hover:text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteStage(stage.id)} className="p-1 text-text-muted hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage Form (inline) */}
          {showStageForm && (
            <div className="bg-background-secondary border border-border rounded-lg p-3 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">{editingStage ? "Editar Coluna" : "Nova Coluna"}</h3>
              <input
                type="text"
                placeholder="Nome da coluna"
                value={stageForm.name}
                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Ordem</label>
                  <input
                    type="number"
                    min={0}
                    value={stageForm.order}
                    onChange={(e) => setStageForm({ ...stageForm, order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Probabilidade (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={stageForm.probability}
                    onChange={(e) => setStageForm({ ...stageForm, probability: parseInt(e.target.value) || 0 })}
                    className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Cor</label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setStageForm({ ...stageForm, color: c })}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all",
                        stageForm.color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background-secondary scale-110" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowStageForm(false)} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">Cancelar</button>
                <button onClick={saveStage} disabled={!stageForm.name.trim()} className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-xs disabled:opacity-50">Salvar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
