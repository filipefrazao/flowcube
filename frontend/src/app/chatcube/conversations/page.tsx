"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Send,
  ArrowLeft,
  MessageSquare,
  Phone,
  User,
  Tag,
  FileText,
  CheckSquare,
  DollarSign,
  PanelRight,
  PanelRightClose,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  Clock,
  CheckCheck,
  Check,
  PhoneCall,
  Mail,
  Users,
  StickyNote,
  Calendar,
  Building2,
  Hash,
  ExternalLink,
  LinkIcon,
} from "lucide-react";
import {
  chatApi,
  type ChatSession,
  type ChatSessionDetail,
  type ChatMessage,
} from "@/lib/api";
import {
  leadApi,
  pipelineApi,
  stageApi,
  taskApi,
  saleApi,
  type Lead,
  type LeadDetail,
  type LeadNote,
  type Pipeline,
  type PipelineStage,
  type SalesTask,
  type Sale,
} from "@/lib/salesApi";
import { settingsExtApi, type Tag as TagType } from "@/lib/settingsExtApi";
import { chatcubeApi } from "@/lib/chatcubeApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface ContactInfo {
  lead?: LeadDetail | null;
  leadLoading: boolean;
}

type NoteType = "note" | "call" | "email" | "meeting" | "task";

const NOTE_TYPE_CONFIG: Record<NoteType, { label: string; icon: typeof StickyNote; color: string }> = {
  note: { label: "Nota", icon: StickyNote, color: "text-blue-400" },
  call: { label: "Ligação", icon: PhoneCall, color: "text-green-400" },
  email: { label: "E-mail", icon: Mail, color: "text-yellow-400" },
  meeting: { label: "Reunião", icon: Users, color: "text-purple-400" },
  task: { label: "Tarefa", icon: CheckSquare, color: "text-orange-400" },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatPhone(phone: string): string {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 13) {
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }
  if (clean.length === 12) {
    return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  return phone;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ============================================================================
// Collapsible Section Component
// ============================================================================

function SidebarSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  icon: typeof Tag;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-surface-hover transition-colors text-left"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
        <Icon className="w-4 h-4 text-text-muted" />
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex-1">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">{badge}</span>
        )}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

// ============================================================================
// Right Sidebar Panel Component
// ============================================================================

