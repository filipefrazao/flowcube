"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Grid3x3, List, Package, Edit2, Trash2 } from "lucide-react";
import { productApi, categoryApi, type Product, type Category } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "0", cost: "0", sku: "", category: "", active: true });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([productApi.list(), categoryApi.list()]);
      setProducts(prodRes.data.results || prodRes.data);
      setCategories(catRes.data.results || catRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({ name: "", description: "", price: "0", cost: "0", sku: "", category: "", active: true });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      cost: product.cost,
      sku: product.sku,
      category: product.category || "",
      active: product.active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const data = { ...form, category: form.category || null };
      if (editingProduct) {
        await productApi.update(editingProduct.id, data);
      } else {
        await productApi.create(data);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    try {
      await productApi.delete(id);
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

  const filtered = products.filter((p) => {
    if (!searchQuery) return true;
    return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Produtos</h1>
          <p className="text-sm text-gray-400">{filtered.length} produtos</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Buscar produtos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
        </div>
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5">
          <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-md transition-colors", viewMode === "grid" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-100")}>
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("table")} className={cn("p-2 rounded-md transition-colors", viewMode === "table" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-100")}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <div key={product.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors group">
              <div className="w-full h-32 bg-gray-900 rounded-lg flex items-center justify-center mb-3 relative">
                <Package className="w-10 h-10 text-gray-700" />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(product)} className="p-1 bg-gray-800 rounded text-gray-400 hover:text-indigo-400"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(product.id)} className="p-1 bg-gray-800 rounded text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-100 mb-1 truncate">{product.name}</h3>
              {product.sku && <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-indigo-400">{formatValue(product.price)}</span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full", product.active ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-500")}>
                  {product.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">Nenhum produto encontrado</div>}
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium">Nome</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">SKU</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Categoria</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Preco</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Custo</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-gray-400 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-100 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-gray-300">{product.sku || "-"}</td>
                    <td className="px-4 py-3 text-gray-300">{product.category_name || "-"}</td>
                    <td className="px-4 py-3 text-indigo-400 font-medium">{formatValue(product.price)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatValue(product.cost)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", product.active ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-500")}>
                        {product.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(product)} className="p-1 text-gray-500 hover:text-indigo-400"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editingProduct ? "Editar Produto" : "Novo Produto"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" autoFocus />
              <textarea placeholder="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none" />
              <input type="text" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Preco</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Custo</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                <option value="">Sem categoria</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded border-gray-600 bg-gray-900 text-indigo-500" />
                Produto ativo
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancelar</button>
              <button onClick={handleSave} disabled={!form.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
