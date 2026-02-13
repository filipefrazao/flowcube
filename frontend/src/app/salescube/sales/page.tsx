"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, DollarSign } from "lucide-react";
import { saleApi, type Sale } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400" },
  negotiating: { label: "Negociando", color: "bg-blue-500/20 text-blue-400" },
  won: { label: "Ganha", color: "bg-green-500/20 text-green-400" },
  lost: { label: "Perdida", color: "bg-red-500/20 text-red-400" },
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSale, setNewSale] = useState({ total_value: "0", stage: "pending", notes: "" });

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await saleApi.list();
      setSales(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSale = async () => {
    try {
      await saleApi.create(newSale);
      setShowAddModal(false);
      setNewSale({ total_value: "0", stage: "pending", notes: "" });
      fetchSales();
    } catch (err) {
      console.error(err);
    }
  };

  const formatValue = (v: string) => {
    const num = parseFloat(v);
    if (isNaN(num)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  const filtered = sales.filter((s) => {
    const matchSearch = !searchQuery || s.lead_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = !filterStage || s.stage === filterStage;
    return matchSearch && matchStage;
  });

  const totalValue = filtered.reduce((sum, s) => sum + parseFloat(s.total_value || "0"), 0);
  const wonValue = filtered.filter((s) => s.stage === "won").reduce((sum, s) => sum + parseFloat(s.total_value || "0"), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendas</h1>
          <p className="text-sm text-gray-400">{filtered.length} vendas | Total: {formatValue(totalValue.toString())} | Ganhas: {formatValue(wonValue.toString())}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Venda
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar vendas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500"
          />
        </div>
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os estagios</option>
          {Object.entries(STAGE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
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
                  <th className="px-4 py-3 text-gray-400 font-medium">Lead</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Valor</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Estagio</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Notas</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Fechamento</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Criado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => {
                  const stageConfig = STAGE_CONFIG[sale.stage] || STAGE_CONFIG.pending;
                  return (
                    <tr key={sale.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-100 font-medium">{sale.lead_name || "-"}</td>
                      <td className="px-4 py-3 text-indigo-400 font-semibold">{formatValue(sale.total_value)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", stageConfig.color)}>
                          {stageConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{sale.notes || "-"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {sale.closed_at ? new Date(sale.closed_at).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(sale.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">Nenhuma venda encontrada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Nova Venda</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input type="number" placeholder="Valor total (R$)" value={newSale.total_value} onChange={(e) => setNewSale({ ...newSale, total_value: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <select value={newSale.stage} onChange={(e) => setNewSale({ ...newSale, stage: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                {Object.entries(STAGE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <textarea placeholder="Notas" value={newSale.notes} onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })} rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancelar</button>
              <button onClick={handleAddSale} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
