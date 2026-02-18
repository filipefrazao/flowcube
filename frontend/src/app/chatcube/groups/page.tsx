"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Users, Loader2, MessageSquare, ArrowLeft, Send, Info,
  FileText, CheckSquare, Plus, Trash2, ChevronDown, X,
  Phone, Mail, Calendar, Mic, StickyNote, User, Wifi, WifiOff,
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

const NOTE_TYPE_OPTIONS = [
  { value: "note", label: "Nota", icon: StickyNote, color: "text-blue-400" },
  { value: "call", label: "Ligação", icon: Phone, color: "text-green-400" },
  { value: "email", label: "E-mail", icon: Mail, color: "text-yellow-400" },
  { value: "meeting", label: "Reunião", icon: Calendar, color: "text-purple-400" },
  { value: "task", label: "Tarefa", icon: CheckSquare, color: "text-orange-400" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa", color: "bg-blue-500/20 text-blue-400" },
  { value: "medium", label: "Média", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "high", label: "Alta", color: "bg-red-500/20 text-red-400" },
];

// ============================================================================
// Sub-components
// ============================================================================

function NoteTypeIcon({ type }: { type: string }) {
  const opt = NOTE_TYPE_OPTIONS.find((o) => o.value === type);
  if (!opt) return <StickyNote className="w-3.5 h-3.5 text-text-muted" />;
  const Icon = opt.icon;
  return <Icon className={cn("w-3.5 h-3.5", opt.color)} />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const opt = PRIORITY_OPTIONS.find((p) => p.value === priority);
  if (!opt) return null;
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", opt.color)}>
      {opt.label}
    </span>
  );
}

// ============================================================================
// Right Sidebar
// ============================================================================

type SidebarTab = "info" | "notes" | "tasks";

