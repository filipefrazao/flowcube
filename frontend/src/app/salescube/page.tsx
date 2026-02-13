"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, ChevronRight } from "lucide-react";
import { pipelineApi, stageApi, leadApi, type Pipeline, type PipelineStage, type Lead } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

export default function SalesCubeKanban() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<string>("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const [movingLead, setMovingLead] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToStage, setAddToStage] = useState("");
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", value: "0" });

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

  const handleMoveLead = async (leadId: string, targetStageId: string) => {
    setMovingLead(leadId);
    try {
      await leadApi.move(leadId, targetStageId);
      await fetchBoard();
    } catch (err) {
      console.error("Failed to move lead:", err);
    } finally {
      setMovingLead(null);
    }
  };

  const handleAddLead = async () => {
    try {
      await leadApi.create({ ...newLead, stage: addToStage });
      setShowAddModal(false);
      setNewLead({ name: "", email: "", phone: "", company: "", value: "0" });
      await fetchBoard();
    } catch (err) {
      console.error("Failed to add lead:", err);
    }
  };

  const formatValue = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) return "R$ 0";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">SalesCube</h1>
          <p className="text-sm text-gray-400">Quadro Kanban de Vendas</p>
        </div>
        <div className="flex items-center gap-3">
          {pipelines.length > 1 && (
            <select
              value={activePipeline}
              onChange={(e) => setActivePipeline(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button onClick={fetchBoard} className="p-2 text-gray-400 hover:text-gray-100 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const leads = leadsByStage[stage.id] || [];
          const stageValue = leads.reduce((sum, l) => sum + parseFloat(l.value || "0"), 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col">
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || "#6366f1" }} />
                  <h3 className="text-sm font-semibold text-gray-100">{stage.name}</h3>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{leads.length}</span>
                </div>
                <button
                  onClick={() => { setAddToStage(stage.id); setShowAddModal(true); }}
                  className="p-1 text-gray-500 hover:text-indigo-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Stage Value */}
              <div className="px-1 mb-2">
                <span className="text-xs text-gray-500">{formatValue(stageValue.toString())}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={cn(
                      "bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors",
                      movingLead === lead.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-100 truncate flex-1">{lead.name}</h4>
                      {lead.score > 0 && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2",
                          lead.score >= 80 ? "bg-green-500/20 text-green-400" :
                          lead.score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-gray-700 text-gray-400"
                        )}>
                          {lead.score}
                        </span>
                      )}
                    </div>
                    {lead.company && (
                      <p className="text-xs text-gray-500 mb-1 truncate">{lead.company}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-indigo-400">{formatValue(lead.value)}</span>
                      {/* Move buttons */}
                      <div className="flex gap-1">
                        {stages.map((s, i) => {
                          if (s.id === stage.id) return null;
                          const currentIdx = stages.findIndex((st) => st.id === stage.id);
                          const diff = i - currentIdx;
                          if (Math.abs(diff) !== 1) return null;
                          return (
                            <button
                              key={s.id}
                              onClick={() => handleMoveLead(lead.id, s.id)}
                              disabled={movingLead === lead.id}
                              className={cn(
                                "p-1 rounded transition-colors",
                                diff > 0 ? "text-green-500 hover:bg-green-500/10" : "text-orange-500 hover:bg-orange-500/10"
                              )}
                              title={diff > 0 ? `Mover para ${s.name}` : `Voltar para ${s.name}`}
                            >
                              <ChevronRight className={cn("w-3 h-3", diff < 0 && "rotate-180")} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Novo Lead</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
              />
              <input
                type="tel"
                placeholder="Telefone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="Empresa"
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
              />
              <input
                type="number"
                placeholder="Valor (R$)"
                value={newLead.value}
                onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddLead}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
