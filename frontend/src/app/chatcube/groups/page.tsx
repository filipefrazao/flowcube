"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Users, Loader2, MessageSquare, ArrowLeft, Send, Search,
  FileText, CheckSquare, Plus, Trash2, ChevronDown, ChevronRight,
  Phone, Mail, Calendar, StickyNote, User, Hash, Wifi,
  PanelRight, PanelRightClose,
} from "lucide-react";
import { chatcubeApi } from "@/lib/chatcubeApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import type {
  WhatsAppGroup, WhatsAppMessage, GroupNote, GroupTask, ChatUser,
} from "@/types/chatcube.types";
import { cn } from "@/lib/utils";

// ============================================================================
// Helpers
// ============================================================================

function timeAgo(dateStr: string | null | undefined): string {
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

function phoneFromJid(jid: string): string {
  return jid ? jid.split("@")[0] : jid;
}

type NoteType = "note" | "call" | "email" | "meeting" | "task";

const NOTE_TYPE_CONFIG: Record<NoteType, { label: string; icon: typeof StickyNote; color: string }> = {
  note:    { label: "Nota",    icon: StickyNote,   color: "text-blue-400" },
  call:    { label: "Ligação", icon: Phone,         color: "text-green-400" },
  email:   { label: "E-mail",  icon: Mail,          color: "text-yellow-400" },
  meeting: { label: "Reunião", icon: Users,         color: "text-purple-400" },
  task:    { label: "Tarefa",  icon: CheckSquare,   color: "text-orange-400" },
};

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Baixa", dot: "bg-blue-500" },
  { value: "medium", label: "Média", dot: "bg-yellow-500" },
  { value: "high",   label: "Alta",  dot: "bg-red-500" },
];

// ============================================================================
// Collapsible Section — identical pattern to conversations page
// ============================================================================

function SidebarSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  icon: typeof Hash;
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
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
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
// Right Sidebar — same structural pattern as conversations RightSidebar
// ============================================================================

