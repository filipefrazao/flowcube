"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Ticket as TicketIcon,
  Plus,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  X,
  Send,
  Lock,
  Eye,
  ChevronDown,
  Filter,
  RotateCcw,
} from "lucide-react";
import {
  ticketApi,
  leadApi,
  type Ticket,
  type TicketMessage,
  type TicketSummary,
  type Lead,
} from "@/lib/salesApi";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Config Maps
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Aberto", color: "text-blue-400", bg: "bg-blue-500/20 text-blue-400" },
  in_progress: { label: "Em Andamento", color: "text-amber-400", bg: "bg-amber-500/20 text-amber-400" },
  waiting: { label: "Aguardando", color: "text-gray-400", bg: "bg-gray-500/20 text-gray-400" },
  resolved: { label: "Resolvido", color: "text-green-400", bg: "bg-green-500/20 text-green-400" },
  closed: { label: "Fechado", color: "text-gray-500", bg: "bg-gray-600/20 text-gray-500" },
};

const PRIORITY_CONFIG: Record<string, { label: string; bg: string }> = {
  low: { label: "Baixa", bg: "bg-gray-500/20 text-gray-400" },
  medium: { label: "Media", bg: "bg-blue-500/20 text-blue-400" },
  high: { label: "Alta", bg: "bg-orange-500/20 text-orange-400" },
  urgent: { label: "Urgente", bg: "bg-red-500/20 text-red-400" },
};

