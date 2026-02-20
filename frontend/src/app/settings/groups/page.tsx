"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Loader2, X, Trash2 } from "lucide-react";
import { settingsExtApi, type UserGroup } from "@/lib/settingsExtApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function GroupsPage() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<UserGroup>>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    try {
      setLoading(true);
      const data = await settingsExtApi.listGroups();
      setGroups(data.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    try {
      setSaving(true);
      await settingsExtApi.createGroup(formData);
      setShowForm(false);
      setFormData({ name: "", description: "" });
      loadGroups();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza que deseja excluir este grupo?")) return;
    try { await settingsExtApi.deleteGroup(id); loadGroups(); } catch (err) { console.error(err); }
  }

  return (
    <div className="flex h-screen bg-background-secondary">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background-secondary flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Grupos de Usuarios</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Grupo
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : groups.length === 0 ? (
            <div className="text-center py-20 text-text-secondary">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum grupo encontrado</p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Descricao</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary uppercase">Membros</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id} className="border-b border-border/50 hover:bg-surface-hover/30">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">{g.name}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{g.description || "-"}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{g.members_count || 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(g.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Novo Grupo</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-primary mb-1">Nome</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm text-text-primary mb-1">Descricao</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" rows={3} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-primary hover:text-text-primary">Cancelar</button>
                  <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Grupo
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
