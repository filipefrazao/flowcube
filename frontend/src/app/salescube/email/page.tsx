"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  Send,
  Eye,
  Edit2,
  Trash2,
  Mail,
  Copy,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { emailTemplateApi, type EmailTemplateType } from "@/lib/salesApi";
import { cn } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "marketing", label: "Marketing" },
  { value: "vendas", label: "Vendas" },
  { value: "suporte", label: "Suporte" },
  { value: "onboarding", label: "Onboarding" },
  { value: "cobranca", label: "Cobranca" },
  { value: "geral", label: "Geral" },
];

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "bg-purple-500/20 text-purple-400",
  vendas: "bg-green-500/20 text-green-400",
  suporte: "bg-blue-500/20 text-blue-400",
  onboarding: "bg-orange-500/20 text-orange-400",
  cobranca: "bg-red-500/20 text-red-400",
  geral: "bg-gray-500/20 text-gray-400",
};

const EMPTY_FORM: TemplateForm = {
  name: "",
  subject: "",
  body_html: "",
  body_text: "",
  category: "geral",
  variables: "",
  is_active: true,
};

// ============================================================================
// Types
// ============================================================================

interface TemplateForm {
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  category: string;
  variables: string;
  is_active: boolean;
}

interface SendForm {
  to: string;
  variables: Record<string, string>;
}

// ============================================================================
// Component
// ============================================================================

