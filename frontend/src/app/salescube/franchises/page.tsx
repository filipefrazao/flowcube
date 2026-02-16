"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
} from "lucide-react";
import { franchiseApi, poleApi, type Franchise, type Pole } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [poles, setPoles] = useState<Pole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Franchise modal
  const [showModal, setShowModal] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [form, setForm] = useState({ name: "", code: "", is_active: true });
  const [saving, setSaving] = useState(false);

  // Pole modal
  const [showPoleModal, setShowPoleModal] = useState(false);
  const [poleForm, setPoleForm] = useState({ name: "", franchise: "", is_active: true });
  const [savingPole, setSavingPole] = useState(false);

  // Expanded franchise (show poles)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;

      const [franchisesRes, polesRes] = await Promise.all([
        franchiseApi.list(params),
        poleApi.list({ limit: "500" }),
      ]);

      setFranchises(franchisesRes.data.results || franchisesRes.data);
      setPoles(polesRes.data.results || polesRes.data);
    } catch (err) {
      console.error("Erro ao carregar franquias:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingFranchise(null);
    setForm({ name: "", code: "", is_active: true });
    setShowModal(true);
  };

  const openEditModal = (franchise: Franchise) => {
    setEditingFranchise(franchise);
    setForm({ name: franchise.name, code: franchise.code, is_active: franchise.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingFranchise) {
        await franchiseApi.update(editingFranchise.id, form);
      } else {
        await franchiseApi.create(form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar franquia:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta franquia?")) return;
    try {
      await franchiseApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir franquia:", err);
    }
  };

  const openPoleModal = (franchiseId: string) => {
    setPoleForm({ name: "", franchise: franchiseId, is_active: true });
    setShowPoleModal(true);
  };

  const handleSavePole = async () => {
    if (!poleForm.name.trim()) return;
    setSavingPole(true);
    try {
      await poleApi.create(poleForm);
      setShowPoleModal(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar polo:", err);
    } finally {
      setSavingPole(false);
    }
  };

  const handleDeletePole = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este polo?")) return;
    try {
      await poleApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir polo:", err);
    }
  };

  const activeCount = franchises.filter((f) => f.is_active).length;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-orange-400" />
          <h1 className="text-2xl font-bold text-gray-100">Franquias & Polos</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Nova Franquia
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Franquias</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{franchises.length}</p>
            </div>
            <div className="rounded-lg bg-orange-500/20 p-2.5 text-orange-400">
              <Building2 className="h-5 w-5" />
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
              <p className="text-sm text-gray-400">Polos</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{poles.length}</p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-2.5 text-blue-400">
              <MapPin className="h-5 w-5" />
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
            placeholder="Buscar franquias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-orange-600"
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
                <th className="px-4 py-3 font-medium">Codigo</th>
                <th className="px-4 py-3 font-medium">Polos</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criada em</th>
                <th className="px-4 py-3 font-medium text-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Carregando franquias...
                  </td>
                </tr>
              ) : franchises.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Nenhuma franquia encontrada.
                  </td>
                </tr>
              ) : (
                franchises.map((franchise) => {
                  const franchisePoles = poles.filter((p) => p.franchise === franchise.id);
                  const isExpanded = expandedId === franchise.id;
                  return (
                    <tr key={franchise.id} className="border-b border-gray-800/50">
                      <td colSpan={6} className="p-0">
                        <div
                          className="flex cursor-pointer items-center transition hover:bg-gray-800/40"
                          onClick={() => setExpandedId(isExpanded ? null : franchise.id)}
                        >
                          <td className="px-4 py-3 font-medium text-gray-100">{franchise.name}</td>
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{franchise.code || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-gray-300">
                              <MapPin className="h-3.5 w-3.5 text-gray-500" />
                              {franchisePoles.length}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              franchise.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                            )}>
                              {franchise.is_active ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(franchise.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openPoleModal(franchise.id)}
                                className="rounded p-1.5 text-gray-500 transition hover:bg-blue-500/10 hover:text-blue-400"
                                title="Adicionar Polo"
                              >
                                <MapPin className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(franchise)}
                                className="rounded p-1.5 text-gray-500 transition hover:bg-orange-500/10 hover:text-orange-400"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(franchise.id)}
                                className="rounded p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </div>
                        {/* Expanded Poles */}
                        {isExpanded && franchisePoles.length > 0 && (
                          <div className="border-t border-gray-800/30 bg-gray-950/50 px-8 py-3">
                            <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Polos</p>
                            <div className="space-y-1">
                              {franchisePoles.map((pole) => (
                                <div key={pole.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-800/30">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                                    <span className="text-sm text-gray-300">{pole.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full",
                                      pole.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                                    )}>
                                      {pole.is_active ? "Ativo" : "Inativo"}
                                    </span>
                                    <button
                                      onClick={() => handleDeletePole(pole.id)}
                                      className="rounded p-1 text-gray-600 transition hover:text-red-400"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Franchise Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-100">
                {editingFranchise ? "Editar Franquia" : "Nova Franquia"}
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
                  placeholder="Nome da franquia"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-orange-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Codigo</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Ex: FRZ-SP, FEB-RJ..."
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-orange-600"
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
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingFranchise ? "Salvar" : "Criar Franquia"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pole Modal */}
      {showPoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-100">Novo Polo</h2>
              <button onClick={() => setShowPoleModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Nome *</label>
                <input
                  type="text"
                  value={poleForm.name}
                  onChange={(e) => setPoleForm({ ...poleForm, name: e.target.value })}
                  placeholder="Nome do polo"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-800 px-6 py-4">
              <button onClick={() => setShowPoleModal(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800">
                Cancelar
              </button>
              <button
                onClick={handleSavePole}
                disabled={savingPole || !poleForm.name.trim()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {savingPole ? "Salvando..." : "Criar Polo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
