"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, FolderTree, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { categoryApi, type Category } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

function CategoryNode({ category, level, onDelete }: { category: Category; level: number; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 hover:bg-gray-700/30 rounded-lg transition-colors group",
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-gray-100">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <FolderTree className="w-4 h-4 text-indigo-400" />
        <span className="text-sm text-gray-100 flex-1">{category.name}</span>
        <span className="text-xs text-gray-500 mr-2">{category.type}</span>
        <button
          onClick={() => onDelete(category.id)}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode key={child.id} category={child} level={level + 1} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", type: "product", parent: "" });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.list();
      const data: Category[] = res.data.results || res.data;
      // Build tree structure
      const map = new Map<string, Category>();
      const roots: Category[] = [];
      for (const cat of data) {
        map.set(cat.id, { ...cat, children: [] });
      }
      for (const cat of data) {
        const node = map.get(cat.id)!;
        if (cat.parent && map.has(cat.parent)) {
          map.get(cat.parent)!.children!.push(node);
        } else {
          roots.push(node);
        }
      }
      setCategories(roots);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      await categoryApi.create({
        ...newCategory,
        parent: newCategory.parent || null,
      });
      setShowAddModal(false);
      setNewCategory({ name: "", type: "product", parent: "" });
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      await categoryApi.delete(id);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const flattenCategories = (cats: Category[]): Category[] => {
    const flat: Category[] = [];
    const walk = (list: Category[]) => {
      for (const c of list) {
        flat.push(c);
        if (c.children) walk(c.children);
      }
    };
    walk(cats);
    return flat;
  };

  const allFlat = flattenCategories(categories);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorias</h1>
          <p className="text-sm text-gray-400">Organize produtos e leads por categoria</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-2">
          {categories.length > 0 ? (
            categories.map((cat) => (
              <CategoryNode key={cat.id} category={cat} level={0} onDelete={handleDelete} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FolderTree className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p>Nenhuma categoria criada</p>
            </div>
          )}
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Nova Categoria</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome *" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500" />
              <select value={newCategory.type} onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                <option value="product">Produto</option>
                <option value="lead">Lead</option>
                <option value="general">Geral</option>
              </select>
              <select value={newCategory.parent} onChange={(e) => setNewCategory({ ...newCategory, parent: e.target.value })} className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm">
                <option value="">Sem pai (raiz)</option>
                {allFlat.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancelar</button>
              <button onClick={handleAddCategory} disabled={!newCategory.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
