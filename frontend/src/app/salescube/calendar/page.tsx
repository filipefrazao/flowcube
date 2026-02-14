"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Ticket,
} from "lucide-react";
import {
  calendarApi,
  taskApi,
  leadApi,
  type CalendarEvent,
  type SalesTask,
  type Lead,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pendente", icon: Circle },
  in_progress: { label: "Em Progresso", icon: Clock },
  completed: { label: "Concluida", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", icon: AlertCircle },
  open: { label: "Aberto", icon: Circle },
  resolved: { label: "Resolvido", icon: CheckCircle2 },
  closed: { label: "Fechado", icon: AlertCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-gray-500/20 text-gray-400" },
  medium: { label: "Media", color: "bg-yellow-500/20 text-yellow-400" },
  high: { label: "Alta", color: "bg-orange-500/20 text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-500/20 text-red-400" },
};

// ============================================================================
// Helpers
// ============================================================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function isSameDay(dateStr: string, year: number, month: number, day: number): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

// ============================================================================
// Component
// ============================================================================

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDate, setCreateDate] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    lead: "",
  });

  // --------------------------------------------------------------------------
  // Data fetching
  // --------------------------------------------------------------------------

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = formatDateKey(currentYear, currentMonth, 1);
      const endDay = getDaysInMonth(currentYear, currentMonth);
      const endDate = formatDateKey(currentYear, currentMonth, endDay);
      const res = await calendarApi.getEvents({ start: startDate, end: endDate });
      setEvents(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("Erro ao carregar eventos:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await leadApi.list();
      setLeads(res.data.results || res.data || []);
    } catch {
      setLeads([]);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  // --------------------------------------------------------------------------
  // Create task from calendar
  // --------------------------------------------------------------------------

  const openCreateForDay = (day: number) => {
    const dateStr = formatDateKey(currentYear, currentMonth, day);
    setCreateDate(dateStr);
    setForm({ title: "", description: "", due_date: dateStr, priority: "medium", lead: "" });
    setShowCreateModal(true);
  };

  const handleCreateTask = async () => {
    if (!form.title.trim()) return;
    try {
      await taskApi.create({
        title: form.title,
        description: form.description,
        due_date: form.due_date || null,
        priority: form.priority,
        status: "pending",
        lead: form.lead || null,
      });
      setShowCreateModal(false);
      fetchEvents();
    } catch (err) {
      console.error("Erro ao criar tarefa:", err);
    }
  };

  // --------------------------------------------------------------------------
  // Calendar grid computation
  // --------------------------------------------------------------------------

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const getEventsForDay = (day: number): CalendarEvent[] => {
    return events.filter((e) => isSameDay(e.start, currentYear, currentMonth, day));
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario</h1>
          <p className="text-sm text-gray-400">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={goToPrevMonth}
            className="p-2 text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Calendar Grid */}
          <div className="flex-1">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map((name) => (
                <div
                  key={name}
                  className="text-center text-xs font-medium text-gray-500 py-2"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 border-t border-l border-gray-700">
              {Array.from({ length: totalCells }, (_, i) => {
                const day = i - firstDayOfWeek + 1;
                const isValidDay = day >= 1 && day <= daysInMonth;
                const dayEvents = isValidDay ? getEventsForDay(day) : [];
                const taskEvents = dayEvents.filter((e) => e.type === "task");
                const ticketEvents = dayEvents.filter((e) => e.type === "ticket");
                const todayHighlight = isValidDay && isToday(currentYear, currentMonth, day);
                const isSelected = isValidDay && selectedDay === day;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (isValidDay) setSelectedDay(day);
                    }}
                    onDoubleClick={() => {
                      if (isValidDay) openCreateForDay(day);
                    }}
                    className={cn(
                      "min-h-[90px] border-b border-r border-gray-700 p-1.5 cursor-pointer transition-colors",
                      isValidDay ? "hover:bg-gray-800/50" : "bg-gray-900/30",
                      isSelected && "bg-gray-800/70 ring-1 ring-indigo-500/50"
                    )}
                  >
                    {isValidDay && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                              todayHighlight
                                ? "bg-indigo-600 text-white"
                                : "text-gray-400"
                            )}
                          >
                            {day}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] text-gray-600">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-[10px] leading-tight px-1.5 py-0.5 rounded truncate",
                                event.type === "task"
                                  ? "bg-indigo-500/20 text-indigo-300"
                                  : "bg-amber-500/20 text-amber-300"
                              )}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-gray-500 px-1.5">
                              +{dayEvents.length - 3} mais
                            </div>
                          )}
                        </div>
                        {dayEvents.length === 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {/* Empty state - subtle plus on hover */}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Tarefa
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Ticket
              </div>
              <span className="text-gray-600 ml-2">
                Clique duplo para criar tarefa
              </span>
            </div>
          </div>

          {/* Selected Day Sidebar */}
          <div className="w-80 shrink-0">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sticky top-6">
              {selectedDay ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white">
                      {selectedDay} de {MONTH_NAMES[currentMonth]}
                    </h2>
                    <button
                      onClick={() => openCreateForDay(selectedDay)}
                      className="p-1.5 text-gray-400 hover:text-indigo-400 transition-colors"
                      title="Criar tarefa"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedDayEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Nenhum evento</p>
                      <button
                        onClick={() => openCreateForDay(selectedDay)}
                        className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        + Criar tarefa
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayEvents.map((event) => {
                        const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
                        const StatusIcon = statusCfg.icon;
                        const priorityCfg = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.medium;

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "border rounded-lg p-3",
                              event.type === "task"
                                ? "border-indigo-500/30 bg-indigo-500/5"
                                : "border-amber-500/30 bg-amber-500/5"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {event.type === "task" ? (
                                <StatusIcon className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                              ) : (
                                <Ticket className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-100 truncate">
                                  {event.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span
                                    className={cn(
                                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                      event.type === "task"
                                        ? "bg-indigo-500/20 text-indigo-300"
                                        : "bg-amber-500/20 text-amber-300"
                                    )}
                                  >
                                    {event.type === "task" ? "Tarefa" : "Ticket"}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                      priorityCfg.color
                                    )}
                                  >
                                    {priorityCfg.label}
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    {statusCfg.label}
                                  </span>
                                </div>
                                {event.lead_name && (
                                  <p className="text-[11px] text-gray-500 mt-1">
                                    Lead: {event.lead_name}
                                  </p>
                                )}
                                {event.assigned_to_name && (
                                  <p className="text-[11px] text-gray-500">
                                    Resp: {event.assigned_to_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Selecione um dia para ver eventos
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Nova Tarefa - {createDate.split("-").reverse().join("/")}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Titulo da tarefa *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
                autoFocus
              />
              <textarea
                placeholder="Descricao"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Data limite
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Prioridade
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Lead vinculado
                </label>
                <select
                  value={form.lead}
                  onChange={(e) => setForm({ ...form, lead: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Nenhum</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!form.title.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
