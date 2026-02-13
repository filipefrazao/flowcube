"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layout,
  Plus,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  AlertCircle,
  Eye,
  Trash2,
  Pencil,
  ClipboardList,
  LayoutTemplate,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type Page } from "@/lib/pagecubeApi";
import { cn } from "@/lib/utils";

function statusBadge(status: string) {
  switch (status) {
    case "published":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "draft":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "archived":
      return "bg-gray-500/15 text-gray-400 border-gray-500/30";
    default:
      return "bg-gray-500/15 text-gray-300 border-gray-500/30";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "published": return "Publicada";
    case "draft": return "Rascunho";
    case "archived": return "Arquivada";
    default: return status;
  }
}

export default function PageCubePage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await pagecubeApi.listPages();
      setPages(data);
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar paginas");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      setCreating(true);
      const newPage = await pagecubeApi.createPage({
        title: "Nova Pagina",
        slug: `pagina-${Date.now()}`,
        status: "draft",
        content: {},
      });
      router.push(`/pagecube/${newPage.id}`);
    } catch (e) {
      console.error(e);
      setError("Falha ao criar pagina");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta pagina?")) return;
    try {
      await pagecubeApi.deletePage(id);
      await load();
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const navLinks = [
    { href: "/pagecube", label: "Paginas", icon: Layout, active: true },
    { href: "/pagecube/forms", label: "Formularios", icon: ClipboardList, active: false },
    { href: "/pagecube/templates", label: "Templates", icon: LayoutTemplate, active: false },
    { href: "/pagecube/submissions", label: "Submissoes", icon: FileText, active: false },
  ];

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">PageCube</h1>
            <p className="text-sm text-text-muted">Landing pages e formularios</p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Nova Pagina
          </button>
        </header>

        <div className="border-b border-border bg-background px-6">
          <div className="flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  link.active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

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
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Layout className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-text-secondary font-medium mb-1">Nenhuma pagina criada</h3>
              <p className="text-text-muted text-sm mb-4">
                Crie sua primeira landing page para capturar leads.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Pagina
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => router.push(`/pagecube/${page.id}`)}
                  className="bg-surface border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-text-primary font-semibold truncate">{page.title}</h3>
                      <p className="text-sm text-text-muted truncate">/{page.slug}</p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium border shrink-0",
                        statusBadge(page.status)
                      )}
                    >
                      {statusLabel(page.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {page.views_count || 0} views
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {page.submissions_count || 0} envios
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); router.push(`/pagecube/${page.id}`); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-hover border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                    {page.status === "published" && (
                      <a
                        href={`/p/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-hover border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, page.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-hover border border-border rounded-lg text-red-400 hover:text-red-300 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-xs text-text-muted mt-3">
                    Criada em {new Date(page.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
