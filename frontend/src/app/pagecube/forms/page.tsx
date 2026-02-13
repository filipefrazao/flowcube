"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  AlertCircle,
  Inbox,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type FormSchema, type Page } from "@/lib/pagecubeApi";

export default function FormsPage() {
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    page: "",
    schema: '{"fields":[]}',
    success_message: "Obrigado! Recebemos seu envio.",
    redirect_url: "",
    is_active: true,
  });

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [formsData, pagesData] = await Promise.all([
        pagecubeApi.listForms(),
        pagecubeApi.listPages(),
      ]);
      setForms(formsData);
      setPages(pagesData);
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar formularios");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      page: "",
      schema: '{"fields":[]}',
      success_message: "Obrigado! Recebemos seu envio.",
      redirect_url: "",
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(form: FormSchema) {
    setFormData({
      name: (form as any).name || "",
      page: String(form.page),
      schema: JSON.stringify(form.schema, null, 2),
      success_message: (form as any).success_message || "",
      redirect_url: (form as any).redirect_url || "",
      is_active: (form as any).is_active !== false,
    });
    setEditingId(form.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.page) return;
    try {
      setSaving(true);
      let schema: any = {};
      try {
        schema = JSON.parse(formData.schema);
      } catch {
        schema = { fields: [] };
      }

      const payload: any = {
        name: formData.name,
        page: parseInt(formData.page),
        schema,
        success_message: formData.success_message,
        redirect_url: formData.redirect_url || "",
        is_active: formData.is_active,
      };

      if (editingId) {
        await pagecubeApi.updateForm(editingId, payload);
      } else {
        await pagecubeApi.createForm(payload);
      }
      resetForm();
      await load();
    } catch (e) {
      console.error(e);
      setError("Falha ao salvar formulario");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este formulario?")) return;
    try {
      await pagecubeApi.deleteForm(id);
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pageName = (pageId: number) => {
    const p = pages.find((pg) => pg.id === pageId);
    return p ? p.title : `Pagina #${pageId}`;
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Formularios</h1>
            <p className="text-sm text-text-muted">Formularios das landing pages</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Formulario
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {showForm && (
            <div className="bg-surface border border-border rounded-lg p-6 mb-6">
              <h3 className="text-text-primary font-semibold mb-4">
                {editingId ? "Editar Formulario" : "Novo Formulario"}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                    placeholder="Nome do formulario"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Pagina *</label>
                  <select
                    value={formData.page}
                    onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                  >
                    <option value="">Selecione...</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Mensagem de Sucesso</label>
                  <input
                    type="text"
                    value={formData.success_message}
                    onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">URL de Redirecionamento</label>
                  <input
                    type="url"
                    value={formData.redirect_url}
                    onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-text-muted mb-1">Schema (JSON)</label>
                  <textarea
                    value={formData.schema}
                    onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary font-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-text-secondary">Ativo</label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.page}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
                >
                  {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : forms.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Inbox className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-text-secondary font-medium mb-1">Nenhum formulario</h3>
              <p className="text-text-muted text-sm mb-4">
                Crie formularios para capturar leads nas suas landing pages.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Formulario
              </button>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Nome</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Pagina</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Submissoes</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Criado em</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-text-muted">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form) => (
                    <tr key={form.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">
                        {(form as any).name || `Formulario #${form.id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {pageName(form.page)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(form as any).is_active !== false ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" /> Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <XCircle className="w-3.5 h-3.5" /> Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {(form as any).submissions_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                        {new Date(form.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(form)}
                            className="px-2 py-1 text-xs bg-surface-hover border border-border rounded text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(form.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
