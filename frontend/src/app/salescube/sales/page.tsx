"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Edit2, DollarSign } from "lucide-react";
import { saleApi, leadApi, productApi, type Sale, type Lead, type Product, type SaleLineItem } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  negotiation: { label: "Negociacao", color: "bg-blue-500/20 text-blue-400" },
  proposal: { label: "Proposta", color: "bg-purple-500/20 text-purple-400" },
  won: { label: "Ganha", color: "bg-green-500/20 text-green-400" },
  lost: { label: "Perdida", color: "bg-red-500/20 text-red-400" },
};

function formatValue(v: string | number) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Form state
  const [form, setForm] = useState({ lead: "", total_value: "0", stage: "negotiation", notes: "" });
  const [lineItems, setLineItems] = useState<Array<{ product: string; quantity: number; unit_price: string }>>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, leadsRes, productsRes] = await Promise.all([
        saleApi.list(),
        leadApi.list(),
        productApi.list(),
      ]);
      setSales(salesRes.data.results || salesRes.data);
      setLeads(leadsRes.data.results || leadsRes.data);
      setProducts(productsRes.data.results || productsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSale(null);
    setForm({ lead: "", total_value: "0", stage: "negotiation", notes: "" });
    setLineItems([]);
    setShowModal(true);
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setForm({
      lead: sale.lead || "",
      total_value: sale.total_value,
      stage: sale.stage,
      notes: sale.notes,
    });
    setLineItems(
      (sale.line_items || []).map((li) => ({
        product: li.product || "",
        quantity: li.quantity,
        unit_price: li.unit_price,
      }))
    );
    setShowModal(true);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { product: "", quantity: 1, unit_price: "0" }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
    // Recalculate total
    const total = updated.reduce((sum, li) => sum + parseFloat(li.unit_price || "0") * li.quantity, 0);
    setForm((f) => ({ ...f, total_value: total.toFixed(2) }));
  };

  const handleSave = async () => {
    try {
      if (editingSale) {
        await saleApi.update(editingSale.id, form);
      } else {
        const res = await saleApi.create(form);
        const saleId = res.data.id;
        // Create line items
        for (const li of lineItems) {
          if (li.product) {
            await saleApi.addLineItem(saleId, {
              product: li.product,
              quantity: li.quantity,
              unit_price: li.unit_price,
            });
          }
        }
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
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
          <p className="text-sm text-gray-400">
            {filtered.length} vendas | Total: {formatValue(totalValue)} | Ganhas: {formatValue(wonValue)}
          </p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Nova Venda
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Buscar vendas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
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
                  <th className="px-4 py-3 text-gray-400 font-medium">Itens</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Notas</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Criado</th>
                  <th className="px-4 py-3 text-gray-400 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => {
                  const stageConfig = STAGE_CONFIG[sale.stage] || STAGE_CONFIG.negotiation;
                  return (
                    <tr key={sale.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-100 font-medium">{sale.lead_name || "-"}</td>
                      <td className="px-4 py-3 text-indigo-400 font-semibold">{formatValue(sale.total_value)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", stageConfig.color)}>{stageConfig.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{sale.line_items?.length || 0} itens</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{sale.notes || "-"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(sale.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEditModal(sale)} className="p-1 text-gray-500 hover:text-indigo-400"><Edit2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Nenhuma venda encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editingSale ? "Editar Venda" : "Nova Venda"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {/* Lead select */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Lead</label>
                <select value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                  <option value="">Sem lead</option>
                  {leads.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </select>
              </div>

              {/* Stage */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estagio</label>
                <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                  {Object.entries(STAGE_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                </select>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Itens da Venda</label>
                  <button onClick={addLineItem} className="text-xs text-indigo-400 hover:text-indigo-300">+ Adicionar item</button>
                </div>
                {lineItems.map((li, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <select value={li.product} onChange={(e) => {
                      updateLineItem(i, "product", e.target.value);
                      const p = products.find((p) => p.id === e.target.value);
                      if (p) updateLineItem(i, "unit_price", p.price);
                    }} className="flex-1 bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-2 py-1.5 text-xs">
                      <option value="">Produto</option>
                      {products.map((p) => (<option key={p.id} value={p.id}>{p.name} - {formatValue(p.price)}</option>))}
                    </select>
                    <input type="number" min={1} value={li.quantity} onChange={(e) => updateLineItem(i, "quantity", parseInt(e.target.value) || 1)} className="w-16 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-100 text-center" />
                    <input type="number" value={li.unit_price} onChange={(e) => updateLineItem(i, "unit_price", e.target.value)} className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-100" placeholder="Preco" />
                    <span className="text-xs text-gray-400 w-20 text-right">{formatValue((parseFloat(li.unit_price || "0") * li.quantity).toString())}</span>
                    <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3">
                <span className="text-sm text-gray-400">Total</span>
                <span className="text-lg font-bold text-indigo-400">{formatValue(form.total_value)}</span>
              </div>

              {/* Notes */}
              <textarea placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
