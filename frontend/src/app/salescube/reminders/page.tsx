"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Plus,
  Search,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Trash2,
} from "lucide-react";
import {
  reminderApi,
  leadApi,
  type Reminder,
  type Lead,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";

function fmtDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {text}
    </span>
  );
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompleted, setFilterCompleted] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    remind_at: "",
    lead: "",
  });
  const [saving, setSaving] = useState(false);

  // Stats
  const [upcoming, setUpcoming] = useState<Reminder[]>([]);
  const [overdue, setOverdue] = useState<Reminder[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterCompleted) params.is_completed = filterCompleted;
      if (searchQuery) params.search = searchQuery;

      const [remindersRes, leadsRes, upcomingRes, overdueRes] = await Promise.all([
        reminderApi.list(params),
        leadApi.list({ limit: "200" }),
        reminderApi.upcoming(),
        reminderApi.overdue(),
      ]);

      setReminders(remindersRes.data.results || remindersRes.data);
      setLeads(leadsRes.data.results || leadsRes.data);
      setUpcoming(upcomingRes.data.results || upcomingRes.data || []);
      setOverdue(overdueRes.data.results || overdueRes.data || []);
    } catch (err) {
      console.error("Erro ao carregar lembretes:", err);
    } finally {
      setLoading(false);
    }
  }, [filterCompleted, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.remind_at) return;
    setSaving(true);
    try {
      await reminderApi.create({
        title: createForm.title,
        description: createForm.description,
        remind_at: createForm.remind_at,
        lead: createForm.lead || null,
      });
      setShowCreateModal(false);
      setCreateForm({ title: "", description: "", remind_at: "", lead: "" });
      fetchData();
    } catch (err) {
      console.error("Erro ao criar lembrete:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await reminderApi.complete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao completar lembrete:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lembrete?")) return;
    try {
      await reminderApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir lembrete:", err);
    }
  };

  const totalReminders = reminders.length;
  const completedCount = reminders.filter((r) => r.is_completed).length;
  const pendingCount = totalReminders - completedCount;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-7 w-7 text-amber-400" />
          <h1 className="text-2xl font-bold text-gray-100">Lembretes</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          Novo Lembrete
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{totalReminders}</p>
            </div>
            <div className="rounded-lg bg-amber-500/20 p-2.5 text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pendentes</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{pendingCount}</p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-2.5 text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Atrasados</p>
              <p className="mt-1 text-2xl font-bold text-red-400">{overdue.length}</p>
            </div>
            <div className="rounded-lg bg-red-500/20 p-2.5 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Concluidos</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{completedCount}</p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-2.5 text-green-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar lembretes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-amber-600"
          />
        </div>
        <select
          value={filterCompleted}
          onChange={(e) => setFilterCompleted(e.target.value)}
          className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-amber-600"
        >
          <option value="">Todos</option>
          <option value="false">Pendentes</option>
          <option value="true">Concluidos</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 font-medium">Titulo</th>
                <th className="px-4 py-3 font-medium">Data/Hora</th>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Atribuido</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Carregando lembretes...
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Nenhum lembrete encontrado.
                  </td>
                </tr>
              ) : (
                reminders.map((reminder) => {
                  const isOverdue = !reminder.is_completed && new Date(reminder.remind_at) < new Date();
                  return (
                    <tr
                      key={reminder.id}
                      className={cn(
                        "border-b border-gray-800/50 transition hover:bg-gray-800/40",
                        reminder.is_completed && "opacity-60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className={cn("font-medium", reminder.is_completed ? "text-gray-500 line-through" : "text-gray-100")}>
                          {reminder.title}
                        </span>
                        {reminder.description && (
                          <p className="mt-0.5 text-xs text-gray-500 truncate max-w-xs">{reminder.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-sm", isOverdue ? "text-red-400" : "text-gray-300")}>
                          {fmtDateTime(reminder.remind_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{reminder.lead_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{reminder.assigned_to_name || "—"}</td>
                      <td className="px-4 py-3">
                        {reminder.is_completed ? (
                          <Badge text="Concluido" className="bg-green-500/20 text-green-400" />
                        ) : isOverdue ? (
                          <Badge text="Atrasado" className="bg-red-500/20 text-red-400" />
                        ) : (
                          <Badge text="Pendente" className="bg-blue-500/20 text-blue-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {!reminder.is_completed && (
                            <button
                              onClick={() => handleComplete(reminder.id)}
                              className="rounded p-1.5 text-gray-500 transition hover:bg-green-500/10 hover:text-green-400"
                              title="Marcar como concluido"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(reminder.id)}
                            className="rounded p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-100">Novo Lembrete</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Titulo *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Titulo do lembrete"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Descricao</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={2}
                  placeholder="Detalhes adicionais..."
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-amber-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Data/Hora *</label>
                  <input
                    type="datetime-local"
                    value={createForm.remind_at}
                    onChange={(e) => setCreateForm({ ...createForm, remind_at: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Lead</label>
                  <select
                    value={createForm.lead}
                    onChange={(e) => setCreateForm({ ...createForm, lead: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-amber-600"
                  >
                    <option value="">Nenhum</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-800 px-6 py-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.title.trim() || !createForm.remind_at}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Criar Lembrete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