export default function EmailPage() {
  const [templates, setTemplates] = useState<EmailTemplateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Modals
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateType | null>(null);
  const [form, setForm] = useState<TemplateForm>({ ...EMPTY_FORM });

  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<EmailTemplateType | null>(null);
  const [sendForm, setSendForm] = useState<SendForm>({ to: "", variables: {} });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"success" | "error" | null>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplateType | null>(null);

  const [saving, setSaving] = useState(false);

  // --------------------------------------------------------------------------
  // Fetch templates
  // --------------------------------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filterCategory) params.category = filterCategory;
      const res = await emailTemplateApi.list(params);
      setTemplates(res.data.results || res.data || []);
    } catch (err) {
      console.error("Erro ao carregar templates:", err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // --------------------------------------------------------------------------
  // Editor modal
  // --------------------------------------------------------------------------

  const openCreateEditor = () => {
    setEditingTemplate(null);
    setForm({ ...EMPTY_FORM });
    setShowEditor(true);
  };

  const openEditEditor = (template: EmailTemplateType) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || "",
      category: template.category || "geral",
      variables: (template.variables || []).join(", "),
      is_active: template.is_active,
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim()) return;
    setSaving(true);
    try {
      const variablesList = form.variables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const payload = {
        name: form.name,
        subject: form.subject,
        body_html: form.body_html,
        body_text: form.body_text,
        category: form.category,
        variables: variablesList,
        is_active: form.is_active,
      };

      if (editingTemplate) {
        await emailTemplateApi.update(editingTemplate.id, payload);
      } else {
        await emailTemplateApi.create(payload);
      }
      setShowEditor(false);
      fetchTemplates();
    } catch (err) {
      console.error("Erro ao salvar template:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template de e-mail?")) return;
    try {
      await emailTemplateApi.delete(id);
      fetchTemplates();
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
  };

  // --------------------------------------------------------------------------
  // Send dialog
  // --------------------------------------------------------------------------

  const openSendDialog = (template: EmailTemplateType) => {
    setSendingTemplate(template);
    const vars: Record<string, string> = {};
    (template.variables || []).forEach((v) => {
      vars[v] = "";
    });
    setSendForm({ to: "", variables: vars });
    setSendResult(null);
    setShowSendDialog(true);
  };

  const handleSend = async () => {
    if (!sendingTemplate || !sendForm.to.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      await emailTemplateApi.send(sendingTemplate.id, sendForm.to, sendForm.variables);
      setSendResult("success");
      setTimeout(() => {
        setShowSendDialog(false);
        setSendResult(null);
      }, 2000);
    } catch (err) {
      console.error("Erro ao enviar e-mail:", err);
      setSendResult("error");
    } finally {
      setSending(false);
    }
  };

  // --------------------------------------------------------------------------
  // Preview
  // --------------------------------------------------------------------------

  const openPreview = (template: EmailTemplateType) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const getRenderedHtml = (template: EmailTemplateType): string => {
    let html = template.body_html || "";
    (template.variables || []).forEach((v) => {
      const regex = new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g");
      html = html.replace(regex, `<span style="background:#4f46e5;color:white;padding:1px 6px;border-radius:3px;font-size:12px;">{{${v}}}</span>`);
    });
    return html;
  };

  // --------------------------------------------------------------------------
  // Filtered templates
  // --------------------------------------------------------------------------

  const filtered = templates.filter((t) => {
    const matchSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = !filterCategory || t.category === filterCategory;
    return matchSearch && matchCategory;
  });

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates de Email</h1>
          <p className="text-sm text-gray-400">
            {filtered.length} {filtered.length === 1 ? "template" : "templates"}
          </p>
        </div>
        <button
          onClick={openCreateEditor}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Template Gallery */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum template encontrado</p>
          <button
            onClick={openCreateEditor}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Criar primeiro template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const catColor =
              CATEGORY_COLORS[template.category] || CATEGORY_COLORS.geral;

            return (
              <div
                key={template.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors group flex flex-col"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {template.name}
                      </h3>
                      {!template.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      Assunto: {template.subject}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2",
                      catColor
                    )}
                  >
                    {template.category || "Geral"}
                  </span>
                </div>

                {/* Variables */}
                {template.variables && template.variables.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-500 mb-1">Variaveis:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((v) => (
                        <span
                          key={v}
                          className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded font-mono"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview snippet */}
                <div className="flex-1 mb-4">
                  <div
                    className="text-xs text-gray-500 line-clamp-3 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html:
                        template.body_html?.replace(/<[^>]*>/g, " ").slice(0, 150) ||
                        "Sem conteudo",
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-3 border-t border-gray-700">
                  <button
                    onClick={() => openPreview(template)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Visualizar"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualizar
                  </button>
                  <button
                    onClick={() => openEditEditor(template)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => openSendDialog(template)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors"
                    title="Enviar"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* Create/Edit Template Modal                                         */}
      {/* ================================================================== */}

      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowEditor(false)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editingTemplate ? "Editar Template" : "Novo Template"}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-400 hover:text-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name + Category */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">
                    Nome *
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do template"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Categoria
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm"
                  >
                    {CATEGORY_OPTIONS.filter((o) => o.value).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Assunto *
                </label>
                <input
                  type="text"
                  placeholder="Assunto do e-mail"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
                />
              </div>

              {/* Body HTML */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Corpo HTML
                </label>
                <textarea
                  placeholder="<h1>Ola {{nome}}</h1><p>Conteudo do e-mail...</p>"
                  value={form.body_html}
                  onChange={(e) =>
                    setForm({ ...form, body_html: e.target.value })
                  }
                  rows={10}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none font-mono"
                />
              </div>

              {/* Body Text (fallback) */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Texto alternativo (opcional)
                </label>
                <textarea
                  placeholder="Versao em texto simples para clientes que nao suportam HTML"
                  value={form.body_text}
                  onChange={(e) =>
                    setForm({ ...form, body_text: e.target.value })
                  }
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none"
                />
              </div>

              {/* Variables */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Variaveis (separadas por virgula)
                </label>
                <input
                  type="text"
                  placeholder="nome, empresa, produto, valor"
                  value={form.variables}
                  onChange={(e) =>
                    setForm({ ...form, variables: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 font-mono"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  Use {`{{variavel}}`} no corpo do e-mail para substituicao automatica
                </p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setForm({ ...form, is_active: !form.is_active })
                  }
                  className={cn(
                    "w-10 h-5 rounded-full transition-colors relative",
                    form.is_active ? "bg-indigo-600" : "bg-gray-600"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform",
                      form.is_active ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
                <span className="text-xs text-gray-400">
                  {form.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.subject.trim() || saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Send Email Dialog                                                  */}
      {/* ================================================================== */}

      {showSendDialog && sendingTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowSendDialog(false)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Enviar Email</h2>
              <button
                onClick={() => setShowSendDialog(false)}
                className="text-gray-400 hover:text-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template info */}
            <div className="bg-gray-900 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">Template</p>
              <p className="text-sm text-white font-medium">
                {sendingTemplate.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Assunto: {sendingTemplate.subject}
              </p>
            </div>

            <div className="space-y-3">
              {/* Recipient */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Destinatario *
                </label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={sendForm.to}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, to: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
                  autoFocus
                />
              </div>

              {/* Variables */}
              {sendingTemplate.variables && sendingTemplate.variables.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Variaveis</p>
                  {sendingTemplate.variables.map((varName) => (
                    <div key={varName}>
                      <label className="text-[11px] text-gray-400 mb-0.5 block font-mono">
                        {`{{${varName}}}`}
                      </label>
                      <input
                        type="text"
                        placeholder={`Valor para ${varName}`}
                        value={sendForm.variables[varName] || ""}
                        onChange={(e) =>
                          setSendForm({
                            ...sendForm,
                            variables: {
                              ...sendForm.variables,
                              [varName]: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send result feedback */}
            {sendResult === "success" && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">
                  Email enviado com sucesso!
                </span>
              </div>
            )}
            {sendResult === "error" && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">
                  Erro ao enviar. Tente novamente.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSendDialog(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={!sendForm.to.trim() || sending}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Preview Panel                                                      */}
      {/* ================================================================== */}

      {showPreview && previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Visualizacao
                </h2>
                <p className="text-xs text-gray-400">
                  {previewTemplate.name}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email header simulation */}
            <div className="px-6 py-3 bg-gray-900 border-b border-gray-700">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-16">De:</span>
                <span className="text-gray-300">noreply@frzgroup.com.br</span>
              </div>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="text-gray-500 w-16">Assunto:</span>
                <span className="text-white font-medium">
                  {previewTemplate.subject}
                </span>
              </div>
              {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span className="text-gray-500 w-16">Variaveis:</span>
                  <span className="text-indigo-400 font-mono">
                    {previewTemplate.variables.map((v) => `{{${v}}}`).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* HTML preview */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="bg-white rounded-lg p-6 min-h-[200px] text-gray-900"
                dangerouslySetInnerHTML={{
                  __html: getRenderedHtml(previewTemplate),
                }}
              />
            </div>

            {/* Preview footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-700">
              <span className="text-xs text-gray-500">
                Criado em{" "}
                {new Date(previewTemplate.created_at).toLocaleDateString("pt-BR")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    openEditEditor(previewTemplate);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    openSendDialog(previewTemplate);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
