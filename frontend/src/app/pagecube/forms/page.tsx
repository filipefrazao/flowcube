"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, Loader2, AlertCircle, RefreshCw, Plus, Trash2,
  CheckCircle, XCircle, Layout, ClipboardList, LayoutTemplate,
  Check, Link2, RotateCw, Webhook, ExternalLink,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type FormSchema, type Page } from "@/lib/pagecubeApi";

const PLATFORM_BASE = typeof window !== "undefined"
  ? window.location.origin.replace("3000", "8000")
  : "https://platform.frzgroup.com.br";

export default function FormsPage() {
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  const [sheetsModal, setSheetsModal] = useState<{ formId: number; current: string } | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsSaving, setSheetsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "", page: "", schema: '{"fields":[]}',
    success_message: "Obrigado! Recebemos seu envio.",
    redirect_url: "", is_active: true,
  });

  async function load() {
    try {
      setLoading(true); setError(null);
      const [formsData, pagesData] = await Promise.all([
        pagecubeApi.listForms(), pagecubeApi.listPages(),
      ]);
      setForms(formsData); setPages(pagesData);
    } catch { setError("Falha ao carregar formularios"); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setFormData({ name: "", page: "", schema: '{"fields":[]}', success_message: "Obrigado! Recebemos seu envio.", redirect_url: "", is_active: true });
    setEditingId(null); setShowForm(false);
  }

  function startEdit(form: FormSchema) {
    setFormData({
      name: form.name || "", page: String(form.page),
      schema: JSON.stringify(form.schema, null, 2),
      success_message: (form as any).success_message || "",
      redirect_url: (form as any).redirect_url || "",
      is_active: (form as any).is_active !== false,
    });
    setEditingId(form.id); setShowForm(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.page) return;
    setSaving(true);
    try {
      let schema: any = {};
      try { schema = JSON.parse(formData.schema); } catch { schema = { fields: [] }; }
      const payload: any = { name: formData.name, page: parseInt(formData.page), schema, success_message: formData.success_message, redirect_url: formData.redirect_url || "", is_active: formData.is_active };
      if (editingId) { await pagecubeApi.updateForm(editingId, payload); }
      else { await pagecubeApi.createForm(payload); }
      resetForm(); await load();
    } catch { setError("Falha ao salvar formulario"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este formulario?")) return;
    try { await pagecubeApi.deleteForm(id); await load(); } catch { /* ignore */ }
  }

  function copyWebhookUrl(form: FormSchema) {
    const url = `https://platform.frzgroup.com.br/api/v1/pagecube/webhook/${form.webhook_token}/`;
    navigator.clipboard.writeText(url);
    setCopiedToken(form.id);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  function openSheetsModal(form: FormSchema) {
    setSheetsUrl(form.google_sheets_url || "");
    setSheetsModal({ formId: form.id, current: form.google_sheets_url || "" });
  }

  async function saveSheets(urlOverride?: string) {
    if (!sheetsModal) return;
    setSheetsSaving(true);
    try {
      await pagecubeApi.connectSheets(sheetsModal.formId, urlOverride ?? sheetsUrl);
      setSheetsModal(null); await load();
    } catch { /* ignore */ }
    finally { setSheetsSaving(false); }
  }

  async function handleSync(formId: number) {
    setSyncingId(formId);
    try {
      await pagecubeApi.syncSheets(formId);
      setTimeout(() => { setSyncingId(null); load(); }, 2500);
    } catch { setSyncingId(null); }
  }

  useEffect(() => { load(); }, []);

  const pageName = (pageId: number) => {
    const p = pages.find((pg) => pg.id === pageId);
    return p ? p.title : `Pagina #${pageId}`;
  };

  const navLinks = [
    { href: "/pagecube", label: "Paginas", icon: Layout, active: false },
    { href: "/pagecube/forms", label: "Formularios", icon: ClipboardList, active: true },
    { href: "/pagecube/templates", label: "Templates", icon: LayoutTemplate, active: false },
    { href: "/pagecube/submissions", label: "Submissoes", icon: FileText, active: false },
  ];

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
            <button type="button" onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors">
              <Plus className="w-4 h-4" /> Novo Formulario
            </button>
          </div>
        </header>

        <div className="border-b border-border bg-background px-6">
          <div className="flex gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${link.active ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-secondary"}`}>
                <link.icon className="w-4 h-4" />{link.label}
              </Link>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-auto p-6">
          {showForm && (
            <div className="bg-surface border border-border rounded-lg p-6 mb-6">
              <h3 className="text-text-primary font-semibold mb-4">{editingId ? "Editar Formulario" : "Novo Formulario"}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Nome *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary" placeholder="Nome do formulario" />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Pagina *</label>
                  <select value={formData.page} onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary">
                    <option value="">Selecione...</option>
                    {pages.map((p) => <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Mensagem de Sucesso</label>
                  <input type="text" value={formData.success_message} onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary" />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">URL de Redirecionamento</label>
                  <input type="url" value={formData.redirect_url} onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary" placeholder="https://..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-text-muted mb-1">Schema (JSON)</label>
                  <textarea value={formData.schema} onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
                    rows={4} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary font-mono text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" />
                  <label className="text-sm text-text-secondary">Ativo</label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={handleSave} disabled={saving || !formData.name || !formData.page}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-white font-medium transition-colors">
                  {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                </button>
                <button type="button" onClick={resetForm}
                  className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>
          ) : forms.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-text-secondary font-medium mb-1">Nenhum formulario criado</h3>
              <p className="text-text-muted text-sm mb-6 max-w-sm">Crie formularios para capturar leads nas suas landing pages.</p>
              <button type="button" onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors">
                <Plus className="w-4 h-4" /> Criar Formulario
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
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Respostas</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Webhook Externo</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Google Sheets</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-text-muted">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((form) => (
                    <tr key={form.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">{form.name || `Formulario #${form.id}`}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{pageName(form.page)}</td>
                      <td className="px-4 py-3 text-sm">
                        {(form as any).is_active !== false
                          ? <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3.5 h-3.5" /> Ativo</span>
                          : <span className="flex items-center gap-1 text-gray-400"><XCircle className="w-3.5 h-3.5" /> Inativo</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link href={`/pagecube/submissions?form_id=${form.id}`}
                          className="text-text-muted hover:text-primary transition-colors">
                          {(form as any).submissions_count || 0} respostas
                        </Link>
                      </td>
                      {/* Webhook */}
                      <td className="px-4 py-3 text-sm">
                        {form.webhook_token ? (
                          <button type="button" onClick={() => copyWebhookUrl(form)}
                            title="Copiar URL do webhook para usar em formularios externos"
                            className="flex items-center gap-1.5 px-2 py-1 bg-surface-hover border border-border rounded text-xs text-text-secondary hover:text-primary hover:border-primary transition-colors">
                            {copiedToken === form.id
                              ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copiado!</span></>
                              : <><Webhook className="w-3 h-3" />Copiar URL</>}
                          </button>
                        ) : <span className="text-text-muted text-xs">—</span>}
                      </td>
                      {/* Google Sheets */}
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          {form.google_sheets_url ? (
                            <>
                              <a href={form.google_sheets_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                                <CheckCircle className="w-3 h-3" />Conectado<ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <button type="button" onClick={() => handleSync(form.id)} disabled={syncingId === form.id}
                                title="Sincronizar todas as respostas agora"
                                className="p-1 text-text-muted hover:text-primary transition-colors disabled:opacity-50">
                                <RotateCw className={`w-3 h-3 ${syncingId === form.id ? "animate-spin" : ""}`} />
                              </button>
                              <button type="button" onClick={() => openSheetsModal(form)}
                                title="Alterar planilha" className="p-1 text-text-muted hover:text-primary transition-colors">
                                <Link2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => openSheetsModal(form)}
                              className="flex items-center gap-1 px-2 py-1 bg-surface-hover border border-border rounded text-xs text-text-secondary hover:text-primary hover:border-primary transition-colors">
                              <Link2 className="w-3 h-3" />Conectar
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => startEdit(form)}
                            className="px-2 py-1 text-xs bg-surface-hover border border-border rounded text-text-secondary hover:text-text-primary transition-colors">
                            Editar
                          </button>
                          <button type="button" onClick={() => handleDelete(form.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors">
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

      {/* Google Sheets Modal */}
      {sheetsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setSheetsModal(null); }}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-text-primary font-semibold text-lg mb-1">Conectar Google Sheets</h3>
            <p className="text-text-muted text-sm mb-4">
              Cole a URL da planilha. As proximas submissoes serao adicionadas automaticamente como novas linhas.
            </p>
            <div>
              <label className="block text-sm text-text-muted mb-1">URL da Planilha Google</label>
              <input type="url" value={sheetsUrl} onChange={(e) => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveSheets(); }}
              />
              <p className="text-xs text-text-muted mt-2">
                A planilha precisa estar compartilhada com a service account do servidor para funcionar.
              </p>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => saveSheets()} disabled={sheetsSaving || !sheetsUrl}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-white font-medium transition-colors text-sm">
                {sheetsSaving ? "Salvando..." : "Salvar e Conectar"}
              </button>
              {sheetsModal.current && (
                <button type="button" onClick={() => saveSheets("")}
                  className="px-3 py-2 bg-surface-hover border border-red-500/30 hover:border-red-500 rounded-lg text-red-400 text-sm transition-colors">
                  Remover
                </button>
              )}
              <button type="button" onClick={() => setSheetsModal(null)}
                className="px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-secondary text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
