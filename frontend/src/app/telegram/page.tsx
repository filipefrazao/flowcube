"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Send,
  Loader2,
  AlertCircle,
  Plus,
  Link as LinkIcon,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface TelegramBotListItem {
  id: string;
  username: string | null;
  first_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  chat_count: number;
  created_at: string;
  updated_at: string;
}

async function authedFetch(path: string, init?: RequestInit) {
  const token = getAuthToken();
  const headers: HeadersInit = {
    ...(init?.headers || {}),
  };
  if (token) (headers as any).Authorization = `Token ${token}`;

  const res = await fetch(path, {
    ...init,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function TelegramPage() {
  const [bots, setBots] = useState<TelegramBotListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [token, setToken] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [webhookInfo, setWebhookInfo] = useState<any>(null);

  const canCreate = useMemo(() => token.trim().length > 10, [token]);

  async function loadBots() {
    try {
      setLoading(true);
      setError(null);
      const r = await authedFetch("/api/telegram/bots/");
      if (!r.ok) {
        setError(r.data?.detail || r.data?.error || `Falha ao listar bots (HTTP ${r.status})`);
        setBots([]);
        return;
      }
      setBots(Array.isArray(r.data) ? r.data : (r.data?.results || []));
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar Telegram");
    } finally {
      setLoading(false);
    }
  }

  async function createBot() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const r = await authedFetch("/api/telegram/bots/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          description: description.trim() || undefined,
        }),
      });
      if (!r.ok) {
        setError(r.data?.token?.[0] || r.data?.detail || r.data?.error || `Falha ao criar bot (HTTP ${r.status})`);
        return;
      }
      setToken("");
      setDescription("");
      await loadBots();
    } finally {
      setCreating(false);
    }
  }

  async function setWebhook(botId: string) {
    setError(null);
    const r = await authedFetch(`/api/telegram/bots/${botId}/set_webhook/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!r.ok) {
      setError(r.data?.detail || r.data?.error || `Falha ao setar webhook (HTTP ${r.status})`);
      return;
    }
  }

  async function deleteWebhook(botId: string) {
    setError(null);
    const r = await authedFetch(`/api/telegram/bots/${botId}/delete_webhook/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!r.ok) {
      setError(r.data?.detail || r.data?.error || `Falha ao deletar webhook (HTTP ${r.status})`);
      return;
    }
  }

  async function getWebhookInfo(botId: string) {
    setError(null);
    const r = await authedFetch(`/api/telegram/bots/${botId}/webhook_info/`);
    if (!r.ok) {
      setError(r.data?.detail || r.data?.error || `Falha ao obter webhook_info (HTTP ${r.status})`);
      return;
    }
    setWebhookInfo(r.data);
  }

  async function deleteBot(botId: string) {
    setError(null);
    const r = await authedFetch(`/api/telegram/bots/${botId}/`, { method: "DELETE" });
    if (!r.ok) {
      setError(r.data?.detail || r.data?.error || `Falha ao deletar bot (HTTP ${r.status})`);
      return;
    }
    await loadBots();
  }

  useEffect(() => {
    loadBots();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Telegram</h1>
            <p className="text-sm text-text-muted">Bots e webhooks</p>
          </div>
          <button
            type="button"
            onClick={loadBots}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Atualizar
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : null}

          {/* Create */}
          <section className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-5 h-5 text-primary" />
              <h2 className="text-text-primary font-semibold">Adicionar bot</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-1">Token</label>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456789:AA..."
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted uppercase tracking-wider mb-1">Descricao</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Suporte / Atendimento"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={createBot}
              disabled={!canCreate || creating}
              className="mt-3 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-primary font-medium transition-colors flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Criar bot
            </button>

            <p className="mt-3 text-sm text-text-muted">
              Depois de criar, use <strong>Set webhook</strong> para habilitar recebimento de updates.
            </p>
          </section>

          {/* Bots */}
          <section>
            <h2 className="text-text-primary font-semibold mb-3">Bots</h2>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : bots.length === 0 ? (
              <div className="p-6 bg-surface border border-border rounded-lg text-text-muted">
                Nenhum bot cadastrado.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {bots.map((b) => (
                  <div key={b.id} className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-text-primary font-semibold truncate">
                            {b.first_name || b.username || "(sem nome)"}
                          </h3>
                          {b.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-green-500/10 text-green-400 border-green-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                              <XCircle className="w-3.5 h-3.5" />
                              unverified
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-muted mt-1">Chats: {b.chat_count}</p>
                        <p className="text-xs text-text-muted mt-1">ID: {b.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteBot(b.id)}
                        className="p-2 rounded-lg border border-border bg-background hover:bg-surface-hover text-text-muted"
                        title="Deletar bot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setWebhook(b.id)}
                        className="px-3 py-2 bg-primary hover:bg-primary-hover rounded-lg text-text-primary text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Set webhook
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWebhook(b.id)}
                        className="px-3 py-2 bg-surface-hover hover:bg-surface border border-border rounded-lg text-text-secondary text-sm font-medium transition-colors"
                      >
                        Remover webhook
                      </button>
                      <button
                        type="button"
                        onClick={() => getWebhookInfo(b.id)}
                        className="px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary text-sm font-medium transition-colors"
                      >
                        Webhook info
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {webhookInfo ? (
            <section className="bg-background border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="text-text-primary font-semibold">Webhook info</h2>
                <button
                  type="button"
                  onClick={() => setWebhookInfo(null)}
                  className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary text-sm"
                >
                  Fechar
                </button>
              </div>
              <pre className="text-xs overflow-auto">{JSON.stringify(webhookInfo, null, 2)}</pre>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
