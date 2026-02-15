"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  Plus,
  Loader2,
  Search,
  Pencil,
  Trash2,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { telephonyApi } from "@/lib/telephonyApi";
import type { Extension } from "@/lib/telephonyApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: "Disponivel", color: "text-green-400", bg: "bg-green-400/10" },
  UNAVAILABLE: { label: "Indisponivel", color: "text-gray-400", bg: "bg-gray-400/10" },
  ON_CALL: { label: "Em Chamada", color: "text-red-400", bg: "bg-red-400/10" },
  RINGING: { label: "Tocando", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  DND: { label: "Nao Perturbe", color: "text-orange-400", bg: "bg-orange-400/10" },
};

export default function ExtensionsPage() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Extension | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formNumber, setFormNumber] = useState("");
  const [formUser, setFormUser] = useState<number | "">("");
  const [formPassword, setFormPassword] = useState("");
  const [formWebRTC, setFormWebRTC] = useState(true);

  useEffect(() => {
    loadExtensions();
  }, []);

  async function loadExtensions() {
    try {
      setLoading(true);
      const data = await telephonyApi.listExtensions({ search: search || undefined });
      setExtensions(data.results || []);
    } catch (err) {
      console.error("Failed to load extensions", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormNumber("");
    setFormUser("");
    setFormPassword("");
    setFormWebRTC(true);
    setShowDialog(true);
  }

  function openEdit(ext: Extension) {
    setEditing(ext);
    setFormNumber(ext.extension_number);
    setFormUser(ext.user);
    setFormPassword("");
    setFormWebRTC(ext.webrtc_enabled);
    setShowDialog(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload: any = {
        extension_number: formNumber,
        user: formUser || undefined,
        webrtc_enabled: formWebRTC,
      };
      if (formPassword) payload.sip_password = formPassword;

      if (editing) {
        await telephonyApi.updateExtension(editing.id, payload);
      } else {
        await telephonyApi.createExtension(payload);
      }
      setShowDialog(false);
      loadExtensions();
    } catch (err: any) {
      console.error("Failed to save extension", err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao salvar ramal");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ext: Extension) {
    if (!confirm(`Deseja excluir o ramal ${ext.extension_number}?`)) return;
    try {
      await telephonyApi.deleteExtension(ext.id);
      loadExtensions();
    } catch (err) {
      console.error("Failed to delete extension", err);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Ramais</h1>
            <span className="text-sm text-text-muted">({extensions.length})</span>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Ramal
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar por numero ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadExtensions()}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : extensions.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum ramal encontrado</p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Ramal</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Usuario</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Atualizado</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {extensions.map((ext) => {
                    const sc = statusConfig[ext.status] || statusConfig.UNAVAILABLE;
                    return (
                      <tr key={ext.id} className="border-b border-border/50 hover:bg-surface-hover/30">
                        <td className="px-4 py-3 text-sm text-text-primary font-mono font-medium">{ext.extension_number}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{ext.user_name}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", sc.bg, sc.color)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", sc.color.replace("text-", "bg-"))} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                            {ext.webrtc_enabled ? (
                              <><Wifi className="w-3.5 h-3.5 text-accent-blue" /> WebRTC</>
                            ) : (
                              <><WifiOff className="w-3.5 h-3.5" /> SIP</>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          {new Date(ext.updated_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(ext)}
                              className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ext)}
                              className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Dialog */}
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">
                  {editing ? "Editar Ramal" : "Novo Ramal"}
                </h2>
                <button onClick={() => setShowDialog(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Numero do Ramal</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="Ex: 1001"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">ID do Usuario</label>
                  <input
                    type="number"
                    value={formUser}
                    onChange={(e) => setFormUser(e.target.value ? Number(e.target.value) : "")}
                    placeholder="ID do usuario no sistema"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Senha SIP {editing && "(deixe em branco para manter)"}
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Senha do ramal SIP"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="webrtc"
                    checked={formWebRTC}
                    onChange={(e) => setFormWebRTC(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  <label htmlFor="webrtc" className="text-sm text-text-secondary">Habilitar WebRTC</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formNumber}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
