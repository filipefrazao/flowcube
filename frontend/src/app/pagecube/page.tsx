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
  Globe,
  BarChart3,
  CheckCircle2,
  XCircle,
  Server,
  ShoppingCart,
  GraduationCap,
  Trophy,
  FormInput,
  Megaphone,
  RefreshCw,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type Page } from "@/lib/pagecubeApi";
import { cn } from "@/lib/utils";

// ============================================================================
// Active Hetzner Sites (hardcoded registry)
// ============================================================================

interface ActiveSite {
  id: string;
  name: string;
  description: string;
  url: string;
  domain: string;
  status: "active" | "inactive" | "maintenance";
  category: "landing" | "app" | "checkout" | "education" | "forms" | "infra";
  icon: any;
  containerName: string;
  lastDeployed?: string;
  stack?: string;
}

const ACTIVE_SITES: ActiveSite[] = [
  {
    id: "itg-conquest",
    name: "ITG Conquest",
    description: "Landing page e plataforma de vendas do programa ITG",
    url: "https://itg.frzgroup.com.br",
    domain: "itg.frzgroup.com.br",
    status: "active",
    category: "landing",
    icon: Trophy,
    containerName: "itg-conquest",
    stack: "Next.js + Django",
  },
  {
    id: "frzpay",
    name: "FRZPay",
    description: "Checkout e pagamentos - plataforma de cobranca",
    url: "https://pay.frzgroup.com.br",
    domain: "pay.frzgroup.com.br",
    status: "active",
    category: "checkout",
    icon: ShoppingCart,
    containerName: "frzpay-frontend",
    stack: "Next.js + Django",
  },
  {
    id: "minicube",
    name: "MiniCube",
    description: "Plataforma educacional - gestao de turmas e alunos",
    url: "https://mc.frzgroup.com.br",
    domain: "mc.frzgroup.com.br",
    status: "active",
    category: "education",
    icon: GraduationCap,
    containerName: "minicube-web",
    stack: "Django + Celery",
  },
  {
    id: "tce-vitoria",
    name: "TCE Vitoria",
    description: "Landing page do evento TCE em Vitoria",
    url: "https://tce.frzgroup.com.br",
    domain: "tce.frzgroup.com.br",
    status: "active",
    category: "landing",
    icon: Megaphone,
    containerName: "tce-vitoria-lp",
    stack: "Static/Next.js",
  },
  {
    id: "bhp-v1",
    name: "BHP v1",
    description: "Landing page BHP - Bussiness High Performance",
    url: "https://bhpv1.frzgroup.com.br",
    domain: "bhpv1.frzgroup.com.br",
    status: "active",
    category: "landing",
    icon: Megaphone,
    containerName: "bhp-lp",
    stack: "Static/Next.js",
  },
  {
    id: "icp-forms",
    name: "ICP Forms",
    description: "Formularios de captura de leads - ICP (Ideal Customer Profile)",
    url: "https://forms.frzgroup.com.br",
    domain: "forms.frzgroup.com.br",
    status: "active",
    category: "forms",
    icon: FormInput,
    containerName: "icp-forms",
    stack: "Static/Next.js",
  },
  {
    id: "salescube-dev",
    name: "SalesCube DEV",
    description: "Ambiente de desenvolvimento do SalesCube CRM",
    url: "https://sc.frzgroup.com.br",
    domain: "sc.frzgroup.com.br",
    status: "active",
    category: "app",
    icon: Server,
    containerName: "salescube-frontend",
    stack: "Next.js + Django",
  },
];

function statusBadge(status: string) {
  switch (status) {
    case "published":
    case "active":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "draft":
    case "maintenance":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "archived":
    case "inactive":
      return "bg-gray-500/15 text-text-secondary border-gray-500/30";
    default:
      return "bg-gray-500/15 text-text-primary border-gray-500/30";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "published":
      return "Publicada";
    case "draft":
      return "Rascunho";
    case "archived":
      return "Arquivada";
    case "active":
      return "Ativo";
    case "inactive":
      return "Inativo";
    case "maintenance":
      return "Manutencao";
    default:
      return status;
  }
}

function categoryLabel(category: string) {
  switch (category) {
    case "landing":
      return "Landing Page";
    case "app":
      return "Aplicacao";
    case "checkout":
      return "Checkout";
    case "education":
      return "Educacao";
    case "forms":
      return "Formularios";
    case "infra":
      return "Infraestrutura";
    default:
      return category;
  }
}

function categoryColor(category: string) {
  switch (category) {
    case "landing":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "app":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "checkout":
      return "bg-emerald-500/15 text-primary border-primary/30";
    case "education":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "forms":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    case "infra":
      return "bg-gray-500/15 text-text-secondary border-gray-500/30";
    default:
      return "bg-gray-500/15 text-text-primary border-gray-500/30";
  }
}