interface GroupSidebarProps {
  group: WhatsAppGroup;
  instances: any[];
  users: ChatUser[];
  notes: GroupNote[];
  tasks: GroupTask[];
  notesLoading: boolean;
  tasksLoading: boolean;
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
  onUpdateGroup, onAddNote, onDeleteNote,
  onCreateTask, onToggleTask, onDeleteTask,
}: GroupSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>("info");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [savingNote, setSavingNote] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [savingTask, setSavingTask] = useState(false);
  const [updatingGroup, setUpdatingGroup] = useState(false);

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      await onAddNote(noteContent.trim(), noteType);
      setNoteContent("");
    } finally {
      setSavingNote(false);
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
    try {
      await onUpdateGroup({ instance: instanceId });
    } finally {
      setUpdatingGroup(false);
    }
  }

  async function handleChangeAssignedTo(userId: string) {
    setUpdatingGroup(true);
    try {
      await onUpdateGroup({ assigned_to: userId === "" ? null : Number(userId) });
    } finally {
      setUpdatingGroup(false);
    }
  }

  const pendingTasks = tasks.filter((t) => !t.is_completed);
  const doneTasks = tasks.filter((t) => t.is_completed);

  return (
    <div className="w-[300px] border-l border-border flex flex-col bg-surface flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0">
        {(["info", "notes", "tasks"] as SidebarTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors",
              tab === t
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            {t === "info" && "Visão Geral"}
            {t === "notes" && `Notas ${notes.length > 0 ? `(${notes.length})` : ""}`}
            {t === "tasks" && `Tarefas ${pendingTasks.length > 0 ? `(${pendingTasks.length})` : ""}`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── INFO TAB ────────────────────────────────────────────── */}
        {tab === "info" && (
          <div className="p-3 space-y-4">
            {/* Group info card */}
            <div className="rounded-lg bg-background border border-border/50 p-3 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{getInitials(group.name)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{group.name}</p>
                  <p className="text-[11px] text-text-muted">{group.participants_count} participantes</p>
                </div>
              </div>
              {group.description && (
                <p className="text-xs text-text-muted leading-relaxed">{group.description}</p>
              )}
              <div className="pt-1 border-t border-border/40">
                <p className="text-[10px] text-text-muted font-mono truncate">{group.jid}</p>
                {group.is_admin && (
                  <span className="mt-1 inline-block text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Canal (instância) */}
            <div>
              <label className="text-xs font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5" /> Canal WhatsApp
              </label>
              <div className="relative">
                <select
                  value={group.instance}
                  onChange={(e) => handleChangeInstance(e.target.value)}
                  disabled={updatingGroup || instances.length <= 1}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary appearance-none pr-7 disabled:opacity-60"
                >
                  {instances.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name || inst.id}
                      {inst.status === "connected" ? " ●" : " ○"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
              {/* Status badge */}
              {instances.find((i) => i.id === group.instance) && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  {instances.find((i) => i.id === group.instance)?.status === "connected" ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      <span className="text-[11px] text-green-400">Conectado</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span className="text-[11px] text-red-400">Desconectado</span>
                    </>
                  )}
                  <span className="text-[11px] text-text-muted">
                    · {instances.find((i) => i.id === group.instance)?.phone_number || "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Responsável */}
            <div>
              <label className="text-xs font-medium text-text-muted mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Responsável
              </label>
              <div className="relative">
                <select
                  value={group.assigned_to?.toString() ?? ""}
                  onChange={(e) => handleChangeAssignedTo(e.target.value)}
                  disabled={updatingGroup}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary appearance-none pr-7 disabled:opacity-60"
                >
                  <option value="">— Sem responsável —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id.toString()}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
              {group.assigned_to_name && (
                <p className="mt-1 text-[11px] text-text-muted">
                  Atribuído a <span className="text-text-primary font-medium">{group.assigned_to_name}</span>
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-background border border-border/40 p-2.5 text-center">
                <p className="text-lg font-bold text-text-primary">{group.message_count ?? 0}</p>
                <p className="text-[10px] text-text-muted">Mensagens</p>
              </div>
              <div className="rounded-lg bg-background border border-border/40 p-2.5 text-center">
                <p className="text-lg font-bold text-text-primary">{group.participants_count}</p>
                <p className="text-[10px] text-text-muted">Membros</p>
              </div>
            </div>

            {group.last_message_at && (
              <p className="text-[11px] text-text-muted text-center">
                Última atividade: <span className="text-text-primary">{timeAgo(group.last_message_at)}</span>
              </p>
            )}
          </div>
        )}

        {/* ── NOTES TAB ───────────────────────────────────────────── */}
        {tab === "notes" && (
          <div className="p-3 space-y-3">
            {/* Add note form */}
            <div className="rounded-lg bg-background border border-border/50 p-3 space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {NOTE_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setNoteType(opt.value)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all",
                        noteType === opt.value
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-surface text-text-muted hover:text-text-primary border border-border/40"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                placeholder="Adicionar anotação..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteContent.trim() || savingNote}
                className="w-full py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {savingNote ? "Salvando..." : "Salvar nota"}
              </button>
            </div>

            {/* Notes list */}
            {notesLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : notes.length === 0 ? (
              <p className="text-center text-xs text-text-muted py-6">Nenhuma anotação ainda.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg bg-background border border-border/40 p-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <NoteTypeIcon type={note.note_type} />
                        <span className="text-[10px] font-medium text-text-muted">
                          {NOTE_TYPE_OPTIONS.find((o) => o.value === note.note_type)?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-text-muted">{timeAgo(note.created_at)}</span>
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <p className="text-[10px] text-text-muted mt-1">{note.user_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TASKS TAB ───────────────────────────────────────────── */}
        {tab === "tasks" && (
          <div className="p-3 space-y-3">
            {/* Add task form */}
            <div className="rounded-lg bg-background border border-border/50 p-3 space-y-2">
              <input
                type="text"
                placeholder="Nova tarefa..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleCreateTask(); }
                }}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
              />
              <div className="flex items-center gap-2">
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleCreateTask}
                  disabled={!taskTitle.trim() || savingTask}
                  className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar
                </button>
              </div>
            </div>

            {/* Task list */}
            {tasksLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-center text-xs text-text-muted py-6">Nenhuma tarefa ainda.</p>
            ) : (
              <div className="space-y-1.5">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 rounded-lg bg-background border border-border/40 p-2.5 group"
                  >
                    <button
                      onClick={() => onToggleTask(task)}
                      className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-border hover:border-primary transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary leading-snug">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <PriorityBadge priority={task.priority} />
                        <span className="text-[10px] text-text-muted">{task.created_by_name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {doneTasks.length > 0 && (
                  <>
                    <p className="text-[10px] text-text-muted pt-2 pb-1">Concluídas ({doneTasks.length})</p>
                    {doneTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 rounded-lg bg-background border border-border/30 p-2.5 opacity-60 group"
                      >
                        <button
                          onClick={() => onToggleTask(task)}
                          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-green-500 bg-green-500/20 transition-colors"
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
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
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

  // Initial load
  useEffect(() => {
    loadInstances();
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedInstance) loadGroups(selectedInstance);
  }, [selectedInstance]);

  // Load sidebar data when group changes
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
      // Merge to preserve selectedGroup data
      setGroups((prev) => {
        const updated = d.results || [];
        return updated;
      });
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

  // Sidebar callbacks
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

  // Filtered groups
  const filteredGroups = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center px-6 flex-shrink-0 gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-text-primary">Grupos</h1>
          <span className="text-sm text-text-muted">{groups.length} grupo{groups.length !== 1 ? "s" : ""}</span>
          <div className="flex-1" />
          {instances.length > 1 && (
            <select
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
            >
              {instances.map((inst: any) => (
                <option key={inst.id} value={inst.id}>{inst.name || inst.id}</option>
              ))}
            </select>
          )}
        </header>

        {/* 3-Panel Layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Groups List ──────────────────────────────────── */}
          <div className={cn(
            "w-[280px] border-r border-border flex flex-col bg-surface flex-shrink-0",
            selectedGroup ? "hidden md:flex" : "flex"
          )}>
            {/* Search */}
            <div className="p-2 border-b border-border/50">
              <input
                type="text"
                placeholder="Buscar grupos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-20 text-text-muted">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{search ? "Nenhum grupo encontrado" : "Nenhum grupo"}</p>
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
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                          isActive ? "bg-primary text-white" : "bg-primary/15 text-primary"
                        )}>
                          {getInitials(g.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-sm font-medium text-text-primary truncate">{g.name}</h4>
                            {(g as any).last_message_at && (
                              <span className="text-[10px] text-text-muted ml-1 flex-shrink-0">
                                {timeAgo((g as any).last_message_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs text-text-muted">
                              {g.participants_count} membros
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {g.assigned_to_name && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1 py-0.5 rounded-full truncate max-w-[70px]">
                                  {g.assigned_to_name}
                                </span>
                              )}
                              {g.is_admin && (
                                <span className="text-[10px] bg-primary/20 text-primary px-1 py-0.5 rounded-full">
                                  Admin
                                </span>
                              )}
                            </div>
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

                        // Sender info for group messages
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
                              {/* Sender name (only for incoming group msgs, when sender changes) */}
                              {showSenderName && (
                                <span className="text-[11px] font-medium text-primary/80 px-1 mb-0.5 ml-1">
                                  {senderName}
                                </span>
                              )}
                              <div
                                className={cn(
                                  "max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm",
                                  isOutbound
                                    ? "bg-primary text-white rounded-br-md"
                                    : "bg-surface text-text-primary border border-border/50 rounded-bl-md"
                                )}
                              >
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
              /* Empty state */
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
          {selectedGroup && (
            <GroupSidebar
              group={selectedGroup}
              instances={instances}
              users={users}
              notes={notes}
              tasks={tasks}
              notesLoading={notesLoading}
              tasksLoading={tasksLoading}
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