const CATEGORY_OPTIONS = [
  "Suporte",
  "Financeiro",
  "Tecnico",
  "Comercial",
  "Reclamacao",
  "Duvida",
  "Outros",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-100">{value}</p>
        </div>
        <div className={cn("rounded-lg p-2.5", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<TicketSummary>({
    total: 0,
    open: 0,
    in_progress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = !!(filterDateFrom || filterDateTo);
  const clearAllFilters = () => { setFilterStatus(""); setFilterPriority(""); setFilterCategory(""); setFilterDateFrom(""); setFilterDateTo(""); setSearchQuery(""); };

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    lead: "",
    priority: "medium",
    category: "Suporte",
  });
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category = filterCategory;
      if (searchQuery) params.search = searchQuery;

      const [ticketsRes, leadsRes, summaryRes] = await Promise.all([
        ticketApi.list(params),
        leadApi.list(),
        ticketApi.summary(),
      ]);

      setTickets(ticketsRes.data.results || ticketsRes.data);
      setLeads(leadsRes.data.results || leadsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error("Erro ao carregar tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Create ticket
  // -------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setSaving(true);
    try {
      await ticketApi.create({
        title: createForm.title,
        description: createForm.description,
        lead: createForm.lead || null,
        priority: createForm.priority as Ticket["priority"],
        category: createForm.category,
      });
      setShowCreateModal(false);
      setCreateForm({ title: "", description: "", lead: "", priority: "medium", category: "Suporte" });
      fetchData();
    } catch (err) {
      console.error("Erro ao criar ticket:", err);
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Detail / Messages
  // -------------------------------------------------------------------------

  const openDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketMessages([]);
    setReplyText("");
    setIsInternal(false);
    setLoadingMessages(true);
    try {
      const [detailRes, msgsRes] = await Promise.all([
        ticketApi.get(ticket.id),
        ticketApi.getMessages(ticket.id),
      ]);
      setSelectedTicket(detailRes.data);
      setTicketMessages(Array.isArray(msgsRes.data) ? msgsRes.data : (msgsRes.data as any).results || []);
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      await ticketApi.addMessage(selectedTicket.id, {
        content: replyText,
        is_internal: isInternal,
      });
      setReplyText("");
      setIsInternal(false);
      // Refresh messages
      const msgsRes = await ticketApi.getMessages(selectedTicket.id);
      setTicketMessages(Array.isArray(msgsRes.data) ? msgsRes.data : (msgsRes.data as any).results || []);
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      await ticketApi.resolve(selectedTicket.id);
      setSelectedTicket({ ...selectedTicket, status: "resolved" });
      fetchData();
    } catch (err) {
      console.error("Erro ao resolver ticket:", err);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    try {
      await ticketApi.close(selectedTicket.id);
      setSelectedTicket({ ...selectedTicket, status: "closed" });
      fetchData();
    } catch (err) {
      console.error("Erro ao fechar ticket:", err);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TicketIcon className="h-7 w-7 text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-100">Tickets</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo Ticket
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total de Tickets" value={summary.total} icon={TicketIcon} color="bg-blue-500/20 text-blue-400" />
        <SummaryCard label="Abertos" value={summary.open} icon={AlertCircle} color="bg-blue-500/20 text-blue-400" />
        <SummaryCard label="Em Andamento" value={summary.in_progress} icon={Clock} color="bg-amber-500/20 text-amber-400" />
        <SummaryCard label="Resolvidos" value={summary.resolved} icon={CheckCircle} color="bg-green-500/20 text-green-400" />
      </div>

      {/* Filters */}
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Buscar por titulo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900/80 py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 transition-all">
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 transition-all">
            <option value="">Todas Prioridades</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-900/80 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 transition-all">
            <option value="">Todas Categorias</option>
            {CATEGORY_OPTIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
              showFilters ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400" : "bg-gray-900/80 border-gray-700 text-gray-400 hover:text-gray-100")}>
            <Filter className="w-4 h-4" /> Filtros {hasActiveFilters && <span className="w-2 h-2 bg-indigo-400 rounded-full" />}
          </button>
          {(hasActiveFilters || filterStatus || filterPriority || filterCategory || searchQuery) && (
            <button onClick={clearAllFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-gray-100 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-700/50">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Criado De</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block font-medium uppercase tracking-wide">Criado Ate</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 font-medium">Titulo</th>
                <th className="px-4 py-3 font-medium">Lead / Contato</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Atribuido</th>
                <th className="px-4 py-3 font-medium text-center">Msgs</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Carregando tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    Nenhum ticket encontrado.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                  const pr = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => openDetail(ticket)}
                      className="cursor-pointer border-b border-gray-800/50 transition hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3 font-medium text-gray-100">{ticket.title}</td>
                      <td className="px-4 py-3 text-gray-300">{ticket.lead_name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge text={st.label} className={st.bg} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={pr.label} className={pr.bg} />
                      </td>
                      <td className="px-4 py-3 text-gray-400">{ticket.category || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{ticket.assigned_to_name || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {ticket.messages_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(ticket.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Create Ticket Modal                                               */}
      {/* ================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-100">Novo Ticket</h2>
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
                  placeholder="Descreva o problema brevemente"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Descricao</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  placeholder="Detalhes adicionais..."
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Lead / Contato</label>
                  <select
                    value={createForm.lead}
                    onChange={(e) => setCreateForm({ ...createForm, lead: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-blue-600"
                  >
                    <option value="">Nenhum</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">Prioridade</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-blue-600"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Categoria</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-blue-600"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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
                disabled={saving || !createForm.title.trim()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Criar Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Ticket Detail Modal                                               */}
      {/* ================================================================= */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-800 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h2 className="text-lg font-semibold text-gray-100">{selectedTicket.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      text={STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                      className={STATUS_CONFIG[selectedTicket.status]?.bg || "bg-gray-500/20 text-gray-400"}
                    />
                    <Badge
                      text={PRIORITY_CONFIG[selectedTicket.priority]?.label || selectedTicket.priority}
                      className={PRIORITY_CONFIG[selectedTicket.priority]?.bg || "bg-gray-500/20 text-gray-400"}
                    />
                    {selectedTicket.category && (
                      <span className="text-xs text-gray-500">{selectedTicket.category}</span>
                    )}
                    <span className="text-xs text-gray-600">|</span>
                    <span className="text-xs text-gray-500">
                      {selectedTicket.lead_name || "Sem contato"}
                    </span>
                    {selectedTicket.assigned_to_name && (
                      <>
                        <span className="text-xs text-gray-600">|</span>
                        <span className="text-xs text-gray-500">
                          Atribuido: {selectedTicket.assigned_to_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="text-gray-500 hover:text-gray-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {selectedTicket.description && (
                <p className="mt-3 text-sm text-gray-400">{selectedTicket.description}</p>
              )}
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingMessages ? (
                <p className="py-8 text-center text-sm text-gray-500">Carregando mensagens...</p>
              ) : ticketMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <MessageSquare className="mb-2 h-8 w-8" />
                  <p className="text-sm">Nenhuma mensagem ainda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticketMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-lg border p-4",
                        msg.is_internal
                          ? "border-amber-800/40 bg-amber-950/20"
                          : "border-gray-800 bg-gray-950"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200">
                            {msg.author_name || "Sistema"}
                          </span>
                          {msg.is_internal && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                              <Lock className="h-2.5 w-2.5" />
                              Nota Interna
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600">{fmtDateTime(msg.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-300">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply + Actions */}
            <div className="flex-shrink-0 border-t border-gray-800 px-6 py-4">
              {/* Action Buttons */}
              {selectedTicket.status !== "closed" && (
                <div className="mb-3 flex gap-2">
                  {selectedTicket.status !== "resolved" && (
                    <button
                      onClick={handleResolve}
                      className="flex items-center gap-1.5 rounded-lg border border-green-700/50 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-950/40"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Resolver
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-800"
                  >
                    <X className="h-3.5 w-3.5" />
                    Fechar
                  </button>
                </div>
              )}

              {/* Internal Note Toggle */}
              <div className="mb-2 flex items-center gap-2">
                <button
                  onClick={() => setIsInternal(!isInternal)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
                    isInternal
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-gray-800 text-gray-500 hover:text-gray-300"
                  )}
                >
                  {isInternal ? <Lock className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {isInternal ? "Nota Interna" : "Resposta Publica"}
                </button>
              </div>

              {/* Reply Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  placeholder={isInternal ? "Escrever nota interna..." : "Escrever resposta..."}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-blue-600",
                    isInternal
                      ? "border-amber-800/40 bg-amber-950/20"
                      : "border-gray-800 bg-gray-950"
                  )}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyText.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