export default function PageCubePage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"sites" | "pages">("sites");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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

  const categories = ["all", "landing", "app", "checkout", "education", "forms"];
  const filteredSites =
    categoryFilter === "all"
      ? ACTIVE_SITES
      : ACTIVE_SITES.filter((s) => s.category === categoryFilter);

  const activeSiteCount = ACTIVE_SITES.filter((s) => s.status === "active").length;

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">PageCube</h1>
            <p className="text-sm text-text-muted">
              Landing pages, sites e formularios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-text-primary font-medium transition-colors"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Nova Pagina
            </button>
          </div>
        </header>

        {/* Sub-navigation */}
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
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-green-400" />
                <span className="text-sm text-text-muted">Sites Ativos</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{activeSiteCount}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Layout className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-text-muted">Paginas Criadas</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{pages.length}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-text-muted">Landing Pages</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {ACTIVE_SITES.filter((s) => s.category === "landing").length}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-text-muted">Aplicacoes</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">
                {ACTIVE_SITES.filter((s) => s.category === "app" || s.category === "checkout" || s.category === "education").length}
              </p>
            </div>
          </div>

          {/* Tab switcher: Active Sites vs PageCube Pages */}
          <div className="flex items-center gap-1 mb-4 bg-surface border border-border rounded-lg p-1 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("sites")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "sites"
                  ? "bg-primary text-gray-900"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Globe className="w-4 h-4" />
              Sites Ativos ({ACTIVE_SITES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pages")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "pages"
                  ? "bg-primary text-gray-900"
                  : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Layout className="w-4 h-4" />
              Paginas PageCube ({pages.length})
            </button>
          </div>

          {/* ============================================================== */}
          {/* Tab: Active Sites                                               */}
          {/* ============================================================== */}
          {activeTab === "sites" && (
            <>
              {/* Category filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      categoryFilter === cat
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-surface border-border text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {cat === "all" ? "Todos" : categoryLabel(cat)}
                    {cat !== "all" && (
                      <span className="ml-1 opacity-60">
                        ({ACTIVE_SITES.filter((s) => s.category === cat).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSites.map((site) => {
                  const IconComponent = site.icon;
                  return (
                    <div
                      key={site.id}
                      className="bg-surface border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-all group"
                    >
                      {/* Thumbnail / Preview area */}
                      <div className="aspect-[16/9] bg-gradient-to-br from-background to-surface-hover flex items-center justify-center relative overflow-hidden">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 rounded-xl bg-background/80 border border-border flex items-center justify-center">
                            <IconComponent className="w-7 h-7 text-primary" />
                          </div>
                          <span className="text-xs text-text-muted font-mono">{site.domain}</span>
                        </div>
                        {/* Status indicator */}
                        <div className="absolute top-3 right-3">
                          <span
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                              statusBadge(site.status)
                            )}
                          >
                            {site.status === "active" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {statusLabel(site.status)}
                          </span>
                        </div>
                        {/* Category tag */}
                        <div className="absolute top-3 left-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium border",
                              categoryColor(site.category)
                            )}
                          >
                            {categoryLabel(site.category)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h3 className="text-text-primary font-semibold truncate">{site.name}</h3>
                            <p className="text-sm text-text-muted line-clamp-2 mt-0.5">{site.description}</p>
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-3 mb-4">
                          {site.stack && (
                            <span className="flex items-center gap-1">
                              <Server className="w-3 h-3" />
                              {site.stack}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Container: {site.containerName}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover rounded-lg text-text-primary text-sm font-medium transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Visitar
                          </a>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(site.url);
                            }}
                            className="flex items-center gap-1 px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-secondary hover:text-text-primary text-sm transition-colors"
                            title="Copiar URL"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ============================================================== */}
          {/* Tab: PageCube Pages (dynamic, from API)                         */}
          {/* ============================================================== */}
          {activeTab === "pages" && (
            <>
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
                  <h3 className="text-text-secondary font-medium mb-1">
                    Nenhuma pagina criada no PageCube
                  </h3>
                  <p className="text-text-muted text-sm mb-4 max-w-md">
                    Crie landing pages diretamente no PageCube com o editor visual.
                    <br />
                    Os sites ativos do Hetzner estao na aba "Sites Ativos".
                  </p>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-text-primary font-medium transition-colors"
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
                          <h3 className="text-text-primary font-semibold truncate">
                            {page.title}
                          </h3>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/pagecube/${page.id}`);
                          }}
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
                        Criada em{" "}
                        {new Date(page.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