interface GroupSidebarProps {
  group: WhatsAppGroup;
  instances: any[];
  users: ChatUser[];
  notes: GroupNote[];
  tasks: GroupTask[];
  notesLoading: boolean;
  tasksLoading: boolean;
  onClose: () => void;
  onUpdateGroup: (data: { assigned_to?: number | null; instance?: string }) => Promise<void>;
  onAddNote: (content: string, type: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onCreateTask: (title: string, priority: string) => Promise<void>;
  onToggleTask: (task: GroupTask) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

function GroupSidebar({
  group, instances, users, notes, tasks,
  notesLoading, tasksLoading,
  onClose, onUpdateGroup, onAddNote, onDeleteNote,
  onCreateTask, onToggleTask, onDeleteTask,
}: GroupSidebarProps) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteType>("note");
  const [addingNote, setAddingNote] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [savingTask, setSavingTask] = useState(false);
  const [updatingGroup, setUpdatingGroup] = useState(false);

  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const doneTasks = tasks.filter((t) => t.is_completed);

  const currentInstance = instances.find((i) => i.id === group.instance);

  async function handleAddNote() {
    if (!newNoteContent.trim()) return;
    setAddingNote(true);
    try {
      await onAddNote(newNoteContent.trim(), newNoteType);
      setNewNoteContent("");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleCreateTask() {
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    try {
      await onCreateTask(taskTitle.trim(), taskPriority);
      setTaskTitle("");
      setTaskPriority("medium");
    } finally {
      setSavingTask(false);
    }
  }

  async function handleChangeInstance(instanceId: string) {
    setUpdatingGroup(true);
    try { await onUpdateGroup({ instance: instanceId }); }
    finally { setUpdatingGroup(false); }
  }

  async function handleChangeAssignedTo(userId: string) {
    setUpdatingGroup(true);
    try { await onUpdateGroup({ assigned_to: userId === "" ? null : Number(userId) }); }
    finally { setUpdatingGroup(false); }
  }

  return (
    <div className="w-[350px] border-l border-border bg-surface flex flex-col flex-shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-semibold text-text-primary">Detalhes do Grupo</h3>
        <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded transition-colors">
          <PanelRightClose className="w-4 h-4 text-text-muted" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">

        {/* Group Info Header — same pattern as contact card in conversations */}
        <div className="px-4 py-4 border-b border-border/50 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-3">
            <span className="text-xl font-bold text-primary">{getInitials(group.name)}</span>
          </div>
          <h4 className="text-base font-semibold text-text-primary">{group.name}</h4>
          <p className="text-sm text-text-muted mt-0.5">{group.participants_count} participantes</p>
          {group.description && (
            <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{group.description}</p>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {group.is_admin && (
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
            )}
            <span className="text-[10px] text-text-muted font-mono">{group.jid}</span>
          </div>
        </div>

        {/* Canal Section */}
        <SidebarSection title="Canal" icon={Hash} defaultOpen={true}>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-text-muted mb-1 block">Instância</label>
              <div className="relative">
                <select
                  value={group.instance}
                  onChange={(e) => handleChangeInstance(e.target.value)}
                  disabled={updatingGroup || instances.length <= 1}
                  className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary disabled:opacity-50 appearance-none pr-6"
                >
                  {instances.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name || inst.id}</option>
                  ))}
                </select>
                {updatingGroup && (
                  <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-primary" />
                )}
              </div>
            </div>
            {currentInstance && (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  currentInstance.status === "connected" ? "bg-green-500" : "bg-gray-400"
                )} />
                <span className={cn(
                  "text-xs",
                  currentInstance.status === "connected" ? "text-green-400" : "text-text-muted"
                )}>
                  {currentInstance.status === "connected" ? "Conectado" : "Desconectado"}
                </span>
                {currentInstance.phone_number && (
                  <span className="text-xs text-text-muted">· {currentInstance.phone_number}</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Mensagens</span>
              <span className="text-xs text-text-primary font-medium">{group.message_count ?? 0}</span>
            </div>
            {group.last_message_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Última msg</span>
                <span className="text-xs text-text-primary font-medium">
                  {new Date(group.last_message_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </SidebarSection>

        {/* Responsável Section */}
        <SidebarSection title="Responsável" icon={User} defaultOpen={true}>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-text-muted mb-1 block">Atribuído a</label>
              <select
                value={group.assigned_to?.toString() ?? ""}
                onChange={(e) => handleChangeAssignedTo(e.target.value)}
                disabled={updatingGroup}
                className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="">— Sem responsável —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id.toString()}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>
            {group.assigned_to_name && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-xs font-medium text-text-primary">{group.assigned_to_name}</p>
              </div>
            )}
          </div>
        </SidebarSection>

        {/* Anotações Section */}
        <SidebarSection
          title="Anotações"
          icon={FileText}
          defaultOpen={true}
          badge={notes.length}
        >
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
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote(); }
                  }}
                  className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNoteContent.trim() || addingNote}
                  className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Notes list */}
            {notesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-xs text-text-muted italic">Nenhuma anotação.</p>
                ) : (
                  notes.map((note) => {
                    const cfg = NOTE_TYPE_CONFIG[note.note_type as NoteType] || NOTE_TYPE_CONFIG.note;
                    const NIcon = cfg.icon;
                    return (
                      <div key={note.id} className="bg-background rounded-md p-2.5 border border-border/50 group">
                        <div className="flex items-center gap-1.5 mb-1">
                          <NIcon className={cn("w-3 h-3", cfg.color)} />
                          <span className="text-[10px] text-text-muted font-medium">{cfg.label}</span>
                          <span className="text-[10px] text-text-muted ml-auto">
                            {new Date(note.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
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
            )}
          </div>
        </SidebarSection>

        {/* Tarefas Section */}
        <SidebarSection
          title="Tarefas"
          icon={CheckSquare}
          defaultOpen={false}
          badge={pendingTasks.length}
        >
          <div className="space-y-3">
            {/* Add task form */}
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Nova tarefa..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleCreateTask(); }
                  }}
                  className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleCreateTask}
                  disabled={!taskTitle.trim() || savingTask}
                  className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {savingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Task list */}
            {tasksLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-text-muted italic">Nenhuma tarefa.</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map((task) => {
                  const prio = PRIORITY_OPTIONS.find((p) => p.value === task.priority);
                  return (
                    <div key={task.id} className="bg-background rounded-md p-2.5 border border-border/50 group">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => onToggleTask(task)}
                          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-border hover:border-primary transition-colors"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-text-primary leading-snug">{task.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {prio && (
                              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", prio.dot)} />
                            )}
                            <span className="text-[10px] text-text-muted capitalize">{prio?.label}</span>
                            {task.due_date && (
                              <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(task.due_date).toLocaleDateString("pt-BR", {
                                  day: "2-digit", month: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {doneTasks.length > 0 && (
                  <>
                    <p className="text-[10px] text-text-muted pt-1">Concluídas ({doneTasks.length})</p>
                    {doneTasks.map((task) => (
                      <div key={task.id} className="bg-background rounded-md p-2.5 border border-border/50 opacity-60 group">
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => onToggleTask(task)}
                            className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-green-500 bg-green-500/20 flex items-center justify-center"
                          >
                            <span className="text-[8px] text-green-400 leading-none">✓</span>
                          </button>
                          <p className="flex-1 text-xs text-text-muted line-through leading-snug">{task.title}</p>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </SidebarSection>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function GroupsPage() {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Sidebar data
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [notes, setNotes] = useState<GroupNote[]>([]);
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedGroupRef = useRef<WhatsAppGroup | null>(null);
  selectedGroupRef.current = selectedGroup;

  // Auto-refresh timers
  useEffect(() => {
    const listTimer = setInterval(() => {
      if (selectedInstance) loadGroupsSilent(selectedInstance);
    }, 15000);
    const msgTimer = setInterval(() => {
      if (selectedGroupRef.current && selectedInstance) {
        loadGroupMessagesSilent(selectedGroupRef.current);
      }
    }, 10000);
    return () => { clearInterval(listTimer); clearInterval(msgTimer); };
  }, [selectedInstance]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadInstances();
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedInstance) loadGroups(selectedInstance);
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedGroup) {
      loadNotes(selectedGroup.id);
      loadTasks(selectedGroup.id);
    } else {
      setNotes([]);
      setTasks([]);
    }
  }, [selectedGroup?.id]);

  async function loadInstances() {
    try {
      const d = await chatcubeApi.listInstances();
      setInstances(d.results || []);
      if (d.results?.length > 0) {
        setSelectedInstance(d.results[0].id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await chatcubeApi.listUsers();
      setUsers(data);
    } catch { /* non-critical */ }
  }

  async function loadGroups(instanceId: string) {
    try {
      setLoading(true);
      const d = await chatcubeApi.getGroups(instanceId);
      setGroups(d.results || []);
      setSelectedGroup(null);
      setMessages([]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function loadGroupsSilent(instanceId: string) {
    try {
      const d = await chatcubeApi.getGroups(instanceId);
      setGroups(d.results || []);
    } catch { /* ignore */ }
  }

  async function loadGroupMessages(group: WhatsAppGroup) {
    if (!selectedInstance) return;
    setMessagesLoading(true);
    setMessages([]);
    try {
      const d = await chatcubeApi.getMessages(selectedInstance, { remote_jid: group.jid, limit: 200 });
      setMessages((d.results || []).slice().reverse());
    } catch { /* ignore */ }
    finally { setMessagesLoading(false); }
  }

  async function loadGroupMessagesSilent(group: WhatsAppGroup) {
    if (!selectedInstance) return;
    try {
      const d = await chatcubeApi.getMessages(selectedInstance, { remote_jid: group.jid, limit: 200 });
      setMessages((d.results || []).slice().reverse());
    } catch { /* ignore */ }
  }

  async function loadNotes(groupId: string) {
    setNotesLoading(true);
    try {
      const data = await chatcubeApi.listGroupNotes(groupId);
      setNotes(data);
    } catch { setNotes([]); }
    finally { setNotesLoading(false); }
  }

  async function loadTasks(groupId: string) {
    setTasksLoading(true);
    try {
      const data = await chatcubeApi.listGroupTasks(groupId);
      setTasks(data);
    } catch { setTasks([]); }
    finally { setTasksLoading(false); }
  }

  async function handleSend() {
    if (!messageText.trim() || !selectedGroup || !selectedInstance) return;
    setSending(true);
    try {
      await chatcubeApi.sendMessage(selectedInstance, {
        to: selectedGroup.jid,
        content: messageText,
      });
      setMessageText("");
      await loadGroupMessages(selectedGroup);
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  const handleSelectGroup = (group: WhatsAppGroup) => {
    setSelectedGroup(group);
    loadGroupMessages(group);
  };

  const handleUpdateGroup = useCallback(async (data: { assigned_to?: number | null; instance?: string }) => {
    if (!selectedGroup) return;
    try {
      const updated = await chatcubeApi.updateGroup(selectedGroup.id, data);
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => g.id === updated.id ? updated : g));
    } catch { /* ignore */ }
  }, [selectedGroup]);

  const handleAddNote = useCallback(async (content: string, noteType: string) => {
    if (!selectedGroup) return;
    const note = await chatcubeApi.addGroupNote(selectedGroup.id, { content, note_type: noteType });
    setNotes((prev) => [note, ...prev]);
  }, [selectedGroup]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!selectedGroup) return;
    await chatcubeApi.deleteGroupNote(selectedGroup.id, noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, [selectedGroup]);

  const handleCreateTask = useCallback(async (title: string, priority: string) => {
    if (!selectedGroup) return;
    const task = await chatcubeApi.createGroupTask(selectedGroup.id, { title, priority });
    setTasks((prev) => [task, ...prev]);
  }, [selectedGroup]);

  const handleToggleTask = useCallback(async (task: GroupTask) => {
    if (!selectedGroup) return;
    const updated = await chatcubeApi.updateGroupTask(selectedGroup.id, task.id, {
      is_completed: !task.is_completed,
    });
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }, [selectedGroup]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!selectedGroup) return;
    await chatcubeApi.deleteGroupTask(selectedGroup.id, taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, [selectedGroup]);

  const filteredGroups = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center px-6 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Grupos</h1>
            <span className="text-sm text-text-muted">
              {groups.length} grupo{groups.length !== 1 ? "s" : ""}
            </span>
          </div>
          {instances.length > 1 && (
            <select
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="mr-3 px-3 py-1.5 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
            >
              {instances.map((inst: any) => (
                <option key={inst.id} value={inst.id}>{inst.name || inst.id}</option>
              ))}
            </select>
          )}
          {selectedGroup && (
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
              {showRightPanel
                ? <PanelRightClose className="w-5 h-5" />
                : <PanelRight className="w-5 h-5" />}
            </button>
          )}
        </header>

        {/* 3-Panel Layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Groups List ──────────────────────────────────── */}
          <div className={cn(
            "w-[300px] border-r border-border flex flex-col bg-surface flex-shrink-0",
            selectedGroup ? "hidden md:flex" : "flex"
          )}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar grupos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
                  <p className="text-text-muted text-sm">
                    {search ? "Nenhum grupo encontrado" : "Nenhum grupo"}
                  </p>
                </div>
              ) : (
                filteredGroups.map((g) => {
                  const isActive = selectedGroup?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleSelectGroup(g)}
                      className={cn(
                        "w-full text-left px-3 py-3 border-b border-border/30 hover:bg-surface-hover transition-colors",
                        isActive && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                          isActive ? "bg-primary text-white" : "bg-primary/15 text-primary"
                        )}>
                          {getInitials(g.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className={cn(
                              "text-sm truncate",
                              isActive ? "font-semibold text-text-primary" : "font-medium text-text-primary"
                            )}>
                              {g.name}
                            </h4>
                            <span className="text-[10px] text-text-muted ml-2 flex-shrink-0">
                              {timeAgo(g.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-text-muted truncate pr-2">
                              {g.participants_count} membros
                              {g.assigned_to_name && ` · ${g.assigned_to_name}`}
                            </p>
                            {g.is_admin && (
                              <span className="text-[10px] bg-primary/20 text-primary px-1 py-0.5 rounded-full flex-shrink-0">Admin</span>
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

          {/* ── CENTER: Messages ───────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-background min-w-0">
            {selectedGroup ? (
              <>
                {/* Chat Header */}
                <div className="h-14 flex items-center gap-3 px-4 border-b border-border flex-shrink-0">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="md:hidden text-text-muted hover:text-text-primary"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{getInitials(selectedGroup.name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{selectedGroup.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-text-muted">{selectedGroup.participants_count} participantes</p>
                      {selectedGroup.assigned_to_name && (
                        <>
                          <span className="text-text-muted text-xs">·</span>
                          <span className="text-xs text-indigo-400">{selectedGroup.assigned_to_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto px-4 py-4"
                  style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                >
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="text-center">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-text-muted opacity-30" />
                        <p className="text-sm text-text-muted">Nenhuma mensagem neste grupo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-3xl mx-auto">
                      {messages.map((msg, idx) => {
                        const isOutbound = msg.from_me;
                        const time = new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit", minute: "2-digit",
                        });

                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const msgDate = new Date(msg.timestamp).toLocaleDateString("pt-BR");
                        const prevDate = prevMsg ? new Date(prevMsg.timestamp).toLocaleDateString("pt-BR") : null;
                        const showDateSep = idx === 0 || msgDate !== prevDate;

                        const senderName = !isOutbound
                          ? (msg.sender_name
                            || msg.metadata?.pushName
                            || (msg.sender_jid ? phoneFromJid(msg.sender_jid) : null)
                            || (msg.metadata?.participant ? phoneFromJid(msg.metadata.participant) : null)
                            || null)
                          : null;

                        const prevSenderJid = prevMsg && !prevMsg.from_me
                          ? (prevMsg.sender_jid || prevMsg.metadata?.participant)
                          : null;
                        const currSenderJid = !isOutbound
                          ? (msg.sender_jid || msg.metadata?.participant)
                          : null;
                        const showSenderName = !isOutbound && senderName && currSenderJid !== prevSenderJid;

                        return (
                          <div key={msg.id}>
                            {showDateSep && (
                              <div className="flex items-center justify-center my-4">
                                <span className="bg-surface px-3 py-1 rounded-full text-[11px] text-text-muted font-medium">
                                  {msgDate}
                                </span>
                              </div>
                            )}
                            <div className={cn("flex flex-col", isOutbound ? "items-end" : "items-start")}>
                              {showSenderName && (
                                <span className="text-[11px] font-medium text-primary/80 px-1 mb-0.5 ml-1">
                                  {senderName}
                                </span>
                              )}
                              <div className={cn(
                                "max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm",
                                isOutbound
                                  ? "bg-primary text-white rounded-br-md"
                                  : "bg-surface text-text-primary border border-border/50 rounded-bl-md"
                              )}>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                                <div className={cn(
                                  "flex items-center justify-end gap-1 mt-1",
                                  isOutbound ? "text-white/60" : "text-text-muted"
                                )}>
                                  <span className="text-[10px]">{time}</span>
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
                      placeholder="Digite uma mensagem para o grupo..."
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
                          ? "bg-primary hover:bg-primary-hover text-white shadow-sm"
                          : "bg-surface text-text-muted"
                      )}
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
                    <Users className="w-10 h-10 text-text-muted opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">Selecione um grupo</h3>
                  <p className="text-sm text-text-muted max-w-xs">
                    Escolha um grupo na lista ao lado para visualizar o histórico e gerenciar atendimentos.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Sidebar ─────────────────────────────────────── */}
          {selectedGroup && showRightPanel && (
            <GroupSidebar
              group={selectedGroup}
              instances={instances}
              users={users}
              notes={notes}
              tasks={tasks}
              notesLoading={notesLoading}
              tasksLoading={tasksLoading}
              onClose={() => setShowRightPanel(false)}
              onUpdateGroup={handleUpdateGroup}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onCreateTask={handleCreateTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </div>
      </div>
    </div>
  );
}
