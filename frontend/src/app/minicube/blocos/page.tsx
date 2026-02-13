"use client";

import { useEffect, useState } from "react";
import { LayoutList, Plus, Loader2, X, Video, FileText, HelpCircle, CheckSquare, GripVertical } from "lucide-react";
import { miniApi, type Block } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

const typeConfig: Record<string, { color: string; icon: any; label: string }> = {
  video: { color: "bg-purple-500/20 text-purple-400", icon: Video, label: "Video" },
  text: { color: "bg-blue-500/20 text-blue-400", icon: FileText, label: "Texto" },
  quiz: { color: "bg-yellow-500/20 text-yellow-400", icon: HelpCircle, label: "Quiz" },
  task: { color: "bg-green-500/20 text-green-400", icon: CheckSquare, label: "Tarefa" },
};

export default function BlocosPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Block>>({
    title: "", type: "text", content: "", order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBlocks(); }, []);

  async function loadBlocks() {
    try {
      setLoading(true);
      const data = await miniApi.listBlocks({ ordering: "order" });
      setBlocks(data.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    try {
      setSaving(true);
      await miniApi.createBlock(formData);
      setShowForm(false);
      setFormData({ title: "", type: "text", content: "", order: 0 });
      loadBlocks();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este bloco?")) return;
    try { await miniApi.deleteBlock(id); loadBlocks(); } catch (err) { console.error(err); }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <LayoutList className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Blocos de Conteudo</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Bloco
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <LayoutList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum bloco encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => {
                const tc = typeConfig[b.type] || typeConfig.text;
                const Icon = tc.icon;
                return (
                  <div key={b.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center gap-4 hover:border-indigo-500/50 transition-colors">
                    <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />
                    <span className="text-sm text-gray-500 w-8">#{b.order}</span>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tc.color}`}>
                      <Icon className="w-3 h-3" />
                      {tc.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-100 truncate">{b.title}</h3>
                      <p className="text-xs text-gray-400 truncate">{b.flow_name || "Sem flow"}{b.duration_minutes ? ` - ${b.duration_minutes}min` : ""}</p>
                    </div>
                    <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300 text-xs">Excluir</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">Novo Bloco</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Titulo</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Tipo</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Block["type"] })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500">
                      <option value="text">Texto</option>
                      <option value="video">Video</option>
                      <option value="quiz">Quiz</option>
                      <option value="task">Tarefa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Ordem</label>
                    <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Conteudo</label>
                  <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" rows={4} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-300 hover:text-gray-100">Cancelar</button>
                  <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Bloco
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
