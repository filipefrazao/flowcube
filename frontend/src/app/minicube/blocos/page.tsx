"use client";

import { useEffect, useState } from "react";
import { LayoutList, Plus, Loader2, X, Video, FileText, HelpCircle, CheckSquare, GripVertical } from "lucide-react";
import { miniApi, type Block, type Flow } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

const typeConfig: Record<string, { color: string; icon: any; label: string }> = {
  video: { color: "bg-purple-500/20 text-purple-400", icon: Video, label: "Video" },
  text: { color: "bg-blue-500/20 text-blue-400", icon: FileText, label: "Texto" },
  quiz: { color: "bg-yellow-500/20 text-yellow-400", icon: HelpCircle, label: "Quiz" },
  task: { color: "bg-green-500/20 text-green-400", icon: CheckSquare, label: "Tarefa" },
};

export default function BlocosPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Block>>({
    title: "", type: "text", content: "", order: 0, flow: "", duration_minutes: undefined,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [blockData, flowData] = await Promise.all([
        miniApi.listBlocks({ ordering: "order" }),
        miniApi.listFlows(),
      ]);
      setBlocks(blockData.results || []);
      setFlows(flowData.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ title: "", type: "text", content: "", order: 0, flow: "", duration_minutes: undefined });
    setShowForm(true);
  }

  function openEdit(b: Block) {
    setEditingId(b.id);
    setFormData({
      title: b.title, type: b.type, content: b.content, order: b.order,
      flow: b.flow, duration_minutes: b.duration_minutes,
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = { ...formData };
      if (!payload.duration_minutes) delete payload.duration_minutes;
      if (editingId) {
        await miniApi.updateBlock(editingId, payload);
      } else {
        await miniApi.createBlock(payload);
      }
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este bloco?")) return;
    try { await miniApi.deleteBlock(id); loadData(); } catch (err) { console.error(err); }
  }

  return (
    <div className="flex h-screen bg-background-secondary">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background-secondary flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <LayoutList className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Blocos de Conteudo</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Bloco
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <LayoutList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum bloco encontrado</p>
              {flows.length === 0 && <p className="text-xs mt-2">Crie um Flow primeiro para poder criar blocos.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => {
                const tc = typeConfig[b.type] || typeConfig.text;
                const Icon = tc.icon;
                return (
                  <div key={b.id} className="bg-surface rounded-lg border border-border p-4 flex items-center gap-4 hover:border-primary/50 transition-colors">
                    <GripVertical className="w-4 h-4 text-text-muted cursor-grab" />
                    <span className="text-sm text-text-muted w-8">#{b.order}</span>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tc.color}`}>
                      <Icon className="w-3 h-3" />
                      {tc.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-text-primary truncate">{b.title}</h3>
                      <p className="text-xs text-text-secondary truncate">{b.flow_name || "Sem flow"}{b.duration_minutes ? ` - ${b.duration_minutes}min` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(b)} className="text-primary hover:text-primary text-xs">Editar</button>
                      <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300 text-xs">Excluir</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">{editingId ? "Editar Bloco" : "Novo Bloco"}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-primary mb-1">Titulo *</label>
                  <input type="text" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm text-text-primary mb-1">Flow *</label>
                  <select value={formData.flow || ""} onChange={(e) => setFormData({ ...formData, flow: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                    <option value="">Selecione um flow...</option>
                    {flows.map((f) => <option key={f.id} value={f.id}>{f.name}{f.class_name ? ` (${f.class_name})` : ""}</option>)}
                  </select>
                  {flows.length === 0 && <p className="text-xs text-yellow-400 mt-1">Nenhum flow cadastrado. Crie um flow primeiro.</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-text-primary mb-1">Tipo</label>
                    <select value={formData.type || "text"} onChange={(e) => setFormData({ ...formData, type: e.target.value as Block["type"] })}
                      className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                      <option value="text">Texto</option>
                      <option value="video">Video</option>
                      <option value="quiz">Quiz</option>
                      <option value="task">Tarefa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-primary mb-1">Ordem</label>
                    <input type="number" value={formData.order || 0} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm text-text-primary mb-1">Duracao (min)</label>
                    <input type="number" value={formData.duration_minutes || ""} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || undefined })}
                      placeholder="Opcional"
                      className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-primary mb-1">Conteudo</label>
                  <textarea value={formData.content || ""} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" rows={4} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-primary hover:text-text-primary">Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !formData.flow} className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Salvar" : "Criar Bloco"}
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
