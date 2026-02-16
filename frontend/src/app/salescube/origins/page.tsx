"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Users,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { originApi, type Origin } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function OriginsPage() {
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState<Origin | null>(null);
  const [form, setForm] = useState({ name: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      const res = await originApi.list(params);
      setOrigins(res.data.results || res.data);
    } catch (err) {
      console.error("Erro ao carregar origens:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingOrigin(null);
    setForm({ name: "", is_active: true });
    setShowModal(true);
  };

  const openEditModal = (origin: Origin) => {
    setEditingOrigin(origin);
    setForm({ name: origin.name, is_active: origin.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingOrigin) {
        await originApi.update(editingOrigin.id, form);
      } else {
        await originApi.create(form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar origem:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta origem?")) return;
    try {
      await originApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir origem:", err);
    }
  };

  const activeCount = origins.filter((o) => o.is_active).length;
  const totalLeads = origins.reduce((sum, o) => sum + (o.leads_count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold text-gray-100">Origens</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Nova Origem
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Origens</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{origins.length}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/20 p-2.5 text-emerald-400">
              <Target className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Ativas</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{activeCount}</p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-2.5 text-green-400">
              <ToggleRight className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Leads</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{totalLeads}</p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-2.5 text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar origens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criada em</th>
                <th className="px-4 py-3 font-medium text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    Carregando origens...
                  </td>
                </tr>
              ) : origins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    Nenhuma origem encontrada.
                  </td>
                </tr>
              ) : (
                origins.map((origin) => (
                  <tr
                    key={origin.id}
                    className="border-b border-gray-800/50 transition hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-gray-100">{origin.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-300">
                        <Users className="h-3.5 w-3.5 text-gray-500" />
                        {origin.leads_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        origin.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                      )}>
                        {origin.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(origin.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(origin)}
                          className="rounded p-1.5 text-gray-500 transition hover:bg-emerald-500/10 hover:text-emerald-400"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(origin.id)}
                          className="rounded p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-100">
                {editingOrigin ? "Editar Origem" : "Nova Origem"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Facebook, Google, Indicacao..."
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Status</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition",
                    form.is_active
                      ? "border-green-700/50 bg-green-950/20 text-green-400"
                      : "border-gray-700 bg-gray-950 text-gray-400"
                  )}
                >
                  {form.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {form.is_active ? "Ativa" : "Inativa"}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-800 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingOrigin ? "Salvar" : "Criar Origem"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
