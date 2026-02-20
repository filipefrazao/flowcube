"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, X, FolderTree, ChevronRight, ChevronDown, Trash2,
  Edit2, Filter, RotateCcw, FolderOpen, Folder, ChevronLeft,
  LayoutGrid, List, Tag, Layers, CheckCircle2, XCircle, GitBranch
} from "lucide-react";
import { categoryApi, type Category } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────────────────── */
interface CategoryNode extends Category {
  children: CategoryNode[];
  level: number;
}

const TYPE_CONFIG: Record<string, { label: string; bg: string }> = {
  product: { label: "Produto", bg: "bg-primary/15 text-primary border-primary/30" },
  lead:    { label: "Lead",    bg: "bg-emerald-500/15 text-primary border-primary/30" },
  general: { label: "Geral",   bg: "bg-gray-500/15 text-text-secondary border-gray-500/30" },
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR");
}

/* ── Tree Node Component ────────────────────────────────────────────── */
function TreeNode({
  node,
  onEdit,
  onDelete,
  searchQuery,
}: {
  node: CategoryNode;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const typeCfg = TYPE_CONFIG[node.type] || TYPE_CONFIG.general;
  const isRoot = node.level === 0;

  // If searching, show all expanded
  const shouldExpand = searchQuery ? true : expanded;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2.5 px-3 rounded-lg transition-all group",
          "hover:bg-surface-hover/30"
        )}
        style={{ paddingLeft: `${node.level * 24 + 12}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!shouldExpand)}
            className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
          >
            {shouldExpand ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon */}
        {hasChildren && shouldExpand ? (
          <FolderOpen className={cn("w-4 h-4 flex-shrink-0", isRoot ? "text-amber-400" : "text-primary")} />
        ) : hasChildren ? (
          <Folder className={cn("w-4 h-4 flex-shrink-0", isRoot ? "text-amber-400" : "text-primary")} />
        ) : (
          <Tag className="w-4 h-4 text-text-muted flex-shrink-0" />
        )}

        {/* Name */}
        <span className="text-sm text-text-primary flex-1 font-medium">{node.name}</span>

        {/* Badges */}
        {isRoot && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
            Raiz
          </span>
        )}
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", typeCfg.bg)}>
          {typeCfg.label}
        </span>
        <span className="text-[10px] text-text-muted font-mono w-16 text-right">
          Nv. {node.level}
        </span>

        {/* Children count */}
        {hasChildren && (
          <span className="text-[10px] text-text-muted bg-surface-hover/50 px-1.5 py-0.5 rounded">
            {node.children.length} sub
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(node)} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(node.id)} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Excluir">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && shouldExpand && (
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-surface-hover/30"
            style={{ left: `${node.level * 24 + 24}px` }}
          />
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  /* ── Data ───────────────────────────────────────────────────────── */
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [treeRoots, setTreeRoots] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Filters ────────────────────────────────────────────────────── */
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");

  /* ── Modal ──────────────────────────────────────────────────────── */
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", type: "product", parent: "", description: "" });
  const [saving, setSaving] = useState(false);

  /* ── Build tree ─────────────────────────────────────────────────── */
  const buildTree = useCallback((data: Category[]): CategoryNode[] => {
    const map = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    for (const cat of data) {
      map.set(cat.id, { ...cat, children: [], level: 0 });
    }

    for (const cat of data) {
      const node = map.get(cat.id)!;
      if (cat.parent && map.has(cat.parent)) {
        const parent = map.get(cat.parent)!;
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Fix deep levels
    const fixLevels = (nodes: CategoryNode[], level: number) => {
      for (const n of nodes) {
        n.level = level;
        fixLevels(n.children, level + 1);
      }
    };
    fixLevels(roots, 0);

    return roots;
  }, []);

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoryApi.list({ limit: "500" });
      const data: Category[] = res.data.results || res.data;
      setAllCategories(data);
      setTreeRoots(buildTree(data));
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setLoading(false);
    }
  }, [buildTree]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  /* ── Filtered tree / flat ───────────────────────────────────────── */
  const flattenTree = (nodes: CategoryNode[]): CategoryNode[] => {
    const flat: CategoryNode[] = [];
    const walk = (list: CategoryNode[]) => {
      for (const n of list) {
        flat.push(n);
        walk(n.children);
      }
    };
    walk(nodes);
    return flat;
  };

  const allFlat = flattenTree(treeRoots);

  const filteredFlat = allFlat.filter((c) => {
    if (filterSearch && !c.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterType && c.type !== filterType) return false;
    return true;
  });

  const filteredTree = filterSearch || filterType
    ? buildTree(filteredFlat.map((n) => ({ ...n, children: undefined } as unknown as Category)))
    : treeRoots;

  /* ── Stats ──────────────────────────────────────────────────────── */
  const stats = {
    total: allCategories.length,
    roots: treeRoots.length,
    maxDepth: allFlat.reduce((max, n) => Math.max(max, n.level), 0) + 1,
    types: {
      product: allCategories.filter((c) => c.type === "product").length,
      lead: allCategories.filter((c) => c.type === "lead").length,
      general: allCategories.filter((c) => c.type === "general").length,
    },
  };

  /* ── Handlers ───────────────────────────────────────────────────── */
  const openCreateModal = () => {
    setEditingCategory(null);
    setForm({ name: "", type: "product", parent: "", description: "" });
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      type: cat.type,
      parent: cat.parent || "",
      description: "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, parent: form.parent || null };
      if (editingCategory) {
        await categoryApi.update(editingCategory.id, data);
      } else {
        await categoryApi.create(data);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const node = allFlat.find((n) => n.id === id);
    const childCount = node?.children.length || 0;
    const msg = childCount > 0
      ? `Esta categoria tem ${childCount} subcategoria(s). Deseja excluir mesmo assim?`
      : "Tem certeza que deseja excluir esta categoria?";
    if (!confirm(msg)) return;
    try {
      await categoryApi.delete(id);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const clearFilters = () => {
    setFilterSearch(""); setFilterType("");
  };

  const hasActiveFilters = filterSearch || filterType;

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-primary" />
            Categorias
          </h1>
          <p className="text-sm text-text-secondary mt-1">Organize produtos e leads em hierarquias</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: String(stats.total), color: "text-text-primary", icon: Layers },
          { label: "Raizes", value: String(stats.roots), color: "text-amber-400", icon: FolderTree },
          { label: "Niveis", value: String(stats.maxDepth), color: "text-purple-400", icon: GitBranch },
          { label: "Produtos", value: String(stats.types.product), color: "text-primary", icon: Tag },
          { label: "Leads", value: String(stats.types.lead), color: "text-primary", icon: Tag },
        ].map((s, i) => (
          <div key={i} className="bg-surface/80 border border-border/50 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wide">{s.label}</span>
              <s.icon className={cn("w-3.5 h-3.5", s.color)} />
            </div>
            <span className={cn("text-lg font-bold", s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="bg-surface/80 border border-border/50 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Buscar categorias..." value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full bg-background-secondary/80 border border-border rounded-lg pl-10 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
          </div>

          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="bg-background-secondary/80 border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:border-primary transition-all">
            <option value="">Todos os Tipos</option>
            <option value="product">Produto</option>
            <option value="lead">Lead</option>
            <option value="general">Geral</option>
          </select>

          {/* View toggle */}
          <div className="flex bg-background-secondary/80 border border-border rounded-lg p-0.5">
            <button onClick={() => setViewMode("tree")} className={cn("p-2 rounded-md transition-all flex items-center gap-1 text-xs px-3", viewMode === "tree" ? "bg-primary text-gray-900" : "text-text-secondary hover:text-text-primary")}>
              <FolderTree className="w-4 h-4" /> Arvore
            </button>
            <button onClick={() => setViewMode("table")} className={cn("p-2 rounded-md transition-all flex items-center gap-1 text-xs px-3", viewMode === "table" ? "bg-primary text-gray-900" : "text-text-secondary hover:text-text-primary")}>
              <List className="w-4 h-4" /> Tabela
            </button>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "tree" ? (
        /* ── TREE VIEW ──────────────────────────────────────────── */
        <div className="bg-surface/80 border border-border/50 rounded-xl p-3 backdrop-blur-sm">
          {filteredTree.length > 0 ? (
            filteredTree.map((root) => (
              <TreeNode key={root.id} node={root} onEdit={openEditModal} onDelete={handleDelete} searchQuery={filterSearch} />
            ))
          ) : (
            <div className="text-center py-16">
              <FolderTree className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-muted font-medium">Nenhuma categoria encontrada</p>
              <p className="text-text-muted text-xs mt-1">Crie a primeira categoria para organizar seus dados</p>
              <button onClick={openCreateModal} className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm transition-colors">
                <Plus className="w-4 h-4 inline mr-1" /> Criar Categoria
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── TABLE VIEW ─────────────────────────────────────────── */
        <div className="bg-surface/80 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left bg-background-secondary/50">
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Hierarquia / Nome</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Nivel</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Categoria Pai</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide">Subcategorias</th>
                  <th className="px-4 py-3 text-text-secondary font-medium text-xs uppercase tracking-wide w-20">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlat.map((cat) => {
                  const typeCfg = TYPE_CONFIG[cat.type] || TYPE_CONFIG.general;
                  const parentName = allCategories.find((c) => c.id === cat.parent)?.name;
                  const isRoot = cat.level === 0;

                  return (
                    <tr key={cat.id} className="border-b border-border/30 hover:bg-surface-hover/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${cat.level * 16}px` }}>
                          {cat.level > 0 && (
                            <span className="text-text-secondary">{"--".repeat(cat.level)}</span>
                          )}
                          {isRoot ? (
                            <FolderTree className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          ) : cat.children.length > 0 ? (
                            <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : (
                            <Tag className="w-4 h-4 text-text-muted flex-shrink-0" />
                          )}
                          <span className="text-text-primary font-medium">{cat.name}</span>
                          {isRoot && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                              Raiz
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border", typeCfg.bg)}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-secondary bg-surface-hover/50 px-2 py-0.5 rounded font-mono">
                          {cat.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{parentName || "-"}</td>
                      <td className="px-4 py-3">
                        {cat.children.length > 0 ? (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {cat.children.length} subcategoria{cat.children.length !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditModal(cat)} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-all" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredFlat.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <FolderTree className="w-10 h-10 text-text-secondary mx-auto mb-3" />
                      <p className="text-text-muted">Nenhuma categoria encontrada</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                {editingCategory ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface-hover/50 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Nome *</label>
                <input type="text" placeholder="Nome da categoria" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-primary transition-all" autoFocus />
              </div>

              {/* Type */}
              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <button key={k} onClick={() => setForm({ ...form, type: k })}
                      className={cn(
                        "text-xs py-2.5 px-3 rounded-lg border font-medium transition-all text-center",
                        form.type === k ? v.bg : "bg-background-secondary border-border text-text-muted hover:border-border"
                      )}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent */}
              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Categoria Pai</label>
                <select value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}
                  className="w-full bg-background-secondary border border-border text-text-primary rounded-lg px-3 py-2.5 text-sm focus:border-primary transition-all">
                  <option value="">Raiz (sem pai)</option>
                  {allFlat
                    .filter((c) => editingCategory ? c.id !== editingCategory.id : true)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {"--".repeat(c.level)} {c.name}
                      </option>
                    ))}
                </select>
                {!form.parent && (
                  <p className="text-[10px] text-amber-400/70 mt-1 flex items-center gap-1">
                    <FolderTree className="w-3 h-3" />
                    Sera criada como categoria raiz
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-text-secondary mb-1.5 block font-medium uppercase tracking-wide">Descricao</label>
                <textarea placeholder="Descricao opcional..." value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted resize-none focus:border-primary transition-all" />
              </div>

              {/* Preview */}
              {form.name && (
                <div className="bg-background-secondary/60 rounded-lg p-3 border border-border/50">
                  <span className="text-[10px] text-text-muted uppercase tracking-wide block mb-2">Pre-visualizacao</span>
                  <div className="flex items-center gap-2">
                    {form.parent ? (
                      <Tag className="w-4 h-4 text-text-muted" />
                    ) : (
                      <FolderTree className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-sm text-text-primary font-medium">{form.name}</span>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border",
                      (TYPE_CONFIG[form.type] || TYPE_CONFIG.general).bg)}>
                      {(TYPE_CONFIG[form.type] || TYPE_CONFIG.general).label}
                    </span>
                    {!form.parent && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                        Raiz
                      </span>
                    )}
                  </div>
                  {form.parent && (
                    <p className="text-[10px] text-text-muted mt-1 ml-6">
                      Dentro de: {allFlat.find((c) => c.id === form.parent)?.name || "..."}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover/50 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!form.name || saving}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 transition-all shadow-lg shadow-primary/20">
                {saving ? "Salvando..." : "Salvar Categoria"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
