"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, X, Copy, Eye, Loader2, Trash2 } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { chatcubeApi } from "@/lib/chatcubeApi";
import { cn } from "@/lib/utils";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  message_type: string;
  media_url: string | null;
  variables: string[];
  created_at: string;
}

const typeBadge: Record<string, string> = {
  text: "bg-accent-blue/10 text-accent-blue",
  image: "bg-accent-purple/10 text-accent-purple",
  video: "bg-accent-orange/10 text-accent-orange",
  document: "bg-accent-green/10 text-accent-green",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", content: "", message_type: "text" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '/api/v1/chatcube')}/templates/`,
        { headers: { Authorization: `Token ${typeof window !== 'undefined' ? localStorage.getItem('authToken') : ''}` } }
      );
      if (resp.ok) {
        const data = await resp.json();
        setTemplates(data.results || []);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '/api/v1/chatcube')}/templates/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            name: formData.name,
            content: formData.content,
            message_type: formData.message_type,
          }),
        }
      );
      if (resp.ok) {
        setShowForm(false);
        setFormData({ name: "", content: "", message_type: "text" });
        loadTemplates();
      } else {
        const err = await resp.json();
        setError(err.detail || JSON.stringify(err));
      }
    } catch (err) {
      setError('Failed to create template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir template?")) return;
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '/api/v1/chatcube')}/templates/${id}/`,
        {
          method: 'DELETE',
          headers: { Authorization: `Token ${localStorage.getItem('authToken')}` },
        }
      );
      loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Templates de Mensagem</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Novo Template
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum template criado</p>
              <p className="text-sm mt-1">Crie seu primeiro template de mensagem.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="bg-surface rounded-lg border border-border p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-text-primary">{t.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadge[t.message_type] || typeBadge.text}`}>
                      {t.message_type}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-4 line-clamp-3 whitespace-pre-wrap">{t.content}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-text-muted">{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setShowPreview(t)} className="text-text-muted hover:text-text-primary" title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-error hover:text-error/80" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Novo Template</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-text-muted" /></button>
              </div>
              {error && <p className="text-sm text-error mb-3">{error}</p>}
              <div className="space-y-4">
                <div><label className="block text-sm text-text-secondary mb-1">Nome</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-sm text-text-secondary mb-1">Tipo</label>
                  <select value={formData.message_type} onChange={(e) => setFormData({ ...formData, message_type: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                    <option value="text">Texto</option>
                    <option value="image">Imagem</option>
                    <option value="video">Video</option>
                    <option value="document">Documento</option>
                  </select></div>
                <div><label className="block text-sm text-text-secondary mb-1">Conteudo</label>
                  <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Use {{variavel}} para campos dinamicos"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" rows={5} /></div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary">Cancelar</button>
                  <button onClick={handleCreate} disabled={saving || !formData.name.trim() || !formData.content.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 transition-colors">
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
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">{showPreview.name}</h2>
                <button onClick={() => setShowPreview(null)}><X className="w-5 h-5 text-text-muted" /></button>
              </div>
              <div className="bg-background rounded-lg p-4">
                <div className="bg-primary/20 rounded-lg p-3 max-w-[80%] ml-auto">
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{showPreview.content}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
