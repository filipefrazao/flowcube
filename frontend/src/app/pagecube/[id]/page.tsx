"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Eye,
  Globe,
  Settings,
  FileText,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type Page } from "@/lib/pagecubeApi";

export default function PageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = Number(params.id);

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"content" | "seo" | "settings">("content");

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    status: "draft" as "draft" | "published" | "archived",
    puck_data: "{}",
    meta_title: "",
    meta_description: "",
    og_image: "",
    favicon_url: "",
    custom_scripts: "",
  });

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await pagecubeApi.getPage(pageId);
      setPage(data);
      setFormData({
        title: data.title || "",
        slug: data.slug || "",
        status: data.status || "draft",
        puck_data: JSON.stringify((data as any).puck_data || data.content || {}, null, 2),
        meta_title: (data as any).meta_title || "",
        meta_description: (data as any).meta_description || "",
        og_image: (data as any).og_image || "",
        favicon_url: (data as any).favicon_url || "",
        custom_scripts: (data as any).custom_scripts || "",
      });
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar pagina");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      let puckData: any = {};
      try {
        puckData = JSON.parse(formData.puck_data);
      } catch {
        puckData = {};
      }

      await pagecubeApi.updatePage(pageId, {
        title: formData.title,
        slug: formData.slug,
        status: formData.status,
        content: puckData,
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        og_image: formData.og_image,
        favicon_url: formData.favicon_url,
        custom_scripts: formData.custom_scripts,
      } as any);
      await load();
    } catch (e) {
      console.error(e);
      setError("Falha ao salvar pagina");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setFormData((prev) => ({ ...prev, status: "published" }));
    try {
      setSaving(true);
      let puckData: any = {};
      try {
        puckData = JSON.parse(formData.puck_data);
      } catch {
        puckData = {};
      }
      await pagecubeApi.updatePage(pageId, {
        title: formData.title,
        slug: formData.slug,
        status: "published",
        content: puckData,
      } as any);
      await load();
    } catch (e) {
      console.error(e);
      setError("Falha ao publicar");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (pageId) load();
  }, [pageId]);

  const tabs = [
    { id: "content" as const, label: "Conteudo", icon: FileText },
    { id: "seo" as const, label: "SEO", icon: Globe },
    { id: "settings" as const, label: "Configuracoes", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/pagecube")}
              className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">{formData.title || "Sem titulo"}</h1>
              <p className="text-sm text-text-muted">/{formData.slug}</p>
            </div>
            <span
              className={`px-2 py-0.5 text-xs rounded font-medium border ${
                formData.status === "published"
                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                  : formData.status === "archived"
                  ? "bg-gray-500/15 text-gray-400 border-gray-500/30"
                  : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
              }`}
            >
              {formData.status === "published" ? "Publicada" : formData.status === "archived" ? "Arquivada" : "Rascunho"}
            </span>
          </div>
          <div className="flex gap-2">
            {formData.status === "published" && (
              <a
                href={`/p/${formData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors"
              >
                <Eye className="w-4 h-4" />
                Visualizar
              </a>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {formData.status !== "published" && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors disabled:opacity-50"
              >
                <Globe className="w-4 h-4" />
                Publicar
              </button>
            )}
          </div>
        </header>

        <div className="border-b border-border bg-background px-6">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <main className="flex-1 overflow-auto p-6">
          {tab === "content" && (
            <div className="space-y-4 max-w-4xl">
              <div>
                <label className="block text-sm text-text-muted mb-1">Titulo</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary text-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted text-sm">/p/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicada</option>
                  <option value="archived">Arquivada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Conteudo da Pagina (JSON)</label>
                <textarea
                  value={formData.puck_data}
                  onChange={(e) => setFormData({ ...formData, puck_data: e.target.value })}
                  rows={20}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary font-mono text-sm"
                />
                <p className="text-xs text-text-muted mt-1">
                  Estrutura JSON do conteudo da pagina (Puck editor data)
                </p>
              </div>
            </div>
          )}

          {tab === "seo" && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm text-text-muted mb-1">Meta Title</label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                  placeholder="Titulo para SEO (padrao: titulo da pagina)"
                />
                <p className="text-xs text-text-muted mt-1">{formData.meta_title.length}/60 caracteres</p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Meta Description</label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                  placeholder="Descricao para mecanismos de busca"
                />
                <p className="text-xs text-text-muted mt-1">{formData.meta_description.length}/160 caracteres</p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Open Graph Image URL</label>
                <input
                  type="url"
                  value={formData.og_image}
                  onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Favicon URL</label>
                <input
                  type="url"
                  value={formData.favicon_url}
                  onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm text-text-muted mb-1">Scripts Personalizados</label>
                <textarea
                  value={formData.custom_scripts}
                  onChange={(e) => setFormData({ ...formData, custom_scripts: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary font-mono text-sm"
                  placeholder="<!-- Google Analytics, Facebook Pixel, etc -->"
                />
                <p className="text-xs text-text-muted mt-1">
                  Scripts injetados no head da pagina (Analytics, pixels, etc)
                </p>
              </div>
              <div className="p-4 bg-surface border border-border rounded-lg">
                <h4 className="text-sm font-medium text-text-primary mb-2">Informacoes</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-text-muted">ID</dt>
                  <dd className="text-text-secondary">{page?.id}</dd>
                  <dt className="text-text-muted">Criada em</dt>
                  <dd className="text-text-secondary">{page?.created_at ? new Date(page.created_at).toLocaleString("pt-BR") : "-"}</dd>
                  <dt className="text-text-muted">Atualizada em</dt>
                  <dd className="text-text-secondary">{page?.updated_at ? new Date(page.updated_at).toLocaleString("pt-BR") : "-"}</dd>
                </dl>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
