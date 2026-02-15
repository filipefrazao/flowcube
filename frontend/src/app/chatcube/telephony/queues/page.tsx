"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  UserPlus,
  UserMinus,
  Clock,
} from "lucide-react";
import { telephonyApi } from "@/lib/telephonyApi";
import type { CallQueue, Extension } from "@/lib/telephonyApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

const strategyLabels: Record<string, string> = {
  ringall: "Tocar Todos",
  leastrecent: "Menos Recente",
  fewestcalls: "Menos Chamadas",
  random: "Aleatorio",
  rrmemory: "Round Robin",
};

export default function QueuesPage() {
  const [queues, setQueues] = useState<CallQueue[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CallQueue | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState<CallQueue | null>(null);
  const [memberExt, setMemberExt] = useState<number | "">("");
  const [memberPriority, setMemberPriority] = useState(1);

  // Form state
  const [formName, setFormName] = useState("");
  const [formStrategy, setFormStrategy] = useState("ringall");
  const [formTimeout, setFormTimeout] = useState(30);
  const [formMaxWait, setFormMaxWait] = useState(300);
  const [formMOH, setFormMOH] = useState("default");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [qData, eData] = await Promise.all([
        telephonyApi.listQueues().catch(() => ({ results: [] })),
        telephonyApi.listExtensions().catch(() => ({ results: [] })),
      ]);
      setQueues(qData.results || []);
      setExtensions(eData.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormName("");
    setFormStrategy("ringall");
    setFormTimeout(30);
    setFormMaxWait(300);
    setFormMOH("default");
    setShowDialog(true);
  }

  function openEdit(q: CallQueue) {
    setEditing(q);
    setFormName(q.name);
    setFormStrategy(q.strategy);
    setFormTimeout(q.timeout);
    setFormMaxWait(q.max_wait_time);
    setFormMOH(q.music_on_hold);
    setShowDialog(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = {
        name: formName,
        strategy: formStrategy,
        timeout: formTimeout,
        max_wait_time: formMaxWait,
        music_on_hold: formMOH,
      };
      if (editing) {
        await telephonyApi.updateQueue(editing.id, payload);
      } else {
        await telephonyApi.createQueue(payload);
      }
      setShowDialog(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao salvar fila");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q: CallQueue) {
    if (!confirm(`Deseja excluir a fila "${q.name}"?`)) return;
    try {
      await telephonyApi.deleteQueue(q.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function addMember() {
    if (!showMemberDialog || !memberExt) return;
    try {
      await telephonyApi.addQueueMember({
        queue: showMemberDialog.id,
        extension: Number(memberExt),
        priority: memberPriority,
      });
      setShowMemberDialog(null);
      setMemberExt("");
      setMemberPriority(1);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data ? JSON.stringify(err.response.data) : "Erro ao adicionar membro");
    }
  }

  async function removeMember(memberId: number) {
    try {
      await telephonyApi.removeQueueMember(memberId);
      loadData();
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
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Filas de Atendimento</h1>
            <span className="text-sm text-text-muted">({queues.length})</span>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Fila
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : queues.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma fila de atendimento configurada</p>
              <button onClick={openCreate} className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white text-sm font-medium transition-colors">
                Criar primeira fila
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {queues.map((q) => (
                <div key={q.id} className="bg-surface border border-border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">{q.name}</h3>
                      <p className="text-sm text-text-muted mt-0.5">
                        Estrategia: <span className="text-text-secondary">{strategyLabels[q.strategy] || q.strategy}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(q)} className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(q)} className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-text-muted mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Timeout: {q.timeout}s</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Espera max: {q.max_wait_time}s</span>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-text-muted uppercase">Membros ({q.members?.length || 0})</span>
                      <button
                        onClick={() => { setShowMemberDialog(q); setMemberExt(""); setMemberPriority(1); }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    </div>
                    {(!q.members || q.members.length === 0) ? (
                      <p className="text-xs text-text-muted py-2">Nenhum membro nesta fila</p>
                    ) : (
                      <div className="space-y-1">
                        {q.members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-hover/50">
                            <div>
                              <span className="text-sm text-text-primary">{m.extension_number}</span>
                              <span className="text-xs text-text-muted ml-2">{m.user_name}</span>
                              <span className="text-xs text-text-muted ml-2">(P:{m.priority})</span>
                            </div>
                            <button
                              onClick={() => removeMember(m.id)}
                              className="p-1 text-text-muted hover:text-red-400 transition-colors"
                              title="Remover membro"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
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

        {/* Queue Create/Edit Dialog */}
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">
                  {editing ? "Editar Fila" : "Nova Fila"}
                </h2>
                <button onClick={() => setShowDialog(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Nome</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Vendas"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Estrategia</label>
                  <select value={formStrategy} onChange={(e) => setFormStrategy(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                    <option value="ringall">Tocar Todos</option>
                    <option value="leastrecent">Menos Recente</option>
                    <option value="fewestcalls">Menos Chamadas</option>
                    <option value="random">Aleatorio</option>
                    <option value="rrmemory">Round Robin</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Timeout (s)</label>
                    <input type="number" value={formTimeout} onChange={(e) => setFormTimeout(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Espera Max (s)</label>
                    <input type="number" value={formMaxWait} onChange={(e) => setFormMaxWait(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Musica de espera</label>
                  <input type="text" value={formMOH} onChange={(e) => setFormMOH(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowDialog(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface-hover transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !formName}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Member Dialog */}
        {showMemberDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">
                  Adicionar Membro a "{showMemberDialog.name}"
                </h2>
                <button onClick={() => setShowMemberDialog(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Ramal</label>
                  <select value={memberExt} onChange={(e) => setMemberExt(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                    <option value="">Selecione um ramal</option>
                    {extensions.map((ext) => (
                      <option key={ext.id} value={ext.id}>{ext.extension_number} - {ext.user_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Prioridade</label>
                  <input type="number" min={1} value={memberPriority} onChange={(e) => setMemberPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowMemberDialog(null)}
                  className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors">
                  Cancelar
                </button>
                <button onClick={addMember} disabled={!memberExt}
                  className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50 transition-colors">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
