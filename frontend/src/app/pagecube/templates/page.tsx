"use client";

import { useEffect, useState } from "react";
import {
  Layout,
  Loader2,
  AlertCircle,
  Inbox,
  RefreshCw,
  Copy,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type PageTemplate } from "@/lib/pagecubeApi";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<number | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await pagecubeApi.listTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar templates");
    } finally {
      setLoading(false);
    }
  }

  async function handleUseTemplate(template: PageTemplate) {
    try {
      setCreating(template.id);
      await pagecubeApi.createPage({
        title: `${template.name} - Copia`,
        slug: `${(template as any).slug || template.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        status: "draft",
        content: template.content,
      });
      alert("Pagina criada a partir do template! Acesse a lista de paginas.");
    } catch (e) {
      console.error(e);
      setError("Falha ao criar pagina a partir do template");
    } finally {
      setCreating(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Templates</h1>
            <p className="text-sm text-text-muted">Modelos prontos de landing pages</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Inbox className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-text-secondary font-medium mb-1">Nenhum template disponivel</h3>
              <p className="text-text-muted text-sm">
                Templates sao criados pelo administrador e aparecerao aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-surface border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
                >
                  {tpl.thumbnail_url ? (
                    <div className="aspect-video bg-background">
                      <img
                        src={tpl.thumbnail_url}
                        alt={tpl.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-background flex items-center justify-center">
                      <Layout className="w-10 h-10 text-text-muted" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-text-primary font-semibold mb-1">{tpl.name}</h3>
                    {tpl.description && (
                      <p className="text-sm text-text-muted mb-3">{tpl.description}</p>
                    )}
                    {tpl.category && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded mb-3">
                        {tpl.category}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(tpl)}
                      disabled={creating === tpl.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {creating === tpl.id ? "Criando..." : "Usar Template"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
