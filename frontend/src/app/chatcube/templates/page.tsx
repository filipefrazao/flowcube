"use client";

import { useState } from "react";
import { FileText, Plus, X, Copy, Eye, Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface MessageTemplate {
  id: number;
  name: string;
  content: string;
  type: "text" | "media" | "interactive" | "location";
  created_at: string;
}

// Placeholder data until backend API is ready
const INITIAL_TEMPLATES: MessageTemplate[] = [
  { id: 1, name: "Boas Vindas", content: "Ola {{nome}}! Bem-vindo(a) a Febracis. Como posso ajudar?", type: "text", created_at: "2026-02-01" },
  { id: 2, name: "Follow Up", content: "Oi {{nome}}, tudo bem? Estou entrando em contato sobre o {{produto}}. Posso te ajudar?", type: "text", created_at: "2026-02-05" },
  { id: 3, name: "Confirmacao", content: "Sua inscricao no {{curso}} foi confirmada! Data: {{data}}. Nos vemos la!", type: "text", created_at: "2026-02-08" },
];

const typeBadge: Record<string, string> = {
  text: "bg-blue-500/20 text-blue-400",
  media: "bg-purple-500/20 text-purple-400",
  interactive: "bg-yellow-500/20 text-yellow-400",
  location: "bg-green-500/20 text-green-400",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(INITIAL_TEMPLATES);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<MessageTemplate>>({ name: "", content: "", type: "text" });
  const [saving, setSaving] = useState(false);

  function handleCreate() {
    setSaving(true);
    const newTemplate: MessageTemplate = {
      id: Date.now(),
      name: formData.name || "",
      content: formData.content || "",
      type: (formData.type as MessageTemplate["type"]) || "text",
      created_at: new Date().toISOString().split("T")[0],
    };
    setTemplates([...templates, newTemplate]);
    setShowForm(false);
    setFormData({ name: "", content: "", type: "text" });
    setSaving(false);
  }

  function handleDuplicate(t: MessageTemplate) {
    const dup: MessageTemplate = { ...t, id: Date.now(), name: t.name + " (copia)" };
    setTemplates([...templates, dup]);
  }

  function handleDelete(id: number) {
    if (!confirm("Excluir template?")) return;
    setTemplates(templates.filter((t) => t.id !== id));
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Templates de Mensagem</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Template
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {templates.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum template criado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="bg-gray-800 rounded-lg border border-gray-700 p-5 hover:border-indigo-500/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-100">{t.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadge[t.type] || typeBadge.text}`}>
                      {t.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3 whitespace-pre-wrap">{t.content}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <span className="text-xs text-gray-500">{t.created_at}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setShowPreview(t)} className="text-gray-400 hover:text-gray-200" title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDuplicate(t)} className="text-gray-400 hover:text-gray-200" title="Duplicar">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 text-xs">Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Template Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">Novo Template</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-gray-300 mb-1">Nome</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" /></div>
                <div><label className="block text-sm text-gray-300 mb-1">Tipo</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as MessageTemplate["type"] })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500">
                    <option value="text">Texto</option>
                    <option value="media">Media</option>
                    <option value="interactive">Interativo</option>
                    <option value="location">Localizacao</option>
                  </select></div>
                <div><label className="block text-sm text-gray-300 mb-1">Conteudo</label>
                  <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Use {{variavel}} para campos dinamicos"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500" rows={5} /></div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-300 hover:text-gray-100">Cancelar</button>
                  <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-100">{showPreview.name}</h2>
                <button onClick={() => setShowPreview(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="bg-green-800/30 rounded-lg p-3 max-w-[80%] ml-auto">
                  <p className="text-sm text-gray-100 whitespace-pre-wrap">{showPreview.content}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
