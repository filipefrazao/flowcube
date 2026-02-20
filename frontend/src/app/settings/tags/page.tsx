"use client";

import { useEffect, useState } from "react";
import { Tag as TagIcon, Plus, Loader2, X, Trash2 } from "lucide-react";
import { settingsExtApi, type Tag } from "@/lib/settingsExtApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

const ENTITY_TYPES = ["lead", "contact", "deal", "task", "class", "student"];

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Tag>>({ name: "", color: "#6366f1", entity_type: "lead" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTags(); }, [filterType]);

  async function loadTags() {
    try {
      setLoading(true);
      const params = filterType ? { entity_type: filterType } : undefined;
      const d = await settingsExtApi.listTags(params);
      setTags(d.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    try { setSaving(true); await settingsExtApi.createTag(formData); setShowForm(false); setFormData({ name: "", color: "#6366f1", entity_type: "lead" }); loadTags(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza?")) return;
    try { await settingsExtApi.deleteTag(id); loadTags(); } catch (err) { console.error(err); }
  }

  return (
    <div className="flex h-screen bg-background-secondary">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background-secondary flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <TagIcon className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Tags</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Nova Tag
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          <div className="mb-4 flex gap-2">
            <button onClick={() => setFilterType("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!filterType ? "bg-primary text-gray-900" : "bg-surface text-text-primary hover:bg-surface-hover"}`}>
              Todos
            </button>
            {ENTITY_TYPES.map((t) => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filterType === t ? "bg-primary text-gray-900" : "bg-surface text-text-primary hover:bg-surface-hover"}`}>
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : tags.length === 0 ? (
            <div className="text-center py-20 text-text-secondary"><TagIcon className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhuma tag encontrada</p></div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg border border-border group hover:border-border">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm text-text-primary font-medium">{tag.name}</span>
                  <span className="text-xs text-text-muted capitalize">{tag.entity_type}</span>
                  <button onClick={() => handleDelete(tag.id)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Nova Tag</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-text-primary mb-1">Nome</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-text-primary mb-1">Cor</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
                      <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div><label className="block text-sm text-text-primary mb-1">Tipo de Entidade</label>
                    <select value={formData.entity_type} onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                      className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                      {ENTITY_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-primary hover:text-text-primary">Cancelar</button>
                  <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Tag
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
