"use client";

import { useState, useEffect } from "react";
import {
  Voicemail,
  Loader2,
  Play,
  Mail,
  MailOpen,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { telephonyApi } from "@/lib/telephonyApi";
import type { VoicemailMessage } from "@/lib/telephonyApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoicemailPage() {
  const [messages, setMessages] = useState<VoicemailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<string>("");
  const [totalCount, setTotalCount] = useState(0);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);

  useEffect(() => {
    loadVoicemails();
  }, []);

  async function loadVoicemails() {
    try {
      setLoading(true);
      const params: any = {};
      if (readFilter === "unread") params.is_read = false;
      if (readFilter === "read") params.is_read = true;
      const data = await telephonyApi.listVoicemails(params);
      setMessages(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function playAudio(vm: VoicemailMessage) {
    if (playingId === vm.id) {
      setPlayingUrl(null);
      setPlayingId(null);
      return;
    }
    try {
      const data = await telephonyApi.getVoicemailAudio(vm.id);
      setPlayingUrl(data.audio_url);
      setPlayingId(vm.id);
      // Auto-mark as read
      if (!vm.is_read) {
        await telephonyApi.markVoicemailRead(vm.id);
        setMessages((prev) => prev.map((m) => m.id === vm.id ? { ...m, is_read: true } : m));
      }
    } catch {
      alert("Audio nao disponivel");
    }
  }

  async function toggleRead(vm: VoicemailMessage) {
    try {
      if (!vm.is_read) {
        await telephonyApi.markVoicemailRead(vm.id);
        setMessages((prev) => prev.map((m) => m.id === vm.id ? { ...m, is_read: true } : m));
      }
    } catch {
      console.error("Failed to mark as read");
    }
  }

  function showTranscription(vm: VoicemailMessage) {
    if (transcriptionId === vm.id) {
      setTranscriptionId(null);
      setTranscriptionText(null);
      return;
    }
    if (vm.transcription) {
      setTranscriptionId(vm.id);
      setTranscriptionText(vm.transcription);
    } else {
      alert("Transcricao nao disponivel");
    }
  }

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Voicemail className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Caixa Postal</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
                {unreadCount} nao lida(s)
              </span>
            )}
          </div>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {/* Filter */}
          <div className="mb-4 flex gap-3">
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Todas</option>
              <option value="unread">Nao lidas</option>
              <option value="read">Lidas</option>
            </select>
            <button
              onClick={loadVoicemails}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white text-sm font-medium transition-colors"
            >
              <Filter className="w-4 h-4" /> Filtrar
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
              <button onClick={() => { setPlayingUrl(null); setPlayingId(null); }}
                className="text-text-muted hover:text-text-primary text-xs">Fechar</button>
            </div>
          )}

          {/* Transcription Panel */}
          {transcriptionText && (
            <div className="mb-4 p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">Transcricao</span>
                <button onClick={() => { setTranscriptionId(null); setTranscriptionText(null); }}
                  className="text-xs text-text-muted hover:text-text-primary">Fechar</button>
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{transcriptionText}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Voicemail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma mensagem na caixa postal</p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase w-8"></th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">De</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Ramal</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Duracao</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Data</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((vm) => (
                    <tr
                      key={vm.id}
                      className={cn(
                        "border-b border-border/50 hover:bg-surface-hover/30 transition-colors",
                        !vm.is_read && "bg-primary/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRead(vm)}
                          className="text-text-muted hover:text-primary transition-colors"
                          title={vm.is_read ? "Lida" : "Nao lida"}
                        >
                          {vm.is_read ? (
                            <MailOpen className="w-4 h-4 text-text-muted" />
                          ) : (
                            <Mail className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-sm font-mono", !vm.is_read ? "text-text-primary font-medium" : "text-text-secondary")}>
                          {vm.caller_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{vm.extension_number}</td>
                      <td className="px-4 py-3 text-sm text-text-muted font-mono">{formatDuration(vm.duration)}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{new Date(vm.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => playAudio(vm)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              playingId === vm.id ? "text-primary bg-primary/10" : "text-text-muted hover:text-primary hover:bg-primary/10"
                            )}
                            title="Ouvir"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          {vm.transcription && (
                            <button
                              onClick={() => showTranscription(vm)}
                              className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                transcriptionId === vm.id ? "text-green-400 bg-green-400/10" : "text-text-muted hover:text-green-400 hover:bg-green-400/10"
                              )}
                              title="Ver transcricao"
                            >
                              <Voicemail className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
