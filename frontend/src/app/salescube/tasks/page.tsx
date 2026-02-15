"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, X, Calendar, AlertCircle, CheckCircle2, Clock, Circle,
  Edit2, Trash2, Filter, RotateCcw, ChevronLeft, ChevronRight,
  ListTodo, LayoutGrid, List, Ban, Flag, User, Link2, Zap,
  AlertTriangle, ChevronDown, ArrowDown, ArrowUp, Minus
} from "lucide-react";
import { taskApi, leadApi, type SalesTask, type Lead } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

/* ── Status Config ──────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending:     { label: "A Fazer",    color: "text-gray-400",    bg: "bg-gray-500/20 text-gray-400 border-gray-500/30",    icon: Circle },
  in_progress: { label: "Fazendo",    color: "text-blue-400",    bg: "bg-blue-500/20 text-blue-400 border-blue-500/30",    icon: Clock },
  completed:   { label: "Feita",      color: "text-emerald-400", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  blocked:     { label: "Bloqueada",  color: "text-orange-400",  bg: "bg-orange-500/20 text-orange-400 border-orange-500/30",  icon: Ban },
  cancelled:   { label: "Cancelada",  color: "text-red-400",     bg: "bg-red-500/20 text-red-400 border-red-500/30",     icon: AlertCircle },
};

/* ── Priority Config ────────────────────────────────────────────────── */
const PRIORITY_CONFIG: Record<string, { label: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  lowest:  { label: "Baixissima", bg: "bg-gray-500/15 text-gray-400 border-gray-500/30",    icon: Minus },
  low:     { label: "Baixa",     bg: "bg-slate-500/15 text-slate-400 border-slate-500/30",  icon: ArrowDown },
  medium:  { label: "Media",     bg: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: Minus },
  high:    { label: "Alta",      bg: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: ArrowUp },
  urgent:  { label: "Urgente",   bg: "bg-red-500/15 text-red-400 border-red-500/30",       icon: AlertTriangle },
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatDatetime(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.toLocaleDateString("pt-BR")} ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function isOverdue(date: string | null, status: string) {
  if (!date || status === "completed" || status === "cancelled") return false;
  return new Date(date) < new Date();
}

const PAGE_SIZE = 20;

export default function TasksPage() {
  /* ── Data ───────────────────────────────────────────────────────── */
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Filters ────────────────────────────────────────────────────── */
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterLead, setFilterLead] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterDueDateFrom, setFilterDueDateFrom] = useState("");
  const [filterDueDateTo, setFilterDueDateTo] = useState("");

  /* ── View ───────────────────────────────────────────────────────── */
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  /* ── Modal ──────────────────────────────────────────────────────── */
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<SalesTask | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", due_date: "", priority: "medium", status: "pending", lead: "",
  });
  const [saving, setSaving] = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        page: String(currentPage),
      };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterSearch) params.search = filterSearch;

      const res = await taskApi.list(params);
      const data = res.data;
      setTasks(data.results || data);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error("Erro ao carregar tarefas:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, filterPriority, filterSearch]);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await leadApi.list({ limit: "500" });
      setLeads(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* ── Secondary filters (client-side) ────────────────────────────── */
  const filtered = tasks.filter((t) => {
    if (filterLead && t.lead !== filterLead) return false;
    if (filterDateFrom && new Date(t.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(t.created_at) > new Date(filterDateTo + "T23:59:59")) return false;
    if (filterDueDateFrom && t.due_date && new Date(t.due_date) < new Date(filterDueDateFrom)) return false;
    if (filterDueDateTo && t.due_date && new Date(t.due_date) > new Date(filterDueDateTo + "T23:59:59")) return false;
    return true;
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  /* ── Stats ──────────────────────────────────────────────────────── */
  const stats = {
    total: totalCount,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => isOverdue(t.due_date, t.status)).length,
  };

  /* ── Handlers ───────────────────────────────────────────────────── */
  const openCreateModal = () => {
    setEditingTask(null);
    setForm({ title: "", description: "", due_date: "", priority: "medium", status: "pending", lead: "" });
    setShowModal(true);
  };

  const openEditModal = (task: SalesTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
      priority: task.priority,
      status: task.status,
      lead: task.lead || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, due_date: form.due_date || null, lead: form.lead || null };
      if (editingTask) {
        await taskApi.update(editingTask.id, data);
      } else {
        await taskApi.create(data);
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await taskApi.update(taskId, { status: newStatus });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    try {
      await taskApi.delete(taskId);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const clearFilters = () => {
    setFilterSearch(""); setFilterStatus(""); setFilterPriority(""); setFilterLead("");
    setFilterDateFrom(""); setFilterDateTo(""); setFilterDueDateFrom(""); setFilterDueDateTo("");
    setCurrentPage(1);
  };

  const hasActiveFilters = filterSearch || filterStatus || filterPriority || filterLead || filterDateFrom || filterDateTo || filterDueDateFrom || filterDueDateTo;

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-indigo-400" />
            Tarefas
          </h1>
          <p className="text-sm text-gray-400 mt-1">{totalCount} tarefas registradas</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-gray-300", bg: "bg-gray-500/10" },
          { label: "A Fazer", value: stats.pending, color: "text-gray-400", bg: "bg-gray-500/10" },
          { label: "Fazendo", value: stats.inProgress, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Feitas", value: stats.completed, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Atrasadas", value: stats.overdue, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide block">{s.label}</span>
            <span className={cn("text-xl font-bold", s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Buscar tarefas..." value={filterSearch} onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-gray-900/80 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 transition-all">
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>
          <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
            className="bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 transition-all">
            <option value="">Todas as Prioridades</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>

          {/* View toggle */}
          <div className="flex bg-gray-900/80 border border-gray-700 rounded-lg p-0.5">
            <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-md transition-all", viewMode === "list" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-100")}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("card")} className={cn("p-2 rounded-md transition-all", viewMode === "card" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-100")}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
              showFilters ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400" : "bg-gray-900/80 border-gray-700 text-gray-400 hover:text-gray-100")}>
            <Filter className="w-4 h-4" /> Filtros {hasActiveFilters && <span className="w-2 h-2 bg-indigo-400 rounded-full" />}
          </button>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-100 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-700/50">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Lead Associado</label>
              <select value={filterLead} onChange={(e) => setFilterLead(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 transition-all">
                <option value="">Todos os Leads</option>
                {leads.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Criada De</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Prazo De</label>
              <input type="date" value={filterDueDateFrom} onChange={(e) => setFilterDueDateFrom(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Prazo Ate</label>
              <input type="date" value={filterDueDateTo} onChange={(e) => setFilterDueDateTo(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "list" ? (
        /* ── TABLE VIEW ─────────────────────────────────────────── */
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left bg-gray-900/50">
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide w-8"></th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Titulo</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Descricao</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Prioridade</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Lead</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Responsavel</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Prazo</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">Criada em</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide w-20">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => {
                  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                  const StatusIcon = statusCfg.icon;
                  const overdue = isOverdue(task.due_date, task.status);
                  return (
                    <tr key={task.id} className={cn("border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors", overdue && "bg-red-500/5")}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleStatusChange(task.id, task.status === "completed" ? "pending" : "completed")}
                          className={cn("transition-colors", task.status === "completed" ? "text-emerald-400" : "text-gray-500 hover:text-indigo-400")}
                        >
                          <StatusIcon className="w-5 h-5" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-gray-100 font-medium", task.status === "completed" && "line-through text-gray-500")}>
                          {task.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate text-xs">
                        {task.description || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border", statusCfg.bg)}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border", priorityCfg.bg)}>
                          {priorityCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs">
                        {task.lead_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs">
                        {task.assigned_to_name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {task.due_date ? (
                          <span className={cn("text-xs flex items-center gap-1", overdue ? "text-red-400 font-medium" : "text-gray-400")}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.due_date)}
                            {overdue && <AlertTriangle className="w-3 h-3" />}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(task.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal(task)} className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-all" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(task.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <ListTodo className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500">Nenhuma tarefa encontrada</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
              <span className="text-xs text-gray-500">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                  className="p-1.5 text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-700/50 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pn: number;
                  if (totalPages <= 5) pn = i + 1;
                  else if (currentPage <= 3) pn = i + 1;
                  else if (currentPage >= totalPages - 2) pn = totalPages - 4 + i;
                  else pn = currentPage - 2 + i;
                  return (
                    <button key={pn} onClick={() => setCurrentPage(pn)}
                      className={cn("w-8 h-8 rounded text-xs font-medium transition-all", currentPage === pn ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-100 hover:bg-gray-700/50")}>
                      {pn}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                  className="p-1.5 text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-700/50 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── CARD VIEW ──────────────────────────────────────────── */
        <div className="space-y-3">
          {filtered.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
            const StatusIcon = statusCfg.icon;
            const PriorityIcon = priorityCfg.icon;
            const overdue = isOverdue(task.due_date, task.status);

            return (
              <div key={task.id} className={cn(
                "bg-gray-800/80 border rounded-xl p-4 hover:border-gray-600 transition-all group backdrop-blur-sm",
                overdue ? "border-red-500/40" : "border-gray-700/50"
              )}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleStatusChange(task.id, task.status === "completed" ? "pending" : "completed")}
                    className={cn("mt-0.5 transition-colors flex-shrink-0", task.status === "completed" ? "text-emerald-400" : "text-gray-500 hover:text-indigo-400")}
                  >
                    <StatusIcon className="w-5 h-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className={cn("text-sm font-medium", task.status === "completed" ? "text-gray-500 line-through" : "text-gray-100")}>
                        {task.title}
                      </h3>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1", statusCfg.bg)}>
                        {statusCfg.label}
                      </span>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1", priorityCfg.bg)}>
                        <PriorityIcon className="w-3 h-3" />
                        {priorityCfg.label}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      {task.due_date && (
                        <span className={cn("flex items-center gap-1", overdue && "text-red-400 font-medium")}>
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.due_date)}
                          {overdue && <AlertTriangle className="w-3 h-3" />}
                        </span>
                      )}
                      {task.lead_name && (
                        <span className="flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {task.lead_name}
                        </span>
                      )}
                      {task.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assigned_to_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-gray-600">
                        Criada em {formatDate(task.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => openEditModal(task)} className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 bg-gray-800/80 border border-gray-700/50 rounded-xl backdrop-blur-sm">
              <ListTodo className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma tarefa encontrada</p>
            </div>
          )}

          {/* Card view pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="px-3 py-2 text-sm text-gray-400 hover:text-gray-100 disabled:opacity-30 rounded-lg hover:bg-gray-700/50 transition-all">
                Anterior
              </button>
              <span className="text-sm text-gray-500">Pagina {currentPage} de {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="px-3 py-2 text-sm text-gray-400 hover:text-gray-100 disabled:opacity-30 rounded-lg hover:bg-gray-700/50 transition-all">
                Proxima
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingTask ? <Edit2 className="w-5 h-5 text-indigo-400" /> : <Plus className="w-5 h-5 text-indigo-400" />}
                {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-100 p-1 rounded hover:bg-gray-700/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-[11px] text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">Titulo *</label>
                <input type="text" placeholder="Ex: Ligar para cliente" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 transition-all" autoFocus />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">Descricao</label>
                <textarea placeholder="Detalhes da tarefa..." value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 resize-none focus:border-indigo-500 transition-all" />
              </div>

              {/* Status selector */}
              <div>
                <label className="text-[11px] text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">Status</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                    const Icon = v.icon;
                    return (
                      <button key={k} onClick={() => setForm({ ...form, status: k })}
                        className={cn("text-[10px] py-2 px-1 rounded-lg border font-medium transition-all text-center flex flex-col items-center gap-1",
                          form.status === k ? v.bg : "bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600")}>
                        <Icon className="w-3.5 h-3.5" />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority selector */}
              <div>
                <label className="text-[11px] text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">Prioridade</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => {
                    const Icon = v.icon;
                    return (
                      <button key={k} onClick={() => setForm({ ...form, priority: k })}
                        className={cn("text-[10px] py-2 px-1 rounded-lg border font-medium transition-all text-center flex flex-col items-center gap-1",
                          form.priority === k ? v.bg : "bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600")}>
                        <Icon className="w-3.5 h-3.5" />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due date and Lead */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">Prazo</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">Lead Vinculado</label>
                  <select value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 transition-all">
                    <option value="">Nenhum</option>
                    {leads.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-100 rounded-lg hover:bg-gray-700/50 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.title || saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20">
                {saving ? "Salvando..." : "Salvar Tarefa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
