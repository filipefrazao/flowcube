"use client";

import { useEffect, useState } from "react";
import { Workflow, Plus, Loader2, X, BookOpen } from "lucide-react";
import { miniApi, type Flow } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Flow>>({ name: "", description: "", active: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadFlows(); }, []);

  async function loadFlows() {
    try {
      setLoading(true);
      const data = await miniApi.listFlows();
      setFlows(data.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    try {
      setSaving(true);
      await miniApi.createFlow(formData);
      setShowForm(false);
      setFormData({ name: "", description: "", active: true });
      loadFlows();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este flow?")) return;
    try { await miniApi.deleteFlow(id); loadFlows(); } catch (err) { console.error(err); }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Workflow className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Flows Educacionais</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Flow
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : flows.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Workflow className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum flow encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flows.map((f) => (
                <div key={f.id} className="bg-gray-800 rounded-lg border border-gray-700 p-5 hover:border-indigo-500/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-sm font-semibold text-gray-100">{f.name}</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {f.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{f.description || "Sem descricao"}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{f.class_name || "Sem turma"}</span>
                    <span>{f.blocks?.length || 0} blocos</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700 flex justify-end">
                    <button onClick={() => handleDelete(f.id)} className="text-red-400 hover:text-red-300 text-xs">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">Novo Flow</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nome</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Descricao</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" rows={3} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-300 hover:text-gray-100">Cancelar</button>
                  <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Flow
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
