"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, X, ChevronLeft, ChevronRight, Download, Trash2, ArrowRight } from "lucide-react";
import { leadApi, stageApi, type Lead, type PipelineStage } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import LeadModal from "@/components/salescube/LeadModal";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterSource, setFilterSource] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [bulkMoveStage, setBulkMoveStage] = useState("");

  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", company: "", source: "manual", value: "0", stage: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      };
      if (searchQuery) params.search = searchQuery;
      if (filterStage) params.stage = filterStage;
      if (filterSource) params.source = filterSource;

      const [leadsRes, stagesRes] = await Promise.all([
        leadApi.list(params),
        stageApi.list(),
      ]);
      const leadsData = leadsRes.data;
      setLeads(leadsData.results || leadsData);
      setTotalCount(leadsData.count || (leadsData.results || leadsData).length);
      setStages(stagesRes.data.results || stagesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterStage, filterSource]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddLead = async () => {
    try {
      await leadApi.create(newLead);
      setShowAddModal(false);
      setNewLead({ name: "", email: "", phone: "", company: "", source: "manual", value: "0", stage: "" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkMove = async () => {
    if (!bulkMoveStage || selectedIds.size === 0) return;
    try {
      await leadApi.bulkMove(Array.from(selectedIds), bulkMoveStage);
      setSelectedIds(new Set());
      setShowBulkMoveModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.size} leads selecionados?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => leadApi.delete(id)));
      setSelectedIds(new Set());
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Nome", "Email", "Telefone", "Empresa", "Estagio", "Score", "Fonte", "Valor", "Criado"];
    const rows = leads.map((l) => [
      l.name, l.email, l.phone, l.company, l.stage_name || "", l.score, l.source, l.value, l.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(leads.map((l) => l.id)));
  };

  const formatValue = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const sources = ["manual", "website", "whatsapp", "facebook", "instagram", "referral", "event", "other"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm text-gray-400">{totalCount} leads encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-gray-100 text-sm transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-4 py-2">
          <span className="text-sm text-indigo-300">{selectedIds.size} selecionados</span>
          <button onClick={() => setShowBulkMoveModal(true)} className="flex items-center gap-1 px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <ArrowRight className="w-3 h-3" /> Mover
          </button>
          <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1 text-xs text-red-400 hover:text-red-300">
            <Trash2 className="w-3 h-3" /> Excluir
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-gray-400 hover:text-gray-200">Limpar</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500"
          />
        </div>
        <select value={filterStage} onChange={(e) => { setFilterStage(e.target.value); setPage(1); }} className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os estagios</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setPage(1); }} className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
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
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0} onChange={toggleSelectAll} className="rounded border-gray-600 bg-gray-900 text-indigo-500" />
                  </th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Nome</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Email</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Telefone</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Empresa</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Estagio</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Score</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Valor</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Criado</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer",
                      selectedIds.has(lead.id) && "bg-indigo-500/5"
                    )}
                    onClick={() => { setSelectedLeadId(lead.id); setShowLeadModal(true); }}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded border-gray-600 bg-gray-900 text-indigo-500" />
                    </td>
                    <td className="px-4 py-3 text-gray-100 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.email}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.phone}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.company}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${lead.stage_color || "#6366f1"}20`, color: lead.stage_color || "#818cf8" }}>
                        {lead.stage_name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        lead.score >= 80 ? "bg-green-500/20 text-green-400" :
                        lead.score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-700 text-gray-400"
                      )}>{lead.score}</span>
                    </td>
                    <td className="px-4 py-3 text-indigo-400 font-medium">{formatValue(lead.value)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Nenhum lead encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
              <span className="text-xs text-gray-500">Pagina {page} de {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 text-gray-400 hover:text-gray-100 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 text-gray-400 hover:text-gray-100 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Novo Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <input type="email" placeholder="Email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
                <input type="tel" placeholder="Telefone" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              </div>
              <input type="text" placeholder="Empresa" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <div className="grid grid-cols-2 gap-3">
                <select value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} className="bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                  {sources.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                <input type="number" placeholder="Valor (R$)" value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: e.target.value })} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              </div>
              <select value={newLead.stage} onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                <option value="">Selecione o estagio</option>
                {stages.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancelar</button>
              <button onClick={handleAddLead} disabled={!newLead.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move Modal */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowBulkMoveModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Mover {selectedIds.size} leads</h2>
            <select value={bulkMoveStage} onChange={(e) => setBulkMoveStage(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm mb-4">
              <option value="">Selecione o estagio</option>
              {stages.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkMoveModal(false)} className="px-4 py-2 text-sm text-gray-400">Cancelar</button>
              <button onClick={handleBulkMove} disabled={!bulkMoveStage} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">Mover</button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showLeadModal && selectedLeadId && (
        <LeadModal
          leadId={selectedLeadId}
          stages={stages}
          onClose={() => { setShowLeadModal(false); setSelectedLeadId(null); }}
          onUpdated={() => { setShowLeadModal(false); setSelectedLeadId(null); fetchData(); }}
        />
      )}
    </div>
  );
}
