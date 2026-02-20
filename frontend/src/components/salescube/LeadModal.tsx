"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Save, Trash2, Phone, Mail, MessageSquare, Calendar, Clock,
  FileText, ArrowRight, ChevronRight, Building, User, DollarSign,
  AlertCircle, CheckCircle2, Circle, Plus
} from "lucide-react";
import {
  leadApi, taskApi, saleApi, originApi, type LeadDetail, type LeadNote, type LeadActivityItem,
  type PipelineStage, type SalesTask, type Sale, type Origin
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface LeadModalProps {
  leadId: string;
  stages: PipelineStage[];
  onClose: () => void;
  onUpdated: () => void;
}

type TabType = "dados" | "notas" | "comentarios" | "historico" | "tarefas" | "vendas";

const NOTE_TYPE_OPTIONS = [
  { value: "note", label: "Nota", icon: FileText },
  { value: "call", label: "Ligacao", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Reuniao", icon: Calendar },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-gray-500/20 text-text-secondary" },
  medium: { label: "Media", color: "bg-yellow-500/20 text-yellow-400" },
  high: { label: "Alta", color: "bg-orange-500/20 text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-500/20 text-red-400" },
};

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(v: string | number) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "R$ 0,00";
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
  if (diffMin < 60) return `${diffMin}m atras`;
  if (diffHrs < 24) return `${diffHrs}h atras`;
  if (diffDays < 7) return `${diffDays}d atras`;
  return date.toLocaleDateString("pt-BR");
}

// ============================================================================
// Lead Modal Component
// ============================================================================

