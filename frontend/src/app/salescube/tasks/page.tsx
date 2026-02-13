"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Calendar, AlertCircle, CheckCircle2, Clock, Circle, Edit2 } from "lucide-react";
import { taskApi, leadApi, type SalesTask, type Lead } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-gray-500/20 text-gray-400" },
  medium: { label: "Media", color: "bg-yellow-500/20 text-yellow-400" },
  high: { label: "Alta", color: "bg-orange-500/20 text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-500/20 text-red-400" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pendente", icon: Circle },
  in_progress: { label: "Em Progresso", icon: Clock },
  completed: { label: "Concluida", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", icon: AlertCircle },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<SalesTask | null>(null);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", priority: "medium", status: "pending", lead: "" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, leadsRes] = await Promise.all([taskApi.list(), leadApi.list()]);
      setTasks(tasksRes.data.results || tasksRes.data);
      setLeads(leadsRes.data.results || leadsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setForm({ title: "", description: "", due_date: "", priority: "medium", status: "pending", lead: "" });
    setShowModal(true);
  };

  const openEditModal = (task: SalesTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
      priority: task.priority,
      status: task.status,
      lead: task.lead || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        due_date: form.due_date || null,
        lead: form.lead || null,
      };
      if (editingTask) {
        await taskApi.update(editingTask.id, data);
      } else {
        await taskApi.create(data);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await taskApi.update(taskId, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    try {
      await taskApi.delete(taskId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = tasks.filter((t) => {
    const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchPriority = !filterPriority || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tarefas</h1>
          <p className="text-sm text-gray-400">{filtered.length} tarefas</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Buscar tarefas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
        </select>
      </div>

      {/* Tasks */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
            const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const overdue = task.status !== "completed" && isOverdue(task.due_date);

            return (
              <div
                key={task.id}
                className={cn(
                  "bg-gray-800 border rounded-lg p-4 hover:border-gray-600 transition-colors group",
                  overdue ? "border-red-500/50" : "border-gray-700"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleStatusChange(task.id, task.status === "completed" ? "pending" : "completed")}
                    className={cn("mt-0.5 transition-colors", task.status === "completed" ? "text-green-400" : "text-gray-500 hover:text-indigo-400")}
                  >
                    <StatusIcon className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn("text-sm font-medium", task.status === "completed" ? "text-gray-500 line-through" : "text-gray-100")}>{task.title}</h3>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", priorityConfig.color)}>{priorityConfig.label}</span>
                    </div>
                    {task.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {task.due_date && (
                        <span className={cn("flex items-center gap-1", overdue && "text-red-400")}>
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {task.lead_name && <span>Lead: {task.lead_name}</span>}
                      {task.assigned_to_name && <span>Resp: {task.assigned_to_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(task)} className="p-1.5 text-gray-500 hover:text-indigo-400"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(task.id)} className="p-1.5 text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-gray-500">Nenhuma tarefa encontrada</div>}
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Titulo *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" autoFocus />
              <textarea placeholder="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Data limite</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Prioridade</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                  </select>
                </div>
              </div>
              {editingTask && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Lead vinculado</label>
                <select value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                  <option value="">Nenhum</option>
                  {leads.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancelar</button>
              <button onClick={handleSave} disabled={!form.title} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
