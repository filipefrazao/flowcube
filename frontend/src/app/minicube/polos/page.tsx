"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Loader2, X, Pencil } from "lucide-react";
import { miniApi, type Location } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function PolosPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Location>>({
    name: "", address: "", city: "", state: "", active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadLocations(); }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      const data = await miniApi.listLocations();
      setLocations(data.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", address: "", city: "", state: "", active: true });
    setShowForm(true);
  }

  function openEdit(loc: Location) {
    setEditingId(loc.id);
    setFormData({ name: loc.name, address: loc.address, city: loc.city, state: loc.state, zip_code: loc.zip_code, phone: loc.phone, active: loc.active });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = { ...formData };
      // manager is optional FK - send null to omit
      if (editingId) {
        await miniApi.updateLocation(editingId, payload);
      } else {
        await miniApi.createLocation(payload);
      }
      setShowForm(false);
      setEditingId(null);
      loadLocations();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este polo?")) return;
    try { await miniApi.deleteLocation(id); loadLocations(); } catch (err) { console.error(err); }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Polos</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Polo
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : locations.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum polo encontrado</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Endereco</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Cidade</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Telefone</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Ativo</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((l) => (
                    <tr key={l.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-100 font-medium">{l.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{l.address}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{l.city}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{l.state}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{l.phone || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                          {l.active ? "Sim" : "Nao"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => openEdit(l)} className="text-indigo-400 hover:text-indigo-300 text-sm">Editar</button>
                        <button onClick={() => handleDelete(l.id)} className="text-red-400 hover:text-red-300 text-sm">Excluir</button>
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
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">{editingId ? "Editar Polo" : "Novo Polo"}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nome *</label>
                  <input type="text" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Endereco</label>
                  <input type="text" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Cidade</label>
                    <input type="text" value={formData.city || ""} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Estado</label>
                    <input type="text" value={formData.state || ""} onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">CEP</label>
                    <input type="text" value={formData.zip_code || ""} onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Telefone</label>
                    <input type="text" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="active" checked={formData.active !== false}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="accent-indigo-500" />
                  <label htmlFor="active" className="text-sm text-gray-300">Ativo</label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-300 hover:text-gray-100">Cancelar</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Salvar" : "Criar Polo"}
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
