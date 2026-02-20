"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, X, Grid3x3, List, Package, Edit2, Trash2,
  Filter, RotateCcw, ChevronLeft, ChevronRight, Tag,
  DollarSign, CheckCircle2, XCircle, Eye, Copy
} from "lucide-react";
import { productApi, categoryApi, type Product, type Category } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

function formatBRL(v: string | number) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR");
}

const PAGE_SIZE = 20;

export default function ProductsPage() {
  /* ── Data ───────────────────────────────────────────────────────── */
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Filters ────────────────────────────────────────────────────── */
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  /* ── View ───────────────────────────────────────────────────────── */
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  /* ── Modal ──────────────────────────────────────────────────────── */
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "0", cost: "0", sku: "", category: "", active: true });
  const [saving, setSaving] = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        page: String(currentPage),
      };
      if (filterSearch) params.search = filterSearch;
      if (filterStatus === "active") params.active = "true";
      if (filterStatus === "inactive") params.active = "false";

      const res = await productApi.list(params);
      const data = res.data;
      setProducts(data.results || data);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterSearch, filterStatus]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryApi.list({ limit: "200" });
      setCategories(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* ── Secondary filters (client-side) ────────────────────────────── */
  const filtered = products.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterPriceMin && parseFloat(p.price) < parseFloat(filterPriceMin)) return false;
    if (filterPriceMax && parseFloat(p.price) > parseFloat(filterPriceMax)) return false;
    if (filterDateFrom && new Date(p.created_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(p.created_at) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  /* ── Stats ──────────────────────────────────────────────────────── */
  const activeCount = products.filter((p) => p.active).length;
  const inactiveCount = products.filter((p) => !p.active).length;
  const avgPrice = products.length > 0
    ? products.reduce((sum, p) => sum + parseFloat(p.price || "0"), 0) / products.length
    : 0;

  /* ── Handlers ───────────────────────────────────────────────────── */
  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({ name: "", description: "", price: "0", cost: "0", sku: "", category: "", active: true, image_url: "" });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      cost: product.cost,
      sku: product.sku || "",
      category: product.category || "",
      active: product.active,
      image_url: product.image_url || "",
    });
    setShowModal(true);
  };

  const openDetailModal = (product: Product) => {
    setViewingProduct(product);
    setShowDetailModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, category: form.category || null };
      if (editingProduct) {
        await productApi.update(editingProduct.id, data);
      } else {
        await productApi.create(data);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await productApi.delete(id);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      await productApi.create({
        name: `${product.name} (Copia)`,
        description: product.description,
        price: product.price,
        cost: product.cost,
        sku: "",
        category: product.category,
        active: product.active,
      });
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const clearFilters = () => {
    setFilterSearch(""); setFilterCategory(""); setFilterStatus("");
    setFilterPriceMin(""); setFilterPriceMax(""); setFilterDateFrom(""); setFilterDateTo("");
    setCurrentPage(1);
  };

  const hasActiveFilters = filterSearch || filterCategory || filterStatus || filterPriceMin || filterPriceMax || filterDateFrom || filterDateTo;

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            Produtos
          </h1>
          <p className="text-sm text-text-secondary mt-1">{totalCount} produtos cadastrados</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: String(totalCount), color: "text-text-primary", bg: "bg-gray-500/10", icon: Package },
          { label: "Ativos", value: String(activeCount), color: "text-primary", bg: "bg-primary/10", icon: CheckCircle2 },
          { label: "Inativos", value: String(inactiveCount), color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
          { label: "Preco Medio", value: formatBRL(avgPrice), color: "text-purple-400", bg: "bg-purple-500/10", icon: DollarSign },
        ].map((s, i) => (
          <div key={i} className="bg-surface/80 border border-border/50 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wide">{s.label}</span>
              <div className={cn("p-1.5 rounded-lg", s.bg)}><s.icon className={cn("w-3.5 h-3.5", s.color)} /></div>
            </div>
            <span className={cn("text-lg font-bold", s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="bg-surface/80 border border-border/50 rounded-xl p-4 backdrop-blur-sm space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Buscar por nome, SKU, descricao..." value={filterSearch}
              onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-background-secondary/80 border border-border rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-background-secondary/80 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:border-primary transition-all">
            <option value="">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
          {categories.length > 0 && (
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-background-secondary/80 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:border-primary transition-all">
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          )}

          <div className="flex bg-background-secondary/80 border border-border rounded-lg p-0.5">
            <button onClick={() => setViewMode("table")} className={cn("p-2 rounded-md transition-all", viewMode === "table" ? "bg-primary text-gray-900" : "text-text-secondary hover:text-text-primary")}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-md transition-all", viewMode === "grid" ? "bg-primary text-gray-900" : "text-text-secondary hover:text-text-primary")}>
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
              showFilters ? "bg-primary/20 border-primary/50 text-primary" : "bg-background-secondary/80 border-border text-text-secondary hover:text-text-primary")}>
            <Filter className="w-4 h-4" /> Filtros {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
          </button>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/50">
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Preco Minimo (R$)</label>
              <input type="number" placeholder="0,00" value={filterPriceMin} onChange={(e) => setFilterPriceMin(e.target.value)}
                className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Preco Maximo (R$)</label>
              <input type="number" placeholder="0,00" value={filterPriceMax} onChange={(e) => setFilterPriceMax(e.target.value)}
                className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Criado De</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block font-medium uppercase tracking-wide">Criado Ate</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full bg-background-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ─────────────────────────────────────────── */
        <div className="bg-surface/80 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left bg-background-secondary/50">
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Descricao</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Preco (R$)</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Custo (R$)</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Categoria</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Data</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide w-28">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-border/30 hover:bg-surface-hover/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                            {product.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-text-primary font-medium truncate max-w-[200px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary max-w-[180px] truncate text-xs">{product.description || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="text-primary font-semibold">{formatBRL(product.price)}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{formatBRL(product.cost)}</td>
                    <td className="px-4 py-3">
                      {product.category_name ? (
                        <span className="text-xs bg-surface-hover/50 text-text-primary px-2 py-0.5 rounded">{product.category_name}</span>
                      ) : (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs font-mono">{product.sku || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border",
                        product.active
                          ? "bg-emerald-500/15 text-primary border-primary/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      )}>
                        {product.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{formatDate(product.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetailModal(product)} className="p-1.5 text-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all" title="Detalhes">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(product)} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDuplicate(product)} className="p-1.5 text-text-muted hover:text-amber-400 hover:bg-amber-500/10 rounded transition-all" title="Duplicar">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <Package className="w-10 h-10 text-text-secondary mx-auto mb-3" />
                      <p className="text-text-muted">Nenhum produto encontrado</p>
                      <p className="text-text-muted text-xs mt-1">Tente ajustar os filtros ou crie um novo produto</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <span className="text-xs text-text-muted">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} de {totalCount}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                  className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-surface-hover/50 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pn: number;
                  if (totalPages <= 5) pn = i + 1;
                  else if (currentPage <= 3) pn = i + 1;
                  else if (currentPage >= totalPages - 2) pn = totalPages - 4 + i;
                  else pn = currentPage - 2 + i;
                  return (
                    <button key={pn} onClick={() => setCurrentPage(pn)}
                      className={cn("w-8 h-8 rounded text-xs font-medium transition-all", currentPage === pn ? "bg-primary text-gray-900" : "text-text-secondary hover:text-text-primary hover:bg-surface-hover/50")}>
                      {pn}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                  className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-surface-hover/50 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── GRID VIEW ──────────────────────────────────────────── */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <div key={product.id} className="bg-surface/80 border border-border/50 rounded-xl p-4 hover:border-border transition-all group backdrop-blur-sm">
                <div className="w-full h-28 bg-background-secondary/60 rounded-lg flex items-center justify-center mb-3 relative overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-text-secondary">{product.name.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(product)} className="p-1.5 bg-surface rounded-lg text-text-secondary hover:text-primary transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDuplicate(product)} className="p-1.5 bg-surface rounded-lg text-text-secondary hover:text-amber-400 transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-1.5 bg-surface rounded-lg text-text-secondary hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border",
                      product.active
                        ? "bg-emerald-500/15 text-primary border-primary/30"
                        : "bg-red-500/15 text-red-400 border-red-500/30"
                    )}>
                      {product.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-text-primary mb-1 truncate">{product.name}</h3>
                {product.description && <p className="text-xs text-text-muted mb-2 line-clamp-2">{product.description}</p>}
                {product.category_name && (
                  <div className="flex items-center gap-1 mb-2">
                    <Tag className="w-3 h-3 text-text-muted" />
                    <span className="text-[10px] text-text-secondary">{product.category_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                  <span className="text-sm font-bold text-primary">{formatBRL(product.price)}</span>
                  {product.sku && <span className="text-[10px] text-text-muted font-mono">{product.sku}</span>}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 bg-surface/80 border border-border/50 rounded-xl backdrop-blur-sm">
                <Package className="w-10 h-10 text-text-secondary mx-auto mb-3" />
                <p className="text-text-muted">Nenhum produto encontrado</p>
              </div>
            )}
          </div>

          {/* Grid pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 rounded-lg hover:bg-surface-hover/50 transition-all">
                Anterior
              </button>
              <span className="text-sm text-text-muted">Pagina {currentPage} de {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 rounded-lg hover:bg-surface-hover/50 transition-all">
                Proxima
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────── */}
      {showDetailModal && viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Detalhes do Produto
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface-hover/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: "Nome", value: viewingProduct.name },
                { label: "Descricao", value: viewingProduct.description || "-" },
                { label: "Preco", value: formatBRL(viewingProduct.price), highlight: true },
                { label: "Custo", value: formatBRL(viewingProduct.cost) },
                { label: "SKU", value: viewingProduct.sku || "-" },
                { label: "Categoria", value: viewingProduct.category_name || "-" },
                { label: "Status", value: viewingProduct.active ? "Ativo" : "Inativo" },
                { label: "Criado em", value: formatDate(viewingProduct.created_at) },
              ].map((item, i) => (
                <div key={i} className="bg-background-secondary/60 rounded-lg p-3 flex justify-between items-start">
                  <span className="text-[10px] text-text-muted uppercase tracking-wide">{item.label}</span>
                  <span className={cn("text-sm text-right max-w-[60%]", (item as any).highlight ? "text-primary font-bold" : "text-text-primary")}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
              <button onClick={() => { setShowDetailModal(false); openEditModal(viewingProduct); }}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium transition-all">
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                {editingProduct ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface-hover/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Nome *</label>
                <input type="text" placeholder="Nome do produto" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" autoFocus />
              </div>

              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Descricao</label>
                <textarea placeholder="Descricao do produto" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted resize-none focus:border-primary transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">SKU</label>
                  <input type="text" placeholder="Codigo SKU" value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted font-mono focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">URL da Imagem</label>
                  <input type="url" placeholder="https://..." value={form.image_url || ""}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Preco (R$)</label>
                  <input type="number" step="0.01" value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Custo (R$)</label>
                  <input type="number" step="0.01" value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:border-primary transition-all" />
                </div>
              </div>

              {/* Price preview */}
              <div className="flex items-center justify-between bg-background-secondary rounded-lg px-4 py-3 border border-border/50">
                <span className="text-xs text-text-secondary">Preco de venda</span>
                <span className="text-lg font-bold text-primary">{formatBRL(form.price)}</span>
              </div>

              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Categoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-background-secondary border border-border text-text-primary rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all">
                  <option value="">Sem categoria</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>

              <div className="flex items-center justify-between bg-background-secondary/60 rounded-lg px-4 py-3">
                <span className="text-sm text-text-primary">Produto ativo</span>
                <button
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className={cn(
                    "w-11 h-6 rounded-full transition-all relative",
                    form.active ? "bg-emerald-500" : "bg-text-muted"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 bg-surface rounded-full absolute top-0.5 transition-all shadow",
                    form.active ? "left-[22px]" : "left-0.5"
                  )} />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover/50 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.name || saving}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 transition-all shadow-lg shadow-primary/20">
                {saving ? "Salvando..." : "Salvar Produto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
