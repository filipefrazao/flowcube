"use client";

import { useEffect, useState } from "react";
import { Workflow, Plus, Loader2, X, BookOpen } from "lucide-react";
import { miniApi, type Flow, type MiniClass } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [classes, setClasses] = useState<MiniClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Flow>>({ name: "", description: "", education_class: "", active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [flowData, classData] = await Promise.all([
        miniApi.listFlows(),
        miniApi.listClasses(),
      ]);
      setFlows(flowData.results || []);
      setClasses(classData.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", description: "", education_class: "", active: true });
    setShowForm(true);
  }

  function openEdit(f: Flow) {
    setEditingId(f.id);
    setFormData({ name: f.name, description: f.description, education_class: f.education_class || "", active: f.active });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      if (editingId) {
        await miniApi.updateFlow(editingId, formData);
      } else {
        await miniApi.createFlow(formData);
      }
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este flow?")) return;
    try { await miniApi.deleteFlow(id); loadData(); } catch (err) { console.error(err); }
  }

  return (
    <div className="flex h-screen bg-background-secondary">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background-secondary flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Workflow className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Flows Educacionais</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Flow
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : flows.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <Workflow className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum flow encontrado</p>
              {classes.length === 0 && <p className="text-xs mt-2">Crie uma Turma primeiro para poder criar flows.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flows.map((f) => (
                <div key={f.id} className="bg-surface rounded-lg border border-border p-5 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-semibold text-text-primary">{f.name}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-text-secondary"}`}>
                      {f.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">{f.description || "Sem descricao"}</p>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{f.class_name || "Sem turma"}</span>
                    <span>{f.blocks?.length || 0} blocos</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex justify-end gap-3">
                    <button onClick={() => openEdit(f)} className="text-primary hover:text-primary text-xs">Editar</button>
                    <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-300 text-xs">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">{editingId ? "Editar Flow" : "Novo Flow"}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-primary mb-1">Nome *</label>
                  <input type="text" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm text-text-primary mb-1">Turma *</label>
                  <select value={formData.education_class || ""} onChange={(e) => setFormData({ ...formData, education_class: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                    <option value="">Selecione uma turma...</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.location_name ? ` (${c.location_name})` : ""}</option>)}
                  </select>
                  {classes.length === 0 && <p className="text-xs text-yellow-400 mt-1">Nenhuma turma cadastrada. Crie uma turma primeiro.</p>}
                </div>
                <div>
                  <label className="block text-sm text-text-primary mb-1">Descricao</label>
                  <textarea value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" rows={3} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="flow-active" checked={formData.active !== false}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="accent-primary" />
                  <label htmlFor="flow-active" className="text-sm text-text-primary">Ativo</label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-primary hover:text-text-primary">Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !formData.education_class} className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Salvar" : "Criar Flow"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