export default function LeadModal({ leadId, stages, onClose, onUpdated }: LeadModalProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("dados");

  // Editable fields
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", company: "", source: "manual",
    value: "0", score: 0, stage: "", notes: "", lost_reason: "", origin: "" as string | null,
  });
  const [origins, setOrigins] = useState<Origin[]>([]);

  // Notes
  const [newNote, setNewNote] = useState({ content: "", note_type: "note" });
  const [addingNote, setAddingNote] = useState(false);

  // Tasks
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", due_date: "", priority: "medium" });

  // ========================================================================
  // Fetch lead detail
  // ========================================================================

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadApi.get(leadId);
      const data = res.data;
      setLead(data);
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        company: data.company || "",
        source: data.source || "manual",
        value: data.value || "0",
        score: data.score || 0,
        stage: data.stage || "",
        notes: data.notes || "",
        lost_reason: data.lost_reason || "",
        origin: data.origin || "",
      });
    } catch (err) {
      console.error("Failed to load lead:", err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  useEffect(() => {
    originApi.list({ limit: "500" }).then((res) => {
      setOrigins(res.data.results || res.data);
    }).catch(console.error);
  }, []);

  // ========================================================================
  // Save lead
  // ========================================================================

  const handleSave = async () => {
    setSaving(true);
    try {
      await leadApi.update(leadId, formData);
      onUpdated();
    } catch (err) {
      console.error("Failed to save lead:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    try {
      await leadApi.delete(leadId);
      onUpdated();
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  const handleMoveLead = async (stageId: string) => {
    try {
      await leadApi.move(leadId, stageId);
      setFormData((prev) => ({ ...prev, stage: stageId }));
      fetchLead();
    } catch (err) {
      console.error("Failed to move lead:", err);
    }
  };

  // ========================================================================
  // Notes
  // ========================================================================

  const handleAddNote = async () => {
    if (!newNote.content.trim()) return;
    setAddingNote(true);
    try {
      await leadApi.addNote(leadId, newNote);
      setNewNote({ content: "", note_type: "note" });
      fetchLead();
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setAddingNote(false);
    }
  };

  // ========================================================================
  // Tasks
  // ========================================================================

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      await taskApi.create({
        ...newTask,
        lead: leadId,
        due_date: newTask.due_date || null,
        status: "pending",
      });
      setShowTaskForm(false);
      setNewTask({ title: "", description: "", due_date: "", priority: "medium" });
      fetchLead();
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await taskApi.update(taskId, { status: newStatus });
      fetchLead();
    } catch (err) {
      console.error(err);
    }
  };

  // ========================================================================
  // Render
  // ========================================================================

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-surface rounded-xl p-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "dados", label: "Dados" },
    { id: "notas", label: "Notas", count: lead.lead_notes?.length || 0 },
    { id: "comentarios", label: "Comentarios", count: lead.comments?.length || 0 },
    { id: "historico", label: "Historico", count: lead.activities?.length || 0 },
    { id: "tarefas", label: "Tarefas", count: lead.tasks?.length || 0 },
    { id: "vendas", label: "Vendas", count: lead.sales?.length || 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-background-secondary border border-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-gray-900 font-semibold text-sm">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{lead.name}</h2>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                {lead.origin_name && (
                  <span className="bg-surface px-2 py-0.5 rounded text-text-secondary">{lead.origin_name}</span>
                )}
                {lead.company && <span>{lead.company}</span>}
                <span>Criado {timeAgo(lead.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={formData.stage}
              onChange={(e) => handleMoveLead(e.target.value)}
              className="bg-surface border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "text-primary border-primary"
                  : "text-text-muted border-transparent hover:text-text-secondary"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-[10px] bg-surface text-text-secondary px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* TAB: Dados */}
          {activeTab === "dados" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Nome *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Empresa</label>
                  <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Telefone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Valor (R$)</label>
                  <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Score</label>
                  <input type="number" min={0} max={100} value={formData.score} onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Origem</label>
                  <select value={formData.origin || ""} onChange={(e) => setFormData({ ...formData, origin: e.target.value || null })} className="w-full bg-input border border-input-border text-text-primary rounded-lg px-3 py-2 text-sm">
                    <option value="">Selecionar origem...</option>
                    {origins.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Motivo de perda</label>
                  <input type="text" value={formData.lost_reason} onChange={(e) => setFormData({ ...formData, lost_reason: e.target.value })} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary" placeholder="Se perdido..." />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Observacoes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary resize-none" />
              </div>
            </div>
          )}

          {/* TAB: Notas */}
          {activeTab === "notas" && (
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {NOTE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setNewNote({ ...newNote, note_type: opt.value })}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                        newNote.note_type === opt.value
                          ? "bg-primary text-gray-900"
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <opt.icon className="w-3 h-3" />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  placeholder="Escreva uma nota..."
                  rows={2}
                  className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none mb-2"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.content.trim() || addingNote}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    {addingNote ? "Salvando..." : "Adicionar"}
                  </button>
                </div>
              </div>

              {(lead.lead_notes || []).map((note) => {
                const TypeIcon = NOTE_TYPE_OPTIONS.find((o) => o.value === note.note_type)?.icon || FileText;
                return (
                  <div key={note.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-4 h-4 text-text-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">{note.user_name || "Sistema"}</span>
                        <span className="text-xs text-text-muted">{timeAgo(note.created_at)}</span>
                      </div>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                );
              })}
              {(!lead.lead_notes || lead.lead_notes.length === 0) && (
                <p className="text-center text-sm text-text-muted py-8">Nenhuma nota ainda</p>
              )}
            </div>
          )}

          {/* TAB: Comentarios */}
          {activeTab === "comentarios" && (
            <div className="space-y-3">
              {(lead.comments || []).map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary">{comment.author_name || "Sistema"}</span>
                      <span className="text-xs text-text-muted">{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              ))}
              {(!lead.comments || lead.comments.length === 0) && (
                <p className="text-center text-sm text-text-muted py-8">Nenhum comentario</p>
              )}
            </div>
          )}

          {/* TAB: Historico */}
          {activeTab === "historico" && (
            <div className="space-y-1">
              {(lead.activities || []).map((activity, i) => (
                <div key={activity.id} className="flex gap-3 py-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-text-muted mt-2" />
                    {i < (lead.activities?.length || 0) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">
                        {activity.action === "lead_created" && "Lead criado"}
                        {activity.action === "stage_changed" && (
                          <>Movido de <span className="text-text-primary">{activity.old_value}</span> para <span className="text-primary">{activity.new_value}</span></>
                        )}
                        {activity.action === "assigned_changed" && (
                          <>Responsavel alterado para <span className="text-primary">{activity.new_value || "ninguem"}</span></>
                        )}
                        {activity.action === "score_changed" && (
                          <>Score alterado de {activity.old_value} para <span className="text-primary">{activity.new_value}</span></>
                        )}
                        {activity.action === "note_added" && "Nota adicionada"}
                        {!["lead_created", "stage_changed", "assigned_changed", "score_changed", "note_added"].includes(activity.action) && activity.action}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {activity.user_name && <span>{activity.user_name} - </span>}
                      {timeAgo(activity.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              {(!lead.activities || lead.activities.length === 0) && (
                <p className="text-center text-sm text-text-muted py-8">Nenhuma atividade registrada</p>
              )}
            </div>
          )}

          {/* TAB: Tarefas */}
          {activeTab === "tarefas" && (
            <div className="space-y-3">
              {!showTaskForm ? (
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-sm text-text-muted hover:text-primary hover:border-primary/30 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Nova Tarefa
                </button>
              ) : (
                <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
                  <input type="text" placeholder="Titulo *" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted" autoFocus />
                  <textarea placeholder="Descricao" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={2} className="w-full bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none" />
                  <div className="flex gap-2">
                    <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="flex-1 bg-input border border-input-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="bg-input border border-input-border text-text-primary rounded-lg px-3 py-2 text-sm">
                      <option value="low">Baixa</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowTaskForm(false)} className="px-3 py-1.5 text-xs text-text-secondary">Cancelar</button>
                    <button onClick={handleAddTask} disabled={!newTask.title.trim()} className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-xs disabled:opacity-50">Criar</button>
                  </div>
                </div>
              )}

              {(lead.tasks || []).map((task) => {
                const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                const isCompleted = task.status === "completed";
                return (
                  <div key={task.id} className="flex items-start gap-3 bg-surface border border-border rounded-lg p-3">
                    <button
                      onClick={() => handleToggleTaskStatus(task.id, task.status)}
                      className={cn("mt-0.5", isCompleted ? "text-green-400" : "text-text-muted hover:text-primary")}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", isCompleted ? "text-text-muted line-through" : "text-text-primary")}>{task.title}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", priorityConfig.color)}>{priorityConfig.label}</span>
                      </div>
                      {task.description && <p className="text-xs text-text-muted mt-0.5">{task.description}</p>}
                      {task.due_date && (
                        <span className="text-xs text-text-muted mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!lead.tasks || lead.tasks.length === 0) && !showTaskForm && (
                <p className="text-center text-sm text-text-muted py-8">Nenhuma tarefa vinculada</p>
              )}
            </div>
          )}

          {/* TAB: Vendas */}
          {activeTab === "vendas" && (
            <div className="space-y-3">
              {(lead.sales || []).map((sale) => (
                <div key={sale.id} className="bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-primary">{formatCurrency(sale.total_value)}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      sale.stage === "won" ? "bg-green-500/20 text-green-400" :
                      sale.stage === "lost" ? "bg-red-500/20 text-red-400" :
                      sale.stage === "proposal" ? "bg-purple-500/20 text-purple-400" :
                      "bg-blue-500/20 text-blue-400"
                    )}>
                      {sale.stage === "negotiation" ? "Negociacao" :
                       sale.stage === "proposal" ? "Proposta" :
                       sale.stage === "won" ? "Ganha" : "Perdida"}
                    </span>
                  </div>
                  {sale.notes && <p className="text-xs text-text-muted">{sale.notes}</p>}
                  <div className="text-xs text-text-muted mt-1">
                    {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))}
              {(!lead.sales || lead.sales.length === 0) && (
                <p className="text-center text-sm text-text-muted py-8">Nenhuma venda vinculada</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-2 text-red-400 hover:text-red-300 text-sm transition-colors">
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !formData.name} className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