function RightSidebar({
  session,
  onClose,
}: {
  session: ChatSessionDetail;
  onClose: () => void;
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [leadTasks, setLeadTasks] = useState<SalesTask[]>([]);
  const [leadSales, setLeadSales] = useState<Sale[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteType>("note");
  const [addingNote, setAddingNote] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [instances, setInstances] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch lead by phone number
  const fetchLeadByPhone = useCallback(async () => {
    if (!session.contact_phone) return;
    setLeadLoading(true);
    try {
      const phone = session.contact_phone;
      // Try to search leads by name (phone might be stored as name in some cases)
      const res = await leadApi.list({ search: phone, limit: "5" });
      const results = res.data?.results || [];
      if (results.length > 0) {
        // Get full detail
        const detail = await leadApi.get(results[0].id);
        setLead(detail.data);
        return;
      }
      // Try searching by contact name
      if (session.contact_name) {
        const res2 = await leadApi.list({ search: session.contact_name, limit: "5" });
        const results2 = res2.data?.results || [];
        if (results2.length > 0) {
          const detail = await leadApi.get(results2[0].id);
          setLead(detail.data);
          return;
        }
      }
      setLead(null);
    } catch (err) {
      console.error("Error fetching lead:", err);
      setLead(null);
    } finally {
      setLeadLoading(false);
    }
  }, [session.contact_phone, session.contact_name]);

  // Fetch pipelines
  const fetchPipelines = useCallback(async () => {
    try {
      const res = await pipelineApi.list();
      const pips = res.data?.results || [];
      setPipelines(pips);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await settingsExtApi.listTags();
      setTags(res.results || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch instances
  const fetchInstances = useCallback(async () => {
    try {
      const res = await chatcubeApi.listInstances();
      setInstances((res.results || []).map((i: any) => ({ id: i.id, name: i.name })));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchLeadByPhone();
    fetchPipelines();
    fetchTags();
    fetchInstances();
  }, [fetchLeadByPhone, fetchPipelines, fetchTags, fetchInstances]);

  // Update stages when pipeline changes
  useEffect(() => {
    if (lead && lead.stage) {
      // Find which pipeline this lead belongs to
      for (const pip of pipelines) {
        if (pip.stages) {
          const found = pip.stages.find((s) => s.id === lead.stage);
          if (found) {
            setSelectedPipeline(pip.id);
            setSelectedStage(lead.stage);
            setStages(pip.stages);
            break;
          }
        }
      }
    }
  }, [lead, pipelines]);

  // Fetch tasks and sales for this lead
  useEffect(() => {
    if (lead) {
      setLeadTasks(lead.tasks || []);
      setLeadSales(lead.sales || []);
    } else {
      setLeadTasks([]);
      setLeadSales([]);
    }
  }, [lead]);

  const handlePipelineChange = async (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    const pip = pipelines.find((p) => p.id === pipelineId);
    if (pip?.stages) {
      setStages(pip.stages);
      if (pip.stages.length > 0) {
        setSelectedStage(pip.stages[0].id);
      }
    }
  };

  const handleStageChange = async (stageId: string) => {
    setSelectedStage(stageId);
    if (!lead) return;
    setSavingStage(true);
    try {
      await leadApi.move(lead.id, stageId);
      // Refresh lead data
      const detail = await leadApi.get(lead.id);
      setLead(detail.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStage(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !lead) return;
    setAddingNote(true);
    try {
      await leadApi.addNote(lead.id, { content: newNoteContent, note_type: newNoteType });
      setNewNoteContent("");
      // Refresh lead
      const detail = await leadApi.get(lead.id);
      setLead(detail.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingNote(false);
    }
  };

  const instanceName = instances.find((i) => i.id === session.instance_id)?.name || session.instance_name || "—";

  return (
    <div className="w-[350px] border-l border-border bg-surface flex flex-col flex-shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-semibold text-text-primary">Detalhes do Contato</h3>
        <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded transition-colors">
          <PanelRightClose className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact Info Header */}
        <div className="px-4 py-4 border-b border-border/50 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-3">
            <span className="text-xl font-bold text-primary">
              {getInitials(session.contact_name || session.contact_phone)}
            </span>
          </div>
          <h4 className="text-base font-semibold text-text-primary">
            {session.contact_name || formatPhone(session.contact_phone)}
          </h4>
          {session.contact_name && (
            <p className="text-sm text-text-muted mt-0.5">{formatPhone(session.contact_phone)}</p>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              session.status === "active" ? "bg-green-500" : "bg-text-muted"
            )} />
            <span className="text-xs text-text-muted capitalize">{session.status || "ativo"}</span>
          </div>
          {lead && (
            <a
              href={`/salescube/leads?id=${lead.id}`}
              className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Ver no SalesCube
            </a>
          )}
        </div>

        {/* Loading state */}
        {leadLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs text-text-muted ml-2">Carregando dados...</span>
          </div>
        )}

        {/* Canal Section */}
        <SidebarSection title="Canal" icon={Hash} defaultOpen={true}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Instância</span>
              <span className="text-xs text-text-primary font-medium">{instanceName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Mensagens</span>
              <span className="text-xs text-text-primary font-medium">{session.message_count}</span>
            </div>
            {session.last_message_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Última msg</span>
                <span className="text-xs text-text-primary font-medium">
                  {new Date(session.last_message_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </SidebarSection>

        {/* Pipeline Section */}
        <SidebarSection title="Pipeline" icon={Building2} defaultOpen={true}>
          {lead ? (
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-text-muted mb-1 block">Quadro</label>
                <select
                  value={selectedPipeline}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="">Selecionar...</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-text-muted mb-1 block">Estágio</label>
                <div className="relative">
                  <select
                    value={selectedStage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    disabled={savingStage}
                    className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">Selecionar...</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {savingStage && (
                    <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-primary" />
                  )}
                </div>
              </div>
              {lead.stage_name && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: lead.stage_color || "#6366f1" }}
                  />
                  <span className="text-xs text-text-muted">Atual: {lead.stage_name}</span>
                </div>
              )}
            </div>
          ) : !leadLoading ? (
            <p className="text-xs text-text-muted italic">Nenhum lead vinculado a este contato.</p>
          ) : null}
        </SidebarSection>

        {/* Responsável Section */}
        <SidebarSection title="Responsável" icon={User} defaultOpen={true}>
          {lead ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-primary">
                  {lead.assigned_to_name || "Não atribuído"}
                </p>
                {lead.source && (
                  <p className="text-[11px] text-text-muted">Origem: {lead.source}</p>
                )}
              </div>
            </div>
          ) : !leadLoading ? (
            <p className="text-xs text-text-muted italic">—</p>
          ) : null}
        </SidebarSection>

        {/* Tags Section */}
        <SidebarSection title="Etiquetas" icon={Tag} defaultOpen={false} badge={tags.length}>
          <div className="space-y-2">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      border: `1px solid ${tag.color}40`,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">Nenhuma etiqueta cadastrada.</p>
            )}
          </div>
        </SidebarSection>

        {/* Notes Section */}
        <SidebarSection
          title="Anotações"
          icon={FileText}
          defaultOpen={true}
          badge={lead?.lead_notes?.length || 0}
        >
          {lead ? (
            <div className="space-y-3">
              {/* Add note form */}
              <div className="space-y-2">
                <div className="flex gap-1">
                  {(Object.keys(NOTE_TYPE_CONFIG) as NoteType[]).map((type) => {
                    const cfg = NOTE_TYPE_CONFIG[type];
                    const NoteIcon = cfg.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setNewNoteType(type)}
                        title={cfg.label}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          newNoteType === type
                            ? "bg-primary/20 text-primary"
                            : "text-text-muted hover:bg-surface-hover"
                        )}
                      >
                        <NoteIcon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Adicionar anotação..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                    className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim() || addingNote}
                    className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-md text-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Notes list */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(lead.lead_notes || []).length === 0 ? (
                  <p className="text-xs text-text-muted italic">Nenhuma anotação.</p>
                ) : (
                  [...(lead.lead_notes || [])].reverse().map((note: LeadNote) => {
                    const cfg = NOTE_TYPE_CONFIG[note.note_type as NoteType] || NOTE_TYPE_CONFIG.note;
                    const NIcon = cfg.icon;
                    return (
                      <div
                        key={note.id}
                        className="bg-background rounded-md p-2.5 border border-border/50"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <NIcon className={cn("w-3 h-3", cfg.color)} />
                          <span className="text-[10px] text-text-muted font-medium">{cfg.label}</span>
                          <span className="text-[10px] text-text-muted ml-auto">
                            {new Date(note.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-text-primary">{note.content}</p>
                        {note.user_name && (
                          <p className="text-[10px] text-text-muted mt-1">— {note.user_name}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : !leadLoading ? (
            <p className="text-xs text-text-muted italic">Vincule um lead para adicionar anotações.</p>
          ) : null}
        </SidebarSection>

        {/* Tasks Section */}
        <SidebarSection
          title="Tarefas"
          icon={CheckSquare}
          defaultOpen={false}
          badge={leadTasks.length}
        >
          {lead ? (
            <div className="space-y-2">
              {leadTasks.length === 0 ? (
                <p className="text-xs text-text-muted italic">Nenhuma tarefa vinculada.</p>
              ) : (
                leadTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-background rounded-md p-2.5 border border-border/50"
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                        task.status === "completed" ? "bg-green-500" :
                        task.status === "in_progress" ? "bg-yellow-500" :
                        task.priority === "high" ? "bg-red-500" :
                        task.priority === "medium" ? "bg-orange-500" : "bg-blue-500"
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-xs font-medium",
                          task.status === "completed" ? "text-text-muted line-through" : "text-text-primary"
                        )}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.due_date && (
                            <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(task.due_date).toLocaleDateString("pt-BR", {
                                day: "2-digit", month: "2-digit",
                              })}
                            </span>
                          )}
                          <span className="text-[10px] text-text-muted capitalize">{task.status?.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : !leadLoading ? (
            <p className="text-xs text-text-muted italic">—</p>
          ) : null}
        </SidebarSection>

        {/* Sales Section */}
        <SidebarSection
          title="Vendas"
          icon={DollarSign}
          defaultOpen={false}
          badge={leadSales.length}
        >
          {lead ? (
            <div className="space-y-2">
              {leadSales.length === 0 ? (
                <p className="text-xs text-text-muted italic">Nenhuma venda vinculada.</p>
              ) : (
                <>
                  {/* Summary */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-md p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-400 font-medium">Total</span>
                      <span className="text-sm font-bold text-green-400">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          leadSales.reduce((acc, s) => acc + parseFloat(s.total_value || "0"), 0)
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">{leadSales.length} venda{leadSales.length !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Individual sales */}
                  {leadSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="bg-background rounded-md p-2.5 border border-border/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-primary capitalize">{sale.stage}</span>
                        <span className="text-xs font-bold text-text-primary">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            parseFloat(sale.total_value || "0")
                          )}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : !leadLoading ? (
            <p className="text-xs text-text-muted italic">—</p>
          ) : null}
        </SidebarSection>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ChatCubeConversationsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<ChatSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const selectedSessionRef = useRef<string | null>(null);
  selectedSessionRef.current = selectedSession;

  useEffect(() => {
    fetchSessions();
    // Poll conversation list every 15s for new messages
    const listTimer = setInterval(() => fetchSessionsSilent(), 15000);
    return () => clearInterval(listTimer);
  }, []);

  useEffect(() => {
    if (selectedSession) fetchDetail(selectedSession);
    // Poll open conversation every 10s for new messages
    const detailTimer = setInterval(() => {
      if (selectedSessionRef.current) fetchDetailSilent(selectedSessionRef.current);
    }, 10000);
    return () => clearInterval(detailTimer);
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionDetail?.messages]);

  // Silent refresh: updates list without showing full-page spinner
  const fetchSessionsSilent = async () => {
    try {
      const data = await chatApi.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (_) {}
  };

  // Silent refresh of open conversation (preserves scroll position)
  const fetchDetailSilent = async (id: string) => {
    try {
      const data = await chatApi.getSession(id);
      setSessionDetail(data);
    } catch (_) {}
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await chatApi.getSession(id);
      setSessionDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !selectedSession) return;
    setSending(true);
    try {
      await chatApi.sendMessage(selectedSession, messageText);
      setMessageText("");
      await fetchDetail(selectedSession);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleSelectSession = (id: string) => {
    setSelectedSession(id);
  };

  // Exclude groups (@g.us), broadcasts (@broadcast) and linked devices (@lid)
  const individualSessions = sessions.filter((s) => {
    const combined = `${s.contact_name || ""} ${s.contact_phone || ""}`;
    return !combined.includes("@g.us") && !combined.includes("@broadcast") && !combined.includes("@lid");
  });

  const filtered = individualSessions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.contact_name?.toLowerCase().includes(q) ||
      s.contact_phone?.includes(q) ||
      s.instance_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center px-6 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Conversas</h1>
            <span className="text-sm text-text-muted">
              {individualSessions.length} conversa{individualSessions.length !== 1 ? "s" : ""}
            </span>
          </div>
          {selectedSession && (
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className={cn(
                "p-2 rounded-md transition-colors",
                showRightPanel
                  ? "bg-primary/20 text-primary"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
              )}
              title={showRightPanel ? "Ocultar painel" : "Mostrar painel"}
            >
              {showRightPanel ? (
                <PanelRightClose className="w-5 h-5" />
              ) : (
                <PanelRight className="w-5 h-5" />
              )}
            </button>
          )}
        </header>

        {/* Main Content - 3 Panel Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL - Conversation List */}
          <div
            className={cn(
              "w-[300px] border-r border-border flex flex-col bg-surface flex-shrink-0",
              selectedSession ? "hidden md:flex" : "flex"
            )}
          >
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
                  <p className="text-text-muted text-sm">
                    {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa"}
                  </p>
                </div>
              ) : (
                filtered.map((session) => {
                  const isActive = selectedSession === session.id;
                  return (
                    <button
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={cn(
                        "w-full text-left px-3 py-3 border-b border-border/30 hover:bg-surface-hover transition-colors",
                        isActive && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                          isActive
                            ? "bg-primary text-gray-900"
                            : "bg-primary/15 text-primary"
                        )}>
                          {getInitials(session.contact_name || session.contact_phone)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className={cn(
                              "text-sm truncate",
                              isActive ? "font-semibold text-text-primary" : "font-medium text-text-primary"
                            )}>
                              {session.contact_name || formatPhone(session.contact_phone)}
                            </h4>
                            <span className="text-[10px] text-text-muted ml-2 flex-shrink-0">
                              {timeAgo(session.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-text-muted truncate pr-2">
                              {session.message_count} mensagen{session.message_count !== 1 ? "s" : ""}
                              {session.instance_name && ` · ${session.instance_name}`}
                            </p>
                            {session.status === "active" && (
                              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* CENTER PANEL - Chat Messages */}
          <div className="flex-1 flex flex-col bg-background min-w-0">
            {selectedSession && sessionDetail ? (
              <>
                {/* Chat Header */}
                <div className="h-14 flex items-center gap-3 px-4 border-b border-border flex-shrink-0">
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="md:hidden text-text-muted hover:text-text-primary"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {getInitials(sessionDetail.contact_name || sessionDetail.contact_phone)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {sessionDetail.contact_name || formatPhone(sessionDetail.contact_phone)}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-text-muted">{formatPhone(sessionDetail.contact_phone)}</p>
                      {sessionDetail.instance_name && (
                        <>
                          <span className="text-xs text-text-muted">·</span>
                          <p className="text-xs text-text-muted">{sessionDetail.instance_name}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto px-4 py-4"
                  style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                >
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (sessionDetail.messages || []).length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="text-center">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-text-muted opacity-30" />
                        <p className="text-sm text-text-muted">Nenhuma mensagem nesta conversa</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-3xl mx-auto">
                      {(sessionDetail.messages || []).map((msg: ChatMessage, idx: number) => {
                        const isOutbound = msg.direction === "outbound";
                        const time = new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        // Date separator
                        const prevMsg = idx > 0 ? sessionDetail.messages[idx - 1] : null;
                        const msgDate = new Date(msg.created_at).toLocaleDateString("pt-BR");
                        const prevDate = prevMsg
                          ? new Date(prevMsg.created_at).toLocaleDateString("pt-BR")
                          : null;
                        const showDateSep = idx === 0 || msgDate !== prevDate;

                        return (
                          <div key={msg.id}>
                            {showDateSep && (
                              <div className="flex items-center justify-center my-4">
                                <span className="bg-surface px-3 py-1 rounded-full text-[11px] text-text-muted font-medium">
                                  {msgDate}
                                </span>
                              </div>
                            )}
                            <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                              <div
                                className={cn(
                                  "max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm",
                                  isOutbound
                                    ? "bg-primary text-gray-900 rounded-br-md"
                                    : "bg-surface text-text-primary border border-border/50 rounded-bl-md"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                                <div className={cn(
                                  "flex items-center justify-end gap-1 mt-1",
                                  isOutbound ? "text-text-primary/60" : "text-text-muted"
                                )}>
                                  {msg.is_ai_generated && (
                                    <span className="text-[9px] bg-surface/20 px-1 rounded mr-1">IA</span>
                                  )}
                                  <span className="text-[10px]">{time}</span>
                                  {isOutbound && (
                                    msg.whatsapp_status === "read" || msg.read_at ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                                    ) : msg.whatsapp_status === "delivered" || msg.delivered_at ? (
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="px-4 py-3 border-t border-border bg-background flex-shrink-0">
                  <div className="flex items-center gap-2 max-w-3xl mx-auto">
                    <input
                      type="text"
                      placeholder="Digite uma mensagem..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!messageText.trim() || sending}
                      className={cn(
                        "p-2.5 rounded-xl transition-all",
                        messageText.trim()
                          ? "bg-primary hover:bg-primary-hover text-gray-900 shadow-sm"
                          : "bg-surface text-text-muted"
                      )}
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-text-muted opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">Selecione uma conversa</h3>
                  <p className="text-sm text-text-muted max-w-xs">
                    Escolha uma conversa na lista ao lado para visualizar as mensagens e detalhes do contato.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL - Contact Details Sidebar */}
          {selectedSession && sessionDetail && showRightPanel && (
            <RightSidebar
              session={sessionDetail}
              onClose={() => setShowRightPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
