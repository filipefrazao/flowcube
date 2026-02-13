"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Plus, Search, Loader2, X } from "lucide-react";
import { miniApi, type MiniClass, type Location } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function TurmasPage() {
  const [classes, setClasses] = useState<MiniClass[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", location: "", capacity: 30, status: "active" as string,
    start_date: "", end_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [classData, locData] = await Promise.all([
        miniApi.listClasses({ search }),
        miniApi.listLocations(),
      ]);
      setClasses(classData.results || []);
      setLocations(locData.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", description: "", location: "", capacity: 30, status: "active", start_date: "", end_date: "" });
    setShowForm(true);
  }

  function openEdit(c: MiniClass) {
    setEditingId(c.id);
    setFormData({
      name: c.name, description: c.description, location: c.location,
      capacity: c.capacity, status: c.status,
      start_date: c.start_date || "", end_date: c.end_date || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload: Record<string, any> = { ...formData };
      // instructor is FK to User - not editable from this form, send null
      payload.instructor = null;
      if (!payload.start_date) payload.start_date = null;
      if (!payload.end_date) payload.end_date = null;
      if (editingId) {
        await miniApi.updateClass(editingId, payload);
      } else {
        await miniApi.createClass(payload);
      }
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta turma?")) return;
    try { await miniApi.deleteClass(id); loadData(); } catch (err) { console.error(err); }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500/20 text-green-400",
      completed: "bg-gray-500/20 text-gray-400",
      cancelled: "bg-red-500/20 text-red-400",
    };
    const labels: Record<string, string> = { active: "Ativa", completed: "Concluida", cancelled: "Cancelada" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.active}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Turmas</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Nova Turma
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar turmas..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadData()}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : classes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma turma encontrada</p>
              {locations.length === 0 && <p className="text-xs mt-2">Crie um Polo primeiro para poder criar turmas.</p>}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Polo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Inicio</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Fim</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Alunos</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-100 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.location_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.students_count || 0}/{c.capacity}</td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => openEdit(c)} className="text-indigo-400 hover:text-indigo-300 text-sm">Editar</button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 text-sm">Excluir</button>
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
                <h2 className="text-lg font-semibold text-gray-100">{editingId ? "Editar Turma" : "Nova Turma"}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nome *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Polo *</label>
                  <select value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500">
                    <option value="">Selecione um polo...</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name} - {l.city}/{l.state}</option>)}
                  </select>
                  {locations.length === 0 && <p className="text-xs text-yellow-400 mt-1">Nenhum polo cadastrado. Crie um polo primeiro.</p>}
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Descricao</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" rows={2} />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Capacidade</label>
                  <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Data Inicio</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Data Fim</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500">
                    <option value="active">Ativa</option>
                    <option value="completed">Concluida</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-300 hover:text-gray-100">Cancelar</button>
                  <button onClick={handleSave} disabled={saving || !formData.location} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Salvar" : "Criar Turma"}
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
