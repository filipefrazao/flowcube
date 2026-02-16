"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  Building2,
  Shield,
} from "lucide-react";
import { squadApi, franchiseApi, type Squad, type Franchise } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function SquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [form, setForm] = useState({ name: "", franchise: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;

      const [squadsRes, franchisesRes] = await Promise.all([
        squadApi.list(params),
        franchiseApi.list({ limit: "200" }),
      ]);

      setSquads(squadsRes.data.results || squadsRes.data);
      setFranchises(franchisesRes.data.results || franchisesRes.data);
    } catch (err) {
      console.error("Erro ao carregar squads:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingSquad(null);
    setForm({ name: "", franchise: "", is_active: true });
    setShowModal(true);
  };

  const openEditModal = (squad: Squad) => {
    setEditingSquad(squad);
    setForm({
      name: squad.name,
      franchise: squad.franchise || "",
      is_active: squad.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name,
        franchise: form.franchise || null,
        is_active: form.is_active,
      };
      if (editingSquad) {
        await squadApi.update(editingSquad.id, data);
      } else {
        await squadApi.create(data);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar squad:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este squad?")) return;
    try {
      await squadApi.delete(id);
      fetchData();
    } catch (err) {
      console.error("Erro ao excluir squad:", err);
    }
  };

  const activeCount = squads.filter((s) => s.is_active).length;
  const totalMembers = squads.reduce((sum, s) => sum + (s.members_count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-cyan-400" />
          <h1 className="text-2xl font-bold text-gray-100">Squads</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          <Plus className="h-4 w-4" />
          Novo Squad
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Squads</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{squads.length}</p>
            </div>
            <div className="rounded-lg bg-cyan-500/20 p-2.5 text-cyan-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Ativos</p>
              <p className="mt-1 text-2xl font-bold text-green-400">{activeCount}</p>
            </div>
            <div className="rounded-lg bg-green-500/20 p-2.5 text-green-400">
              <Shield className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total de Membros</p>
              <p className="mt-1 text-2xl font-bold text-gray-100">{totalMembers}</p>
            </div>
            <div className="rounded-lg bg-blue-500/20 p-2.5 text-blue-400">
              <UserPlus className="h-5 w-5" />
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
            placeholder="Buscar squads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-cyan-600"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : squads.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-gray-700" />
          <p className="text-gray-500">Nenhum squad encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {squads.map((squad) => (
            <div key={squad.id} className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-700">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">{squad.name}</h3>
                  {squad.franchise_name && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Building2 className="h-3 w-3" />
                      {squad.franchise_name}
                    </p>
                  )}
                </div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  squad.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                )}>
                  {squad.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div className="mb-4 flex gap-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span>{squad.owners_count ?? 0} owners</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{squad.members_count ?? 0} membros</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-800 pt-3">
                <span className="text-xs text-gray-600">{fmtDate(squad.created_at)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(squad)}
                    className="rounded p-1.5 text-gray-500 transition hover:bg-cyan-500/10 hover:text-cyan-400"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(squad.id)}
                    className="rounded p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-100">
                {editingSquad ? "Editar Squad" : "Novo Squad"}
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
                  placeholder="Nome do squad"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-cyan-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Franquia</label>
                <select
                  value={form.franchise}
                  onChange={(e) => setForm({ ...form, franchise: e.target.value })}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-cyan-600"
                >
                  <option value="">Nenhuma</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
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
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingSquad ? "Salvar" : "Criar Squad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
