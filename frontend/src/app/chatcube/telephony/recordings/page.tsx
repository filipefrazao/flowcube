"use client";

import { useState, useEffect } from "react";
import {
  Mic,
  Loader2,
  Search,
  Play,
  Pause,
  Download,
  FileText,
  PhoneIncoming,
  PhoneOutgoing,
  Phone,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Filter,
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

const directionIcons: Record<string, React.ReactNode> = {
  INBOUND: <PhoneIncoming className="w-4 h-4 text-green-400" />,
  OUTBOUND: <PhoneOutgoing className="w-4 h-4 text-blue-400" />,
  INTERNAL: <Phone className="w-4 h-4 text-text-secondary" />,
};

const transcriptionStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendente", color: "text-text-secondary", bg: "bg-gray-400/10" },
  processing: { label: "Processando", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  completed: { label: "Transcrita", color: "text-green-400", bg: "bg-green-400/10" },
  failed: { label: "Falhou", color: "text-red-400", bg: "bg-red-400/10" },
  skipped: { label: "Ignorada", color: "text-text-muted", bg: "bg-gray-500/10" },
};

export default function RecordingsPage() {
  const [calls, setCalls] = useState<CallRecordList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState<string | null>(null);

  useEffect(() => {
    loadCalls();
  }, [page]);

  async function loadCalls() {
    try {
      setLoading(true);
      const data = await telephonyApi.listCalls({
        ordering: "-start_time",
        search: search || undefined,
        status: "COMPLETED",
        page,
      });
      setCalls(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    } catch {
      alert("Gravacao nao disponivel para esta chamada");
    }
  }

  async function showTranscription(callId: string) {
    if (transcriptionId === callId) {
      setTranscription(null);
      setTranscriptionId(null);
      return;
    }
    try {
      const data = await telephonyApi.getCall(callId);
      if (data.transcription) {
        setTranscription(data.transcription);
        setTranscriptionId(callId);
      } else {
        alert("Transcricao nao disponivel");
      }
    } catch {
      alert("Erro ao buscar transcricao");
    }
  }

  async function requestTranscription(callId: string) {
    try {
      setTranscribing(callId);
      await telephonyApi.transcribeCall(callId);
      alert("Transcricao solicitada! Aguarde o processamento.");
      loadCalls();
    } catch {
      alert("Erro ao solicitar transcricao");
    } finally {
      setTranscribing(null);
    }
  }

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Gravacoes</h1>
            <span className="text-sm text-text-muted">({totalCount} chamadas completas)</span>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {/* Search */}
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por numero..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); loadCalls(); } }}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <button onClick={() => { setPage(1); loadCalls(); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-text-primary text-sm font-medium transition-colors">
              <Filter className="w-4 h-4" /> Buscar
            </button>
          </div>

          {/* Audio Player */}
          {playingUrl && (
            <div className="mb-4 p-3 bg-surface border border-primary/30 rounded-lg flex items-center gap-3">
              <Play className="w-4 h-4 text-primary flex-shrink-0" />
              <audio controls autoPlay src={playingUrl} className="flex-1 h-8" />
              <a href={playingUrl} download className="p-1.5 text-text-muted hover:text-primary transition-colors" title="Download">
                <Download className="w-4 h-4" />
              </a>
              <button onClick={() => { setPlayingUrl(null); setPlayingId(null); }} className="text-text-muted hover:text-text-primary text-xs">
                Fechar
              </button>
            </div>
          )}

          {/* Transcription Panel */}
          {transcription && (
            <div className="mb-4 p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Transcricao
                </span>
                <button onClick={() => { setTranscription(null); setTranscriptionId(null); }}
                  className="text-xs text-text-muted hover:text-text-primary">Fechar</button>
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{transcription}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma gravacao encontrada</p>
            </div>
          ) : (
            <>
              <div className="bg-surface rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Dir</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">De</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Para</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Agente</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Duracao</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Transcricao</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Data</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => {
                      const tsc = transcriptionStatusConfig[call.transcription_status] || transcriptionStatusConfig.pending;
                      return (
                        <tr key={call.id} className="border-b border-border/50 hover:bg-surface-hover/30">
                          <td className="px-4 py-3">{directionIcons[call.direction]}</td>
                          <td className="px-4 py-3 text-sm text-text-primary font-mono">{call.caller_number || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary font-mono">{call.callee_number || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{call.agent_name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-text-muted font-mono">{formatDuration(call.duration_seconds)}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex px-2 py-1 rounded-full text-xs font-medium", tsc.bg, tsc.color)}>
                              {tsc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">{new Date(call.start_time).toLocaleString("pt-BR")}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => playRecording(call.id)}
                                className={cn("p-1.5 rounded-lg transition-colors", playingId === call.id ? "text-primary bg-primary/10" : "text-text-muted hover:text-primary hover:bg-primary/10")}
                                title="Ouvir gravacao"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                              {call.transcription_status === "completed" && (
                                <button
                                  onClick={() => showTranscription(call.id)}
                                  className={cn("p-1.5 rounded-lg transition-colors", transcriptionId === call.id ? "text-green-400 bg-green-400/10" : "text-text-muted hover:text-green-400 hover:bg-green-400/10")}
                                  title="Ver transcricao"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}
                              {(call.transcription_status === "pending" || call.transcription_status === "failed") && (
                                <button
                                  onClick={() => requestTranscription(call.id)}
                                  disabled={transcribing === call.id}
                                  className="p-1.5 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors disabled:opacity-50"
                                  title="Solicitar transcricao"
                                >
                                  {transcribing === call.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-text-muted">Pagina {page} de {totalPages} ({totalCount} registros)</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                      className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                      className="p-2 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors">
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
