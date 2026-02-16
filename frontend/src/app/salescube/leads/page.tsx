"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, X, ChevronLeft, ChevronRight, Download, Upload,
  Trash2, ArrowRight, UserPlus, ChevronDown, ChevronUp,
  Save, Phone, Mail, Calendar, FileText,
  Building, User, CheckCircle2, Circle,
  SlidersHorizontal, Bookmark, BookmarkPlus,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import {
  leadApi, stageApi, pipelineApi, taskApi,
  originApi, squadApi, franchiseApi,
  type Lead, type LeadDetail,
  type PipelineStage, type Pipeline,
  type Origin, type Squad, type Franchise,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

const SOURCE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "manual", label: "Manual" },
  { value: "import", label: "Import" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
  { value: "api", label: "API" },
  { value: "webhook", label: "Webhook" },
  { value: "referral", label: "Indicacao" },
  { value: "event", label: "Evento" },
  { value: "other", label: "Outro" },
];

const ORDERING_OPTIONS = [
  { value: "-created_at", label: "Mais recentes" },
  { value: "created_at", label: "Mais antigos" },
  { value: "name", label: "Nome A-Z" },
  { value: "-name", label: "Nome Z-A" },
  { value: "-score", label: "Maior score" },
  { value: "score", label: "Menor score" },
  { value: "-value", label: "Maior valor" },
  { value: "value", label: "Menor valor" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const NOTE_TYPE_OPTIONS = [
  { value: "note", label: "Nota", icon: FileText },
  { value: "call", label: "Ligacao", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Reuniao", icon: Calendar },
  { value: "task", label: "Tarefa", icon: CheckCircle2 },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-gray-500/20 text-gray-400" },
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatSourceLabel(source: string) {
  const found = SOURCE_OPTIONS.find((s) => s.value === source);
  return found ? found.label : source;
}

// ============================================================================
// Filter Presets
// ============================================================================

interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

interface FilterState {
  search: string;
  email: string;
  phone: string;
  pipeline: string;
  stage: string;
  noStage: boolean;
  assignedTo: string;
  source: string;
  origin: string;
  squad: string;
  franchise: string;
  scoreMin: string;
  scoreMax: string;
  ordering: string;
  pageSize: number;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
}

const defaultFilters: FilterState = {
  search: "",
  email: "",
  phone: "",
  pipeline: "",
  stage: "",
  noStage: false,
  assignedTo: "",
  source: "",
  origin: "",
  squad: "",
  franchise: "",
  scoreMin: "",
  scoreMax: "",
  ordering: "-created_at",
  pageSize: 25,
  createdFrom: "",
  createdTo: "",
  updatedFrom: "",
  updatedTo: "",
};

function loadPresets(): FilterPreset[] {
  try {
    const raw = localStorage.getItem("sc_lead_filter_presets");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePresets(presets: FilterPreset[]) {
  localStorage.setItem("sc_lead_filter_presets", JSON.stringify(presets));
}

// ============================================================================
// Skeleton Components
// ============================================================================

function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-700/50">
          <div className="w-4 h-4 bg-gray-700 rounded" />
          <div className="w-32 h-4 bg-gray-700 rounded" />
          <div className="w-40 h-4 bg-gray-700 rounded" />
          <div className="w-24 h-4 bg-gray-700 rounded" />
          <div className="w-20 h-4 bg-gray-700 rounded" />
          <div className="w-20 h-4 bg-gray-700 rounded" />
          <div className="w-16 h-4 bg-gray-700 rounded" />
          <div className="w-20 h-4 bg-gray-700 rounded" />
          <div className="w-16 h-4 bg-gray-700 rounded" />
          <div className="w-20 h-4 bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Lead Detail Drawer
// ============================================================================

type DrawerTab = "dados" | "notas" | "comentarios" | "historico" | "tarefas" | "vendas";

interface LeadDrawerProps {
  leadId: string;
  stages: PipelineStage[];
  pipelines: Pipeline[];
  onClose: () => void;
  onUpdated: () => void;
}

function LeadDrawer({ leadId, stages, pipelines, onClose, onUpdated }: LeadDrawerProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>("dados");

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", company: "", source: "manual",
    value: "0", score: 0, stage: "", assigned_to: "" as string | null,
    notes: "", lost_reason: "", cpf: "", origin: "" as string | null,
  });
  const [origins, setOrigins] = useState<Origin[]>([]);

  const [newNote, setNewNote] = useState({ content: "", note_type: "note" });
  const [addingNote, setAddingNote] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", due_date: "", priority: "medium" });

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
        assigned_to: data.assigned_to || "",
        notes: data.notes || "",
        lost_reason: data.lost_reason || "",
        cpf: (data as any).cpf || "",
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...formData };
      if (!payload.assigned_to) payload.assigned_to = null;
      if (!payload.origin) delete payload.origin;
      await leadApi.update(leadId, payload);
      onUpdated();
    } catch (err) {
      console.error("Failed to save:", err);
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
      console.error("Failed to delete:", err);
    }
  };

  const handleMoveLead = async (stageId: string) => {
    try {
      await leadApi.move(leadId, stageId);
      setFormData((prev) => ({ ...prev, stage: stageId }));
      fetchLead();
    } catch (err) {
      console.error("Failed to move:", err);
    }
  };

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
      console.error("Failed to create task:", err);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      await taskApi.update(taskId, { status: currentStatus === "completed" ? "pending" : "completed" });
      fetchLead();
    } catch (err) {
      console.error(err);
    }
  };

  // Current pipeline stages
  const currentPipelineId = lead?.pipeline_id || (stages.find((s) => s.id === formData.stage)?.pipeline);
  const pipelineStages = currentPipelineId
    ? stages.filter((s) => s.pipeline === currentPipelineId)
    : stages;

  const tabs: { id: DrawerTab; label: string; count?: number }[] = [
    { id: "dados", label: "Dados" },
    { id: "notas", label: "Notas", count: lead?.lead_notes?.length || 0 },
    { id: "comentarios", label: "Comentarios", count: lead?.comments?.length || 0 },
    { id: "historico", label: "Historico", count: lead?.activities?.length || 0 },
    { id: "tarefas", label: "Tarefas", count: lead?.tasks?.length || 0 },
    { id: "vendas", label: "Vendas", count: lead?.sales?.length || 0 },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" />
              <div>
                <div className="w-40 h-5 bg-gray-700 rounded animate-pulse mb-1" />
                <div className="w-24 h-3 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ) : lead ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">{lead.name}</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{
                      backgroundColor: `${lead.stage_color || "#6366f1"}20`,
                      color: lead.stage_color || "#818cf8",
                    }}
                  >
                    {lead.stage_name || "Sem estagio"}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-bold",
                      lead.score >= 80 ? "bg-green-500/20 text-green-400" :
                      lead.score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-gray-700 text-gray-400"
                    )}
                  >
                    Score {lead.score}
                  </span>
                  {lead.origin_name && (
                    <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400">{lead.origin_name}</span>
                  )}
                  {lead.company && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" /> {lead.company}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-100 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-4 flex-shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.id
                  ? "text-indigo-400 border-indigo-400"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !lead ? (
            <p className="text-center text-gray-500 py-10">Lead nao encontrado</p>
          ) : (
            <>
              {/* ===== TAB: DADOS ===== */}
              {activeTab === "dados" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nome *</label>
                      <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Empresa</label>
                      <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Email</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">CPF</label>
                      <input type="text" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Fonte</label>
                      <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors">
                        {SOURCE_OPTIONS.filter((s) => s.value).map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Valor (R$)</label>
                      <input type="number" step="0.01" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Score</label>
                      <input type="number" min={0} max={100} value={formData.score} onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Estagio</label>
                      <select value={formData.stage} onChange={(e) => handleMoveLead(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors">
                        <option value="">Sem estagio</option>
                        {pipelineStages.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Responsavel</label>
                      <input type="text" value={formData.assigned_to || ""} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value || null })}
                        placeholder={lead.assigned_to_name || "Nao atribuido"}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Motivo de perda</label>
                    <input type="text" value={formData.lost_reason} onChange={(e) => setFormData({ ...formData, lost_reason: e.target.value })}
                      placeholder="Caso o lead tenha sido perdido..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Observacoes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
                  </div>

                  {/* Origin, Responsibles, Squads, Franchises */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Origem</label>
                      <select value={formData.origin || ""} onChange={(e) => setFormData({ ...formData, origin: e.target.value || null })}
                        className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors">
                        <option value="">Selecionar origem...</option>
                        {origins.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                    {lead.responsibles_names && lead.responsibles_names.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Responsaveis</label>
                        <div className="flex flex-wrap gap-1">
                          {lead.responsibles_names.map((name, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {lead.squad_names && lead.squad_names.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Squads</label>
                        <div className="flex flex-wrap gap-1">
                          {lead.squad_names.map((name, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">{name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {lead.franchise_names && lead.franchise_names.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Franquias</label>
                        <div className="flex flex-wrap gap-1">
                          {lead.franchise_names.map((name, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">{name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags display */}
                  {(lead as any).tags && (lead as any).tags.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tags</label>
                      <div className="flex flex-wrap gap-1">
                        {((lead as any).tags || []).map((tag: any, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                            {typeof tag === "string" ? tag : tag.name || tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== TAB: NOTAS ===== */}
              {activeTab === "notas" && (
                <div className="space-y-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {NOTE_TYPE_OPTIONS.map((opt) => (
                        <button key={opt.value} onClick={() => setNewNote({ ...newNote, note_type: opt.value })}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                            newNote.note_type === opt.value ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                          )}>
                          <opt.icon className="w-3 h-3" /> {opt.label}
                        </button>
                      ))}
                    </div>
                    <textarea value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      placeholder="Escreva uma nota..." rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none mb-2 focus:border-indigo-500 outline-none" />
                    <div className="flex justify-end">
                      <button onClick={handleAddNote} disabled={!newNote.content.trim() || addingNote}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50">
                        {addingNote ? "Salvando..." : "Adicionar"}
                      </button>
                    </div>
                  </div>
                  {(lead.lead_notes || []).map((note) => {
                    const TypeIcon = NOTE_TYPE_OPTIONS.find((o) => o.value === note.note_type)?.icon || FileText;
                    return (
                      <div key={note.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-200">{note.user_name || "Sistema"}</span>
                            <span className="text-xs text-gray-600">{timeAgo(note.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-400 whitespace-pre-wrap">{note.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  {(!lead.lead_notes || lead.lead_notes.length === 0) && (
                    <p className="text-center text-sm text-gray-600 py-8">Nenhuma nota ainda</p>
                  )}
                </div>
              )}

              {/* ===== TAB: COMENTARIOS (PROD comments) ===== */}
              {activeTab === "comentarios" && (
                <div className="space-y-3">
                  {(lead.comments || []).map((comment: any) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-200">{comment.author_name || "Sistema"}</span>
                          <span className="text-xs text-gray-600">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {(!lead.comments || lead.comments.length === 0) && (
                    <p className="text-center text-sm text-gray-600 py-8">Nenhum comentario</p>
                  )}
                </div>
              )}

              {/* ===== TAB: HISTORICO ===== */}
              {activeTab === "historico" && (
                <div className="space-y-1">
                  {(lead.activities || []).map((activity, i) => (
                    <div key={activity.id} className="flex gap-3 py-2">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-gray-600 mt-2" />
                        {i < (lead.activities?.length || 0) - 1 && <div className="w-px flex-1 bg-gray-800 mt-1" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-300">
                            {activity.action === "lead_created" && "Lead criado"}
                            {activity.action === "stage_changed" && (
                              <>Movido de <span className="text-gray-100">{activity.old_value}</span> para <span className="text-indigo-400">{activity.new_value}</span></>
                            )}
                            {activity.action === "assigned_changed" && (
                              <>Responsavel alterado para <span className="text-indigo-400">{activity.new_value || "ninguem"}</span></>
                            )}
                            {activity.action === "score_changed" && (
                              <>Score alterado de {activity.old_value} para <span className="text-indigo-400">{activity.new_value}</span></>
                            )}
                            {activity.action === "note_added" && "Nota adicionada"}
                            {activity.action === "comment_added" && (
                              <>Comentario: <span className="text-gray-400 italic">{activity.new_value}</span></>
                            )}
                            {!["lead_created", "stage_changed", "assigned_changed", "score_changed", "note_added", "comment_added"].includes(activity.action) && activity.action}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {activity.user_name && <span>{activity.user_name} - </span>}
                          {timeAgo(activity.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!lead.activities || lead.activities.length === 0) && (
                    <p className="text-center text-sm text-gray-600 py-8">Nenhuma atividade registrada</p>
                  )}
                </div>
              )}

              {/* ===== TAB: TAREFAS ===== */}
              {activeTab === "tarefas" && (
                <div className="space-y-3">
                  {!showTaskForm ? (
                    <button onClick={() => setShowTaskForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors">
                      <Plus className="w-4 h-4" /> Nova Tarefa
                    </button>
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                      <input type="text" placeholder="Titulo *" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" autoFocus />
                      <textarea placeholder="Descricao" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={2}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none" />
                      <div className="flex gap-2">
                        <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                        <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                          className="bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                          <option value="low">Baixa</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowTaskForm(false)} className="px-3 py-1.5 text-xs text-gray-400">Cancelar</button>
                        <button onClick={handleAddTask} disabled={!newTask.title.trim()}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs disabled:opacity-50">Criar</button>
                      </div>
                    </div>
                  )}
                  {(lead.tasks || []).map((task) => {
                    const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const isCompleted = task.status === "completed";
                    return (
                      <div key={task.id} className="flex items-start gap-3 bg-gray-800 border border-gray-700 rounded-lg p-3">
                        <button onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className={cn("mt-0.5", isCompleted ? "text-green-400" : "text-gray-500 hover:text-indigo-400")}>
                          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-medium", isCompleted ? "text-gray-500 line-through" : "text-gray-100")}>{task.title}</span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", priorityConfig.color)}>{priorityConfig.label}</span>
                          </div>
                          {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                          {task.due_date && (
                            <span className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!lead.tasks || lead.tasks.length === 0) && !showTaskForm && (
                    <p className="text-center text-sm text-gray-600 py-8">Nenhuma tarefa vinculada</p>
                  )}
                </div>
              )}

              {/* ===== TAB: VENDAS ===== */}
              {activeTab === "vendas" && (
                <div className="space-y-3">
                  {(lead.sales || []).map((sale) => (
                    <div key={sale.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-indigo-400">{formatCurrency(sale.total_value)}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          sale.stage === "won" ? "bg-green-500/20 text-green-400" :
                          sale.stage === "lost" ? "bg-red-500/20 text-red-400" :
                          sale.stage === "proposal" ? "bg-purple-500/20 text-purple-400" :
                          "bg-blue-500/20 text-blue-400"
                        )}>
                          {sale.stage === "negotiation" ? "Negociacao" :
                           sale.stage === "proposal" ? "Proposta" :
                           sale.stage === "won" ? "Ganha" :
                           sale.stage === "lost" ? "Perdida" : sale.stage}
                        </span>
                      </div>
                      {sale.notes && <p className="text-xs text-gray-500">{sale.notes}</p>}
                      <div className="text-xs text-gray-600 mt-1">{formatDate(sale.created_at)}</div>
                    </div>
                  ))}
                  {(!lead.sales || lead.sales.length === 0) && (
                    <p className="text-center text-sm text-gray-600 py-8">Nenhuma venda vinculada</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 flex-shrink-0">
          <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-2 text-red-400 hover:text-red-300 text-sm transition-colors">
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
          <div className="flex items-center gap-2">
            <select value={formData.stage} onChange={(e) => handleMoveLead(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm">
              <option value="">Mover Estagio</option>
              {pipelineStages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !formData.name}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function LeadsPage() {
  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [allStages, setAllStages] = useState<PipelineStage[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Filter presets
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk modals
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [bulkMoveStage, setBulkMoveStage] = useState("");
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignUser, setBulkAssignUser] = useState("");

  // Add lead modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", source: "manual", value: "0", stage: "" });

  // Drawer
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);

  // ========================================================================
  // Load presets on mount
  // ========================================================================

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  // ========================================================================
  // Filtered stages (dependent on selected pipeline)
  // ========================================================================

  const filteredStages = useMemo(() => {
    if (!filters.pipeline) return allStages;
    return allStages.filter((s) => s.pipeline === filters.pipeline);
  }, [allStages, filters.pipeline]);

  // ========================================================================
  // Active filter count
  // ========================================================================

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.email) count++;
    if (filters.phone) count++;
    if (filters.pipeline) count++;
    if (filters.stage) count++;
    if (filters.noStage) count++;
    if (filters.assignedTo) count++;
    if (filters.source) count++;
    if (filters.origin) count++;
    if (filters.squad) count++;
    if (filters.franchise) count++;
    if (filters.scoreMin) count++;
    if (filters.scoreMax) count++;
    if (filters.createdFrom) count++;
    if (filters.createdTo) count++;
    if (filters.updatedFrom) count++;
    if (filters.updatedTo) count++;
    if (filters.ordering !== "-created_at") count++;
    if (filters.pageSize !== 25) count++;
    return count;
  }, [filters]);

  // ========================================================================
  // Fetch data
  // ========================================================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: filters.pageSize.toString(),
        offset: ((page - 1) * filters.pageSize).toString(),
      };

      // Backend-supported filters
      if (filters.search) params.search = filters.search;
      if (filters.pipeline) params.pipeline = filters.pipeline;
      if (filters.stage) params.stage = filters.stage;
      if (filters.source) params.source = filters.source;
      if (filters.assignedTo) params.assigned_to = filters.assignedTo;
      if (filters.scoreMin) params.score_min = filters.scoreMin;
      if (filters.scoreMax) params.score_max = filters.scoreMax;
      if (filters.ordering) params.ordering = filters.ordering;

      // Email / phone: use search if no main search (backend searches name+email+phone+company)
      // If user put specific email/phone, we append to search
      if (filters.email && !filters.search) params.search = filters.email;
      if (filters.phone && !filters.search && !filters.email) params.search = filters.phone;

      // Date range filters (try as query params - backend may or may not support)
      if (filters.createdFrom) params.created_at__gte = filters.createdFrom;
      if (filters.createdTo) params.created_at__lte = filters.createdTo;
      if (filters.updatedFrom) params.updated_at__gte = filters.updatedFrom;
      if (filters.updatedTo) params.updated_at__lte = filters.updatedTo;

      // Sprint 3 filters
      if (filters.origin) params.origin = filters.origin;
      if (filters.squad) params.squads = filters.squad;
      if (filters.franchise) params.franchises = filters.franchise;

      const [leadsRes, pipelinesRes, stagesRes, originsRes, squadsRes, franchisesRes] = await Promise.all([
        leadApi.list(params),
        pipelineApi.list(),
        stageApi.list(),
        originApi.list({ limit: "500" }),
        squadApi.list({ limit: "500" }),
        franchiseApi.list({ limit: "500" }),
      ]);

      const leadsData = leadsRes.data;
      setLeads(leadsData.results || leadsData);
      setTotalCount(leadsData.count || (leadsData.results || leadsData).length);

      const pipelinesData = pipelinesRes.data;
      setPipelines(pipelinesData.results || pipelinesData);

      const stagesData = stagesRes.data;
      const stagesList = stagesData.results || stagesData;
      setAllStages(stagesList);

      setOrigins(originsRes.data.results || originsRes.data);
      setSquads(squadsRes.data.results || squadsRes.data);
      setFranchises(franchisesRes.data.results || franchisesRes.data);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset page when filters change
  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setSelectedIds(new Set());
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
    setSelectedIds(new Set());
  };

  // ========================================================================
  // Presets
  // ========================================================================

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const preset: FilterPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      filters: { ...filters },
    };
    const updated = [...presets, preset];
    setPresets(updated);
    savePresets(updated);
    setNewPresetName("");
    setShowPresetMenu(false);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    setPage(1);
    setSelectedIds(new Set());
    setShowPresetMenu(false);
  };

  const handleDeletePreset = (presetId: string) => {
    const updated = presets.filter((p) => p.id !== presetId);
    setPresets(updated);
    savePresets(updated);
  };

  // ========================================================================
  // Selection
  // ========================================================================

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(leads.map((l) => l.id)));
  };

  // ========================================================================
  // Bulk Actions
  // ========================================================================

  const handleBulkMove = async () => {
    if (!bulkMoveStage || selectedIds.size === 0) return;
    try {
      await leadApi.bulkMove(Array.from(selectedIds), bulkMoveStage);
      setSelectedIds(new Set());
      setShowBulkMoveModal(false);
      setBulkMoveStage("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) return;
    try {
      await leadApi.bulkAssign(Array.from(selectedIds), bulkAssignUser || null);
      setSelectedIds(new Set());
      setShowBulkAssignModal(false);
      setBulkAssignUser("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.size} leads selecionados? Esta acao nao pode ser desfeita.`)) return;
    try {
      await leadApi.bulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      fetchData();
    } catch (err) {
      // Fallback to individual deletes
      try {
        await Promise.all(Array.from(selectedIds).map((id) => leadApi.delete(id)));
        setSelectedIds(new Set());
        fetchData();
      } catch (err2) {
        console.error(err2);
      }
    }
  };

  // ========================================================================
  // Add Lead
  // ========================================================================

  const handleAddLead = async () => {
    try {
      await leadApi.create(newLead);
      setShowAddModal(false);
      setNewLead({ name: "", email: "", phone: "", company: "", source: "manual", value: "0", stage: "" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // ========================================================================
  // CSV Export
  // ========================================================================

  const handleExportCSV = () => {
    const headers = ["Nome", "Email", "Telefone", "Empresa", "Pipeline", "Estagio", "Score", "Fonte", "Valor", "Responsavel", "Criado"];
    const rows = leads.map((l) => [
      l.name, l.email, l.phone, l.company, l.pipeline || "",
      l.stage_name || "", l.score, l.source, l.value,
      l.assigned_to_name || "", l.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v || ""}"`).join(","))].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ========================================================================
  // Pagination
  // ========================================================================

  const totalPages = Math.ceil(totalCount / filters.pageSize);
  const startItem = (page - 1) * filters.pageSize + 1;
  const endItem = Math.min(page * filters.pageSize, totalCount);

  const paginationPages = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  // ========================================================================
  // Find pipeline name for a lead
  // ========================================================================

  const getPipelineName = (lead: Lead) => {
    const stage = allStages.find((s) => s.id === lead.stage);
    if (!stage) return "-";
    const pip = pipelines.find((p) => p.id === stage.pipeline);
    return pip?.name || "-";
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm text-gray-400">
            {totalCount.toLocaleString("pt-BR")} leads encontrados
            {selectedIds.size > 0 && (
              <span className="text-indigo-400 ml-2">({selectedIds.size} selecionados)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Menu */}
          <div className="relative">
            <button onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-gray-100 text-sm transition-colors border border-gray-700 rounded-lg hover:bg-gray-800">
              <Bookmark className="w-4 h-4" /> Filtros salvos
            </button>
            {showPresetMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowPresetMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-40 p-3">
                  <p className="text-xs text-gray-500 font-medium mb-2">FILTROS SALVOS</p>
                  {presets.length === 0 && (
                    <p className="text-xs text-gray-600 py-2">Nenhum filtro salvo</p>
                  )}
                  {presets.map((preset) => (
                    <div key={preset.id} className="flex items-center justify-between py-1.5 group">
                      <button onClick={() => handleLoadPreset(preset)} className="text-sm text-gray-300 hover:text-indigo-400 truncate flex-1 text-left">
                        {preset.name}
                      </button>
                      <button onClick={() => handleDeletePreset(preset.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-gray-700 mt-2 pt-2">
                    <div className="flex gap-2">
                      <input type="text" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="Nome do preset..." onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-500" />
                      <button onClick={handleSavePreset} disabled={!newPresetName.trim()}
                        className="px-2 py-1 bg-indigo-600 text-white rounded text-xs disabled:opacity-50 hover:bg-indigo-700">
                        <BookmarkPlus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-gray-100 text-sm transition-colors border border-gray-700 rounded-lg hover:bg-gray-800">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-gray-100 text-sm transition-colors border border-gray-700 rounded-lg hover:bg-gray-800 cursor-not-allowed opacity-50" title="Em breve">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-4 py-2.5 flex-wrap">
          <span className="text-sm text-indigo-300 font-medium">{selectedIds.size} selecionados</span>
          <div className="h-4 w-px bg-indigo-500/30" />
          <button onClick={() => setShowBulkMoveModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <ArrowRight className="w-3 h-3" /> Mover Estagio
          </button>
          <button onClick={() => setShowBulkAssignModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors">
            <UserPlus className="w-3 h-3" /> Atribuir Responsavel
          </button>
          <button onClick={handleBulkDelete}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
            <Trash2 className="w-3 h-3" /> Excluir
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-gray-400 hover:text-gray-200">
            Limpar selecao
          </button>
        </div>
      )}

      {/* Search Bar + Filter Toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Buscar por nome, email, telefone, empresa..."
            value={filters.search} onChange={(e) => updateFilter("search", e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors" />
          {filters.search && (
            <button onClick={() => updateFilter("search", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors",
            showFilters || activeFilterCount > 0
              ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-100"
          )}>
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Nome */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Nome do Lead</label>
              <input type="text" value={filters.search} onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Buscar nome..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 outline-none" />
            </div>
            {/* Email */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Email</label>
              <input type="text" value={filters.email} onChange={(e) => updateFilter("email", e.target.value)}
                placeholder="Buscar email..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 outline-none" />
            </div>
            {/* Telefone */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Telefone</label>
              <input type="text" value={filters.phone} onChange={(e) => updateFilter("phone", e.target.value)}
                placeholder="Buscar telefone..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 outline-none" />
            </div>
            {/* Pipeline */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Pipeline / Quadro</label>
              <select value={filters.pipeline} onChange={(e) => { updateFilter("pipeline", e.target.value); updateFilter("stage", ""); }}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none">
                <option value="">Todos</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {/* Estagio */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Estagio / Coluna</label>
              <select value={filters.stage} onChange={(e) => updateFilter("stage", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none">
                <option value="">Todos</option>
                {filteredStages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {/* Sem Coluna */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Sem Coluna</label>
              <label className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={filters.noStage} onChange={(e) => updateFilter("noStage", e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500" />
                <span className="text-gray-300">Apenas sem coluna</span>
              </label>
            </div>
            {/* Fonte */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Origem / Source</label>
              <select value={filters.source} onChange={(e) => updateFilter("source", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none">
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {/* Origem */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Origem</label>
              <select value={filters.origin} onChange={(e) => updateFilter("origin", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none">
                <option value="">Todas</option>
                {origins.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            {/* Squad */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Squad</label>
              <select value={filters.squad} onChange={(e) => updateFilter("squad", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none">
                <option value="">Todos</option>
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {/* Franquia */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Franquia</label>
              <select value={filters.franchise} onChange={(e) => updateFilter("franchise", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none">
                <option value="">Todas</option>
                {franchises.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            {/* Responsavel */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Responsavel</label>
              <input type="text" value={filters.assignedTo} onChange={(e) => updateFilter("assignedTo", e.target.value)}
                placeholder="ID do usuario..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 outline-none" />
            </div>
            {/* Score Min */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Score Minimo</label>
              <input type="number" min={0} max={100} value={filters.scoreMin} onChange={(e) => updateFilter("scoreMin", e.target.value)}
                placeholder="0" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 outline-none" />
            </div>
            {/* Score Max */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Score Maximo</label>
              <input type="number" min={0} max={100} value={filters.scoreMax} onChange={(e) => updateFilter("scoreMax", e.target.value)}
                placeholder="100" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 outline-none" />
            </div>
            {/* Criado de */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Criado de</label>
              <input type="date" value={filters.createdFrom} onChange={(e) => updateFilter("createdFrom", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-indigo-500 outline-none" />
            </div>
            {/* Criado ate */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Criado ate</label>
              <input type="date" value={filters.createdTo} onChange={(e) => updateFilter("createdTo", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-indigo-500 outline-none" />
            </div>
            {/* Atualizado de */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Ult. Alteracao de</label>
              <input type="date" value={filters.updatedFrom} onChange={(e) => updateFilter("updatedFrom", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-indigo-500 outline-none" />
            </div>
            {/* Atualizado ate */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Ult. Alteracao ate</label>
              <input type="date" value={filters.updatedTo} onChange={(e) => updateFilter("updatedTo", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-indigo-500 outline-none" />
            </div>
            {/* Ordenacao */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Ordenacao</label>
              <select value={filters.ordering} onChange={(e) => updateFilter("ordering", e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none">
                {ORDERING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {/* Qtd por pagina */}
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block uppercase tracking-wide">Qtd por pagina</label>
              <select value={filters.pageSize} onChange={(e) => updateFilter("pageSize", parseInt(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 outline-none">
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* DataTable */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0} onChange={toggleSelectAll}
                    className="rounded border-gray-600 bg-gray-900 text-indigo-500 focus:ring-indigo-500" />
                </th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Nome</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Email</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Telefone</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Estagio</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Pipeline</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Fonte</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Origem</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Score</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Valor</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden xl:table-cell">Responsavel</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden 2xl:table-cell">Tags</th>
                <th className="px-3 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Criacao</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13}>
                    <TableSkeleton rows={filters.pageSize > 25 ? 15 : filters.pageSize} />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-gray-600" />
                      <p className="text-gray-500 font-medium">Nenhum lead encontrado</p>
                      <p className="text-gray-600 text-xs">Tente ajustar os filtros ou criar um novo lead</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer",
                      selectedIds.has(lead.id) && "bg-indigo-500/5"
                    )}
                    onClick={() => setDrawerLeadId(lead.id)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)}
                        className="rounded border-gray-600 bg-gray-900 text-indigo-500 focus:ring-indigo-500" />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-gray-100 font-medium truncate block max-w-[180px]">{lead.name}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-gray-400 truncate block max-w-[180px]">{lead.email || "-"}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-gray-400">{lead.phone || "-"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium"
                        style={{
                          backgroundColor: `${lead.stage_color || "#6366f1"}20`,
                          color: lead.stage_color || "#818cf8",
                        }}>
                        {lead.stage_name || "Sem estagio"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <span className="text-gray-500 text-xs">{getPipelineName(lead)}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-gray-400 text-xs">{formatSourceLabel(lead.source)}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <span className="text-gray-400 text-xs">{lead.origin_name || "-"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        lead.score >= 80 ? "bg-green-500/20 text-green-400" :
                        lead.score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-700 text-gray-400"
                      )}>{lead.score}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-indigo-400 font-medium text-xs">{formatCurrency(lead.value)}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <span className="text-gray-400 text-xs truncate block max-w-[100px]">{lead.assigned_to_name || "-"}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden 2xl:table-cell">
                      <div className="flex gap-1 flex-wrap max-w-[120px]">
                        {((lead as any).tags || []).slice(0, 2).map((tag: any, i: number) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400">
                            {typeof tag === "string" ? tag : tag.name || "tag"}
                          </span>
                        ))}
                        {((lead as any).tags || []).length > 2 && (
                          <span className="text-[10px] text-gray-600">+{(lead as any).tags.length - 2}</span>
                        )}
                        {(!(lead as any).tags || (lead as any).tags.length === 0) && (
                          <span className="text-gray-600 text-[10px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-gray-500 text-xs whitespace-nowrap">{formatDate(lead.created_at)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && !loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <span className="text-xs text-gray-500">
              {totalCount > 0 ? `${startItem}-${endItem} de ${totalCount.toLocaleString("pt-BR")}` : "0 resultados"}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="p-1.5 text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="p-1.5 text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {paginationPages.map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-600 text-xs">...</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className={cn(
                      "w-8 h-8 rounded text-xs transition-colors",
                      page === p ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-100 hover:bg-gray-700"
                    )}>
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="p-1.5 text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="p-1.5 text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* MODALS */}
      {/* ================================================================== */}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Novo Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 outline-none" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <input type="email" placeholder="Email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 outline-none" />
                <input type="tel" placeholder="Telefone" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 outline-none" />
              </div>
              <input type="text" placeholder="Empresa" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                  {SOURCE_OPTIONS.filter((s) => s.value).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <input type="number" placeholder="Valor (R$)" value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 outline-none" />
              </div>
              <select value={newLead.stage} onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione o estagio</option>
                {pipelines.map((pipeline) => (
                  <optgroup key={pipeline.id} label={pipeline.name}>
                    {allStages.filter((s) => s.pipeline === pipeline.id).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancelar</button>
              <button onClick={handleAddLead} disabled={!newLead.name}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move Modal */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowBulkMoveModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Mover {selectedIds.size} leads</h2>
            <select value={bulkMoveStage} onChange={(e) => setBulkMoveStage(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm mb-4">
              <option value="">Selecione o estagio</option>
              {pipelines.map((pipeline) => (
                <optgroup key={pipeline.id} label={pipeline.name}>
                  {allStages.filter((s) => s.pipeline === pipeline.id).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkMoveModal(false)} className="px-4 py-2 text-sm text-gray-400">Cancelar</button>
              <button onClick={handleBulkMove} disabled={!bulkMoveStage}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-indigo-700 transition-colors">Mover</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowBulkAssignModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Atribuir Responsavel</h2>
            <p className="text-sm text-gray-400 mb-3">{selectedIds.size} leads selecionados</p>
            <input type="text" placeholder="ID do usuario (vazio = remover)" value={bulkAssignUser} onChange={(e) => setBulkAssignUser(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 mb-4 focus:border-indigo-500 outline-none" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkAssignModal(false)} className="px-4 py-2 text-sm text-gray-400">Cancelar</button>
              <button onClick={handleBulkAssign}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">Atribuir</button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer */}
      {drawerLeadId && (
        <LeadDrawer
          leadId={drawerLeadId}
          stages={allStages}
          pipelines={pipelines}
          onClose={() => setDrawerLeadId(null)}
          onUpdated={() => { setDrawerLeadId(null); fetchData(); }}
        />
      )}
    </div>
  );
}
