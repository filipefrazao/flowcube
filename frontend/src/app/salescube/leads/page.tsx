"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { leadApi, stageApi, type Lead, type PipelineStage } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", source: "", value: "0", stage: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, stagesRes] = await Promise.all([
        leadApi.list(),
        stageApi.list(),
      ]);
      setLeads(leadsRes.data.results || leadsRes.data);
      setStages(stagesRes.data.results || stagesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async () => {
    try {
      await leadApi.create(newLead);
      setShowAddModal(false);
      setNewLead({ name: "", email: "", phone: "", company: "", source: "", value: "0", stage: "" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatValue = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  const filtered = leads.filter((l) => {
    const matchSearch = !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.email.toLowerCase().includes(searchQuery.toLowerCase()) || l.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = !filterStage || l.stage === filterStage;
    const matchSource = !filterSource || l.source === filterSource;
    return matchSearch && matchStage && matchSource;
  });

  const sources = [...new Set(leads.map((l) => l.source).filter(Boolean))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm text-gray-400">{filtered.length} leads encontrados</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500"
          />
        </div>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos os estagios</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todas as fontes</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium">Nome</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Email</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Telefone</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Empresa</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Estagio</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Score</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Fonte</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Valor</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Criado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-100 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.email}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.phone}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.company}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                        {lead.stage_name || lead.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        lead.score >= 80 ? "bg-green-500/20 text-green-400" :
                        lead.score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-700 text-gray-400"
                      )}>
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{lead.source}</td>
                    <td className="px-4 py-3 text-indigo-400 font-medium">{formatValue(lead.value)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      Nenhum lead encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Novo Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <input type="email" placeholder="Email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <input type="tel" placeholder="Telefone" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <input type="text" placeholder="Empresa" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <input type="text" placeholder="Fonte" value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <input type="number" placeholder="Valor (R$)" value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <select value={newLead.stage} onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione o estagio</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancelar</button>
              <button onClick={handleAddLead} disabled={!newLead.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
