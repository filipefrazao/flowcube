"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Loader2,
  Search,
  Play,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { telephonyApi } from "@/lib/telephonyApi";
import type { CallRecordList } from "@/lib/telephonyApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const directionLabels: Record<string, string> = {
  INBOUND: "Entrada",
  OUTBOUND: "Saida",
  INTERNAL: "Interna",
};

const directionIcons: Record<string, React.ReactNode> = {
  INBOUND: <PhoneIncoming className="w-4 h-4 text-green-400" />,
  OUTBOUND: <PhoneOutgoing className="w-4 h-4 text-blue-400" />,
  INTERNAL: <Phone className="w-4 h-4 text-text-secondary" />,
};

const statusLabels: Record<string, string> = {
  RINGING: "Tocando",
  ANSWERED: "Atendida",
  NO_ANSWER: "Sem Resposta",
  BUSY: "Ocupado",
  FAILED: "Falhou",
  COMPLETED: "Completa",
};

const statusColors: Record<string, { text: string; bg: string }> = {
  COMPLETED: { text: "text-green-400", bg: "bg-green-400/10" },
  ANSWERED: { text: "text-green-400", bg: "bg-green-400/10" },
  NO_ANSWER: { text: "text-yellow-400", bg: "bg-yellow-400/10" },
  BUSY: { text: "text-orange-400", bg: "bg-orange-400/10" },
  FAILED: { text: "text-red-500", bg: "bg-red-500/10" },
  RINGING: { text: "text-blue-400", bg: "bg-blue-400/10" },
};

const transcriptionLabels: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Transcrita",
  failed: "Falhou",
  skipped: "Ignorada",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecordList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dirFilter, setDirFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadCalls();
  }, [page]);

  async function loadCalls() {
    try {
      setLoading(true);
      const params: any = {
        ordering: "-start_time",
        search: search || undefined,
        direction: dirFilter || undefined,
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
      };
      // Remove undefined keys
      Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
      const data = await telephonyApi.listCalls(params);
      setCalls(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error("Failed to load calls", err);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    setPage(1);
    loadCalls();
  }

  async function playRecording(callId: string) {
    if (playingId === callId) {
      setPlayingUrl(null);
      setPlayingId(null);
      return;
    }
    try {
      const data = await telephonyApi.getCallRecording(callId);
      setPlayingUrl(data.recording_url);
      setPlayingId(callId);
    } catch (err) {
      console.error("Recording not available", err);
      alert("Gravacao nao disponivel");
    }
  }

  const totalPages = Math.ceil(totalCount / 20); // DRF default page size

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Historico de Chamadas</h1>
            <span className="text-sm text-text-muted">({totalCount})</span>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar numero..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <select
              value={dirFilter}
              onChange={(e) => setDirFilter(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Todas Direcoes</option>
              <option value="INBOUND">Entrada</option>
              <option value="OUTBOUND">Saida</option>
              <option value="INTERNAL">Interna</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Todos Status</option>
              <option value="COMPLETED">Completa</option>
              <option value="ANSWERED">Atendida</option>
              <option value="NO_ANSWER">Sem Resposta</option>
              <option value="BUSY">Ocupado</option>
              <option value="FAILED">Falhou</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-text-muted text-sm">ate</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={applyFilters}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-text-primary text-sm font-medium transition-colors"
            >
              <Filter className="w-4 h-4" /> Filtrar
            </button>
          </div>

          {/* Audio Player */}
          {playingUrl && (
            <div className="mb-4 p-3 bg-surface border border-primary/30 rounded-lg flex items-center gap-3">
              <Play className="w-4 h-4 text-primary flex-shrink-0" />
              <audio controls autoPlay src={playingUrl} className="flex-1 h-8" />
              <button
                onClick={() => { setPlayingUrl(null); setPlayingId(null); }}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                Fechar
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma chamada encontrada</p>
            </div>
          ) : (
            <>
              <div className="bg-surface rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Direcao</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">De</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Para</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Agente</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Duracao</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Transcricao</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Data</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => {
                      const sc = statusColors[call.status] || { text: "text-text-muted", bg: "bg-surface" };
                      return (
                        <tr key={call.id} className="border-b border-border/50 hover:bg-surface-hover/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {directionIcons[call.direction]}
                              <span className="text-xs text-text-muted">{directionLabels[call.direction]}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-primary font-mono">{call.caller_number || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary font-mono">{call.callee_number || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{call.agent_name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-muted font-mono">{formatDuration(call.duration_seconds)}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex px-2 py-1 rounded-full text-xs font-medium", sc.bg, sc.text)}>
                              {statusLabels[call.status] || call.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-text-muted">
                              {transcriptionLabels[call.transcription_status] || call.transcription_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">
                            {new Date(call.start_time).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => playRecording(call.id)}
                              className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                playingId === call.id
                                  ? "text-primary bg-primary/10"
                                  : "text-text-muted hover:text-primary hover:bg-primary/10"
                              )}
                              title="Ouvir gravacao"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-text-muted">
                    Pagina {page} de {totalPages} ({totalCount} registros)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
