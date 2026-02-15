"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Hash,
  ArrowRight,
  Settings2,
} from "lucide-react";
import { telephonyApi } from "@/lib/telephonyApi";
import type { IVRMenu, IVROption } from "@/lib/telephonyApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

const destTypeLabels: Record<string, string> = {
  EXTENSION: "Ramal",
  QUEUE: "Fila",
  IVR_MENU: "Menu URA",
  VOICEMAIL: "Caixa Postal",
  EXTERNAL: "Externo",
  HANGUP: "Desligar",
};

const destTypeColors: Record<string, string> = {
  EXTENSION: "text-blue-400 bg-blue-400/10",
  QUEUE: "text-green-400 bg-green-400/10",
  IVR_MENU: "text-purple-400 bg-purple-400/10",
  VOICEMAIL: "text-orange-400 bg-orange-400/10",
  EXTERNAL: "text-yellow-400 bg-yellow-400/10",
  HANGUP: "text-red-400 bg-red-400/10",
};

export default function IVRPage() {
  const [menus, setMenus] = useState<IVRMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<IVRMenu | null>(null);
  const [saving, setSaving] = useState(false);

  // Menu form
  const [formName, setFormName] = useState("");
  const [formTimeout, setFormTimeout] = useState(10);
  const [formTimeoutDest, setFormTimeoutDest] = useState("");
  const [formInvalidDest, setFormInvalidDest] = useState("");
  const [formMaxRetries, setFormMaxRetries] = useState(3);

  // Option form
  const [showOptionDialog, setShowOptionDialog] = useState<number | null>(null);
  const [editingOption, setEditingOption] = useState<IVROption | null>(null);
  const [optDigit, setOptDigit] = useState("");
  const [optLabel, setOptLabel] = useState("");
  const [optDestType, setOptDestType] = useState("EXTENSION");
  const [optDestId, setOptDestId] = useState("");
  const [savingOption, setSavingOption] = useState(false);

  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {
    try {
      setLoading(true);
      const data = await telephonyApi.listIVRMenus();
      setMenus(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormName("");
    setFormTimeout(10);
    setFormTimeoutDest("");
    setFormInvalidDest("");
    setFormMaxRetries(3);
    setShowDialog(true);
  }

  function openEdit(menu: IVRMenu) {
    setEditing(menu);
    setFormName(menu.name);
    setFormTimeout(menu.timeout_seconds);
    setFormTimeoutDest(menu.timeout_destination);
    setFormInvalidDest(menu.invalid_destination);
    setFormMaxRetries(menu.max_retries);
    setShowDialog(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = {
        name: formName,
        timeout_seconds: formTimeout,
        timeout_destination: formTimeoutDest,
        invalid_destination: formInvalidDest,
        max_retries: formMaxRetries,
      };
      if (editing) {
        await telephonyApi.updateIVRMenu(editing.id, payload);
      } else {
        await telephonyApi.createIVRMenu(payload);
      }
      setShowDialog(false);
      loadMenus();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao salvar menu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMenu(menu: IVRMenu) {
    if (!confirm(`Deseja excluir o menu "${menu.name}"?`)) return;
    try {
      await telephonyApi.deleteIVRMenu(menu.id);
      loadMenus();
    } catch (err) {
      console.error(err);
    }
  }

  function openAddOption(menuId: number) {
    setShowOptionDialog(menuId);
    setEditingOption(null);
    setOptDigit("");
    setOptLabel("");
    setOptDestType("EXTENSION");
    setOptDestId("");
  }

  function openEditOption(opt: IVROption) {
    setShowOptionDialog(opt.ivr_menu);
    setEditingOption(opt);
    setOptDigit(opt.digit);
    setOptLabel(opt.label);
    setOptDestType(opt.destination_type);
    setOptDestId(opt.destination_id);
  }

  async function handleSaveOption() {
    if (!showOptionDialog) return;
    try {
      setSavingOption(true);
      const payload = {
        ivr_menu: showOptionDialog,
        digit: optDigit,
        label: optLabel,
        destination_type: optDestType,
        destination_id: optDestId,
      };
      if (editingOption) {
        await telephonyApi.updateIVROption(editingOption.id, payload);
      } else {
        await telephonyApi.createIVROption(payload);
      }
      setShowOptionDialog(null);
      loadMenus();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao salvar opcao");
    } finally {
      setSavingOption(false);
    }
  }

  async function handleDeleteOption(optId: number) {
    try {
      await telephonyApi.deleteIVROption(optId);
      loadMenus();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">URA (IVR)</h1>
            <span className="text-sm text-text-muted">({menus.length})</span>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Menu
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : menus.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum menu URA configurado</p>
              <button onClick={openCreate} className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white text-sm font-medium transition-colors">
                Criar primeiro menu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {menus.map((menu) => (
                <div key={menu.id} className="bg-surface border border-border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">{menu.name}</h3>
                      <div className="flex gap-4 mt-1 text-xs text-text-muted">
                        <span>Timeout: {menu.timeout_seconds}s</span>
                        <span>Max tentativas: {menu.max_retries}</span>
                        <span>Timeout dest: {menu.timeout_destination || "-"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(menu)} className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors" title="Editar menu">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteMenu(menu)} className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors" title="Excluir menu">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-text-muted uppercase">Opcoes ({menu.options?.length || 0})</span>
                      <button
                        onClick={() => openAddOption(menu.id)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Nova Opcao
                      </button>
                    </div>
                    {(!menu.options || menu.options.length === 0) ? (
                      <p className="text-xs text-text-muted py-2">Nenhuma opcao configurada</p>
                    ) : (
                      <div className="space-y-2">
                        {menu.options.map((opt) => (
                          <div key={opt.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 hover:bg-surface-hover/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                {opt.digit}
                              </div>
                              <div>
                                <p className="text-sm text-text-primary font-medium">{opt.label}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <ArrowRight className="w-3 h-3 text-text-muted" />
                                  <span className={cn("text-xs px-1.5 py-0.5 rounded", destTypeColors[opt.destination_type] || "text-text-muted")}>
                                    {destTypeLabels[opt.destination_type] || opt.destination_type}
                                  </span>
                                  <span className="text-xs text-text-muted">: {opt.destination_id}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditOption(opt)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Editar opcao">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteOption(opt.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors" title="Excluir opcao">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Menu Create/Edit Dialog */}
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">{editing ? "Editar Menu URA" : "Novo Menu URA"}</h2>
                <button onClick={() => setShowDialog(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Nome</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Menu Principal"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Timeout (s)</label>
                    <input type="number" value={formTimeout} onChange={(e) => setFormTimeout(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Max Tentativas</label>
                    <input type="number" value={formMaxRetries} onChange={(e) => setFormMaxRetries(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Destino no Timeout</label>
                  <input type="text" value={formTimeoutDest} onChange={(e) => setFormTimeoutDest(e.target.value)} placeholder="Ex: queue:support"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Destino Opcao Invalida</label>
                  <input type="text" value={formInvalidDest} onChange={(e) => setFormInvalidDest(e.target.value)} placeholder="Ex: voicemail:1000"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleSave} disabled={saving || !formName}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Option Create/Edit Dialog */}
        {showOptionDialog !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">{editingOption ? "Editar Opcao" : "Nova Opcao"}</h2>
                <button onClick={() => setShowOptionDialog(null)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Digito</label>
                    <input type="text" value={optDigit} onChange={(e) => setOptDigit(e.target.value)} placeholder="1" maxLength={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-center font-mono text-lg focus:outline-none focus:border-primary" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Rotulo</label>
                    <input type="text" value={optLabel} onChange={(e) => setOptLabel(e.target.value)} placeholder="Ex: Vendas"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de Destino</label>
                  <select value={optDestType} onChange={(e) => setOptDestType(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                    <option value="EXTENSION">Ramal</option>
                    <option value="QUEUE">Fila</option>
                    <option value="IVR_MENU">Menu URA</option>
                    <option value="VOICEMAIL">Caixa Postal</option>
                    <option value="EXTERNAL">Numero Externo</option>
                    <option value="HANGUP">Desligar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">ID do Destino</label>
                  <input type="text" value={optDestId} onChange={(e) => setOptDestId(e.target.value)} placeholder="Ex: 1001 ou nome-da-fila"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowOptionDialog(null)}
                  className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors">Cancelar</button>
                <button onClick={handleSaveOption} disabled={savingOption || !optDigit || !optLabel}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50 transition-colors">
                  {savingOption ? <Loader2 className="w-4 h-4 animate-spin" /> : editingOption ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
