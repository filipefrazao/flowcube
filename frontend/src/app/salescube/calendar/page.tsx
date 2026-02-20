"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  LayoutGrid,
  List,
  CalendarDays,
} from "lucide-react";
import {
  calendarApi,
  taskApi,
  leadApi,
  type CalendarEvent,
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
const DAY_NAMES_FULL = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

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
  low: { label: "Baixa", color: "bg-gray-500/20 text-text-secondary" },
  medium: { label: "Media", color: "bg-yellow-500/20 text-yellow-400" },
  high: { label: "Alta", color: "bg-orange-500/20 text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-500/20 text-red-400" },
};

type ViewMode = "month" | "week" | "day";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

function isSameDayDate(dateStr: string, date: Date): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

function isTodayDate(date: Date): boolean {
  const now = new Date();
  return now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate();
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function getEventHour(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getHours();
}

function formatShortDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ============================================================================
// Sub-components
// ============================================================================

function EventChip({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  const isTask = event.type === "task";
  return (
    <div
      className={cn(
        "rounded px-1.5 py-0.5 truncate text-[10px] leading-tight cursor-default",
        isTask ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-300"
      )}
      title={`${event.title} (${isTask ? "Tarefa" : "Ticket"})`}
    >
      {compact ? event.title.slice(0, 20) : event.title}
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const isTask = event.type === "task";
  const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const priorityCfg = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.medium;

  return (
    <div
      className={cn(
        "border rounded-lg p-3",
        isTask ? "border-primary/30 bg-primary/5" : "border-amber-500/30 bg-amber-500/5"
      )}
    >
      <div className="flex items-start gap-2">
        {isTask ? (
          <StatusIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        ) : (
          <Ticket className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{event.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                isTask ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-300"
              )}
            >
              {isTask ? "Tarefa" : "Ticket"}
            </span>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", priorityCfg.color)}>
              {priorityCfg.label}
            </span>
            <span className="text-[10px] text-text-muted">{statusCfg.label}</span>
          </div>
          {event.lead_name && (
            <p className="text-[11px] text-text-muted mt-1">Lead: {event.lead_name}</p>
          )}
          {event.assigned_to_name && (
            <p className="text-[11px] text-text-muted">Resp: {event.assigned_to_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentDate, setCurrentDate] = useState(new Date(today));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
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
      let startDate: string;
      let endDate: string;

      if (viewMode === "month") {
        startDate = formatDateKey(currentYear, currentMonth, 1);
        const endDay = getDaysInMonth(currentYear, currentMonth);
        endDate = formatDateKey(currentYear, currentMonth, endDay);
      } else if (viewMode === "week") {
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        startDate = formatDateKey(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        endDate = formatDateKey(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
      } else {
        startDate = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        endDate = startDate;
      }

      const res = await calendarApi.getEvents({ start: startDate, end: endDate });
      setEvents(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error("Erro ao carregar eventos:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, currentDate, viewMode]);

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

  const goToPrev = () => {
    if (viewMode === "month") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
      setSelectedDay(null);
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
      setSelectedDay(null);
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const goToToday = () => {
    const t = new Date();
    setCurrentYear(t.getFullYear());
    setCurrentMonth(t.getMonth());
    setCurrentDate(new Date(t));
    setSelectedDay(t.getDate());
  };

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode !== "month") {
      if (selectedDay) {
        setCurrentDate(new Date(currentYear, currentMonth, selectedDay));
      } else {
        setCurrentDate(new Date(currentYear, currentMonth, 1));
      }
    }
  };

  // --------------------------------------------------------------------------
  // Create task from calendar
  // --------------------------------------------------------------------------

  const openCreateForDate = (dateStr: string) => {
    setCreateDate(dateStr);
    setForm({ title: "", description: "", due_date: dateStr, priority: "medium", lead: "" });
    setShowCreateModal(true);
  };

  const openCreateForDay = (day: number) => {
    openCreateForDate(formatDateKey(currentYear, currentMonth, day));
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
  // Title computation
  // --------------------------------------------------------------------------

  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return `${MONTH_NAMES[currentMonth]} ${currentYear}`;
    } else if (viewMode === "week") {
      const ws = getWeekStart(currentDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      const startStr = `${ws.getDate()} ${MONTH_NAMES[ws.getMonth()].slice(0, 3)}`;
      const endStr = `${we.getDate()} ${MONTH_NAMES[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
      return `${startStr} - ${endStr}`;
    } else {
      return `${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()} (${DAY_NAMES_FULL[currentDate.getDay()]})`;
    }
  }, [viewMode, currentMonth, currentYear, currentDate]);

  // --------------------------------------------------------------------------
  // Month view computation
  // --------------------------------------------------------------------------

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  const getEventsForDay = (day: number): CalendarEvent[] => {
    return events.filter((e) => isSameDay(e.start, currentYear, currentMonth, day));
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((e) => isSameDayDate(e.start, date));
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // --------------------------------------------------------------------------
  // Week view
  // --------------------------------------------------------------------------

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  const taskCount = events.filter((e) => e.type === "task").length;
  const ticketCount = events.filter((e) => e.type === "ticket").length;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-primary" />
            Calendario
          </h1>
          <p className="text-sm text-text-secondary mt-1">{headerTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-background-secondary/80 border border-border rounded-lg p-0.5">
            <button
              onClick={() => switchView("month")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "month" ? "bg-primary text-gray-900" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Mes
            </button>
            <button
              onClick={() => switchView("week")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "week" ? "bg-primary text-gray-900" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Semana
            </button>
            <button
              onClick={() => switchView("day")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "day" ? "bg-primary text-gray-900" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <List className="w-3.5 h-3.5" />
              Dia
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm text-text-primary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={goToPrev}
            className="p-2 text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            className="p-2 text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-primary">{taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-amber-300">{ticketCount} {ticketCount === 1 ? "ticket" : "tickets"}</span>
        </div>
        <span className="text-text-muted ml-auto">
          Clique duplo para criar tarefa
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "month" ? (
        /* ================================================================ */
        /* MONTH VIEW                                                       */
        /* ================================================================ */
        <div className="flex gap-6">
          <div className="flex-1">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map((name) => (
                <div key={name} className="text-center text-xs font-medium text-text-muted py-2">
                  {name}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 border-t border-l border-border">
              {Array.from({ length: totalCells }, (_, i) => {
                const day = i - firstDayOfWeek + 1;
                const isValidDay = day >= 1 && day <= daysInMonth;
                const dayEvents = isValidDay ? getEventsForDay(day) : [];
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
                      "min-h-[90px] border-b border-r border-border p-1.5 cursor-pointer transition-colors",
                      isValidDay ? "hover:bg-surface-hover/50" : "bg-background-secondary/30",
                      isSelected && "bg-surface/70 ring-1 ring-primary/50"
                    )}
                  >
                    {isValidDay && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                              todayHighlight ? "bg-primary text-gray-900" : "text-text-secondary"
                            )}
                          >
                            {day}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] text-text-muted">{dayEvents.length}</span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <EventChip key={event.id} event={event} compact />
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-text-muted px-1.5">
                              +{dayEvents.length - 3} mais
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Sidebar */}
          <div className="w-80 shrink-0">
            <div className="bg-surface border border-border rounded-xl p-4 sticky top-6">
              {selectedDay ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-text-primary">
                      {selectedDay} de {MONTH_NAMES[currentMonth]}
                    </h2>
                    <button
                      onClick={() => openCreateForDay(selectedDay)}
                      className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                      title="Criar tarefa"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedDayEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
                      <p className="text-sm text-text-muted">Nenhum evento</p>
                      <button
                        onClick={() => openCreateForDay(selectedDay)}
                        className="mt-2 text-xs text-primary hover:text-primary"
                      >
                        + Criar tarefa
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Selecione um dia para ver eventos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : viewMode === "week" ? (
        /* ================================================================ */
        /* WEEK VIEW                                                        */
        /* ================================================================ */
        <div className="bg-surface/80 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm">
          {/* Week day headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="py-3 text-center text-[10px] text-text-muted border-r border-border" />
            {weekDays.map((day, i) => {
              const isT = isTodayDate(day);
              const dayEvents = getEventsForDate(day);
              return (
                <div
                  key={i}
                  className={cn(
                    "py-3 px-2 text-center border-r border-border last:border-r-0",
                    isT && "bg-primary/10"
                  )}
                >
                  <div className="text-[10px] text-text-muted uppercase">{DAY_NAMES[i]}</div>
                  <div
                    className={cn(
                      "text-lg font-bold mt-0.5",
                      isT ? "text-primary" : "text-text-primary"
                    )}
                  >
                    {day.getDate()}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="text-[9px] text-text-muted mt-0.5">
                      {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hour grid */}
          <div className="max-h-[600px] overflow-y-auto">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[48px]">
                <div className="py-1 px-2 text-[10px] text-text-muted text-right border-r border-border flex items-start justify-end pt-1">
                  {formatHour(hour)}
                </div>
                {weekDays.map((day, di) => {
                  const dayEvents = getEventsForDate(day).filter((e) => getEventHour(e.start) === hour);
                  const dateStr = formatDateKey(day.getFullYear(), day.getMonth(), day.getDate());
                  const isT = isTodayDate(day);
                  return (
                    <div
                      key={di}
                      className={cn(
                        "border-r border-border/50 last:border-r-0 px-1 py-0.5 cursor-pointer hover:bg-surface-hover/20 transition-colors",
                        isT && "bg-primary/5"
                      )}
                      onDoubleClick={() => openCreateForDate(dateStr)}
                    >
                      {dayEvents.map((event) => (
                        <EventChip key={event.id} event={event} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* All-day / unscheduled events */}
          {events.filter((e) => {
            const h = getEventHour(e.start);
            return h === 0;
          }).length > 0 && (
            <div className="border-t border-border p-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Eventos sem horario</p>
              <div className="flex flex-wrap gap-2">
                {events
                  .filter((e) => getEventHour(e.start) === 0)
                  .map((event) => (
                    <EventChip key={event.id} event={event} />
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================================================================ */
        /* DAY VIEW                                                         */
        /* ================================================================ */
        <div className="flex gap-6">
          {/* Hour grid */}
          <div className="flex-1 bg-surface/80 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="max-h-[650px] overflow-y-auto">
              {HOURS.map((hour) => {
                const hourEvents = events.filter((e) => {
                  const d = new Date(e.start);
                  return (
                    d.getFullYear() === currentDate.getFullYear() &&
                    d.getMonth() === currentDate.getMonth() &&
                    d.getDate() === currentDate.getDate() &&
                    d.getHours() === hour
                  );
                });

                const dateStr = formatDateKey(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  currentDate.getDate()
                );

                return (
                  <div
                    key={hour}
                    className="flex border-b border-border/50 min-h-[56px] hover:bg-surface-hover/10 transition-colors"
                    onDoubleClick={() => openCreateForDate(dateStr)}
                  >
                    <div className="w-16 shrink-0 py-2 px-2 text-xs text-text-muted text-right border-r border-border flex items-start justify-end pt-2">
                      {formatHour(hour)}
                    </div>
                    <div className="flex-1 px-3 py-1.5 space-y-1">
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm",
                            event.type === "task"
                              ? "bg-primary/15 border border-primary/30 text-primary"
                              : "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {event.type === "task" ? (
                              <Circle className="w-3.5 h-3.5 text-primary shrink-0" />
                            ) : (
                              <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="font-medium truncate">{event.title}</span>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full ml-auto shrink-0", PRIORITY_CONFIG[event.priority]?.color || "bg-gray-500/20 text-text-secondary")}>
                              {PRIORITY_CONFIG[event.priority]?.label || "Media"}
                            </span>
                          </div>
                          {(event.lead_name || event.assigned_to_name) && (
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-text-secondary">
                              {event.lead_name && <span>Lead: {event.lead_name}</span>}
                              {event.assigned_to_name && <span>Resp: {event.assigned_to_name}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day sidebar - all events */}
          <div className="w-80 shrink-0">
            <div className="bg-surface border border-border rounded-xl p-4 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">
                  {currentDate.getDate()} de {MONTH_NAMES[currentDate.getMonth()]}
                </h2>
                <button
                  onClick={() =>
                    openCreateForDate(
                      formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
                    )
                  }
                  className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                  title="Criar tarefa"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {events.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Nenhum evento</p>
                  <button
                    onClick={() =>
                      openCreateForDate(
                        formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
                      )
                    }
                    className="mt-2 text-xs text-primary hover:text-primary"
                  >
                    + Criar tarefa
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
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
            className="bg-surface border border-border rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Nova Tarefa - {createDate.split("-").reverse().join("/")}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-secondary hover:text-text-primary"
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
                className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted"
                autoFocus
              />
              <textarea
                placeholder="Descricao"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Data limite</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Prioridade</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-background-secondary border border-border text-text-primary rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Lead vinculado</label>
                <select
                  value={form.lead}
                  onChange={(e) => setForm({ ...form, lead: e.target.value })}
                  className="w-full bg-background-secondary border border-border text-text-primary rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Nenhum</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!form.title.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm disabled:opacity-50 transition-colors"
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
