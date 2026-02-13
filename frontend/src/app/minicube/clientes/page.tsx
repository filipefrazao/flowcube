"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Search, Loader2, X } from "lucide-react";
import { miniApi, type Student, type MiniClass, type Location } from "@/lib/miniApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function ClientesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<MiniClass[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({
    name: "", email: "", phone: "", cpf: "", status: "active", student_class: "", location: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studData, classData, locData] = await Promise.all([
        miniApi.listStudents({ search }),
        miniApi.listClasses(),
        miniApi.listLocations(),
      ]);
      setStudents(studData.results || []);
      setClasses(classData.results || []);
      setLocations(locData.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingId(null);
    setFormData({ name: "", email: "", phone: "", cpf: "", status: "active", student_class: "", location: "" });
    setShowForm(true);
  }

  function openEdit(s: Student) {
    setEditingId(s.id);
    setFormData({
      name: s.name, email: s.email, phone: s.phone, cpf: s.cpf,
      status: s.status, student_class: s.student_class || "", location: s.location || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = { ...formData };
      // Send null for empty FK fields
      if (!payload.student_class) payload.student_class = null as any;
      if (!payload.location) payload.location = null as any;
      if (editingId) {
        await miniApi.updateStudent(editingId, payload);
      } else {
        await miniApi.createStudent(payload);
      }
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este aluno?")) return;
    try { await miniApi.deleteStudent(id); loadData(); } catch (err) { console.error(err); }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500/20 text-green-400",
      inactive: "bg-gray-500/20 text-gray-400",
      graduated: "bg-blue-500/20 text-blue-400",
    };
    const labels: Record<string, string> = { active: "Ativo", inactive: "Inativo", graduated: "Formado" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.active}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Alunos</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Aluno
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar por nome ou email..." value={search}
                onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadData()}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : students.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum aluno encontrado</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Telefone</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">CPF</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Turma</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Polo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-100 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{s.email || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{s.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{s.cpf || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{s.class_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{s.location_name || "-"}</td>
                      <td className="px-4 py-3">{statusBadge(s.status)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => openEdit(s)} className="text-indigo-400 hover:text-indigo-300 text-sm">Editar</button>
                        <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 text-sm">Excluir</button>
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
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">{editingId ? "Editar Aluno" : "Novo Aluno"}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Nome *</label>
                  <input type="text" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Email</label>
                    <input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Telefone</label>
                    <input type="text" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">CPF</label>
                  <input type="text" value={formData.cpf || ""} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Turma</label>
                  <select value={formData.student_class || ""} onChange={(e) => setFormData({ ...formData, student_class: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500">
                    <option value="">Nenhuma turma</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.location_name ? ` (${c.location_name})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Polo</label>
                  <select value={formData.location || ""} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500">
                    <option value="">Nenhum polo</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name} - {l.city}/{l.state}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Status</label>
                  <select value={formData.status || "active"} onChange={(e) => setFormData({ ...formData, status: e.target.value as Student["status"] })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500">
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="graduated">Formado</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-300 hover:text-gray-100">Cancelar</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editingId ? "Salvar" : "Criar Aluno"}
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
