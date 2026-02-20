"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layout,
  Loader2,
  AlertCircle,
  RefreshCw,
  Copy,
  LayoutTemplate,
  ClipboardList,
  FileText,
  Sparkles,
  Globe,
  ShoppingCart,
  FormInput,
  Users,
  CalendarDays,
  Megaphone,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type PageTemplate } from "@/lib/pagecubeApi";

// ============================================================================
// Built-in template suggestions (shown when no API templates exist)
// ============================================================================

interface TemplateSuggestion {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  tags: string[];
}

const TEMPLATE_SUGGESTIONS: TemplateSuggestion[] = [
  {
    id: "landing-lead",
    name: "Captura de Leads",
    description: "Landing page com formulario de captura, hero section, beneficios e CTA. Ideal para campanhas de trafego pago.",
    category: "Landing Page",
    icon: Users,
    tags: ["leads", "formulario", "trafego"],
  },
  {
    id: "landing-event",
    name: "Evento / Webinar",
    description: "Pagina de inscricao para eventos, com countdown timer, agenda, palestrantes e formulario de registro.",
    category: "Evento",
    icon: CalendarDays,
    tags: ["evento", "webinar", "inscricao"],
  },
  {
    id: "checkout-sales",
    name: "Pagina de Vendas",
    description: "Pagina de vendas completa com depoimentos, FAQ, garantia, preco e botao de compra.",
    category: "Vendas",
    icon: ShoppingCart,
    tags: ["vendas", "checkout", "produto"],
  },
  {
    id: "landing-waitlist",
    name: "Lista de Espera",
    description: "Pagina de pre-lancamento com campo de email para lista de espera e contagem regressiva.",
    category: "Pre-lancamento",
    icon: Sparkles,
    tags: ["waitlist", "lancamento", "email"],
  },
  {
    id: "form-survey",
    name: "Pesquisa / Questionario",
    description: "Formulario multi-step com perguntas, selecao de opcoes e envio de dados para o CRM.",
    category: "Formulario",
    icon: FormInput,
    tags: ["pesquisa", "formulario", "dados"],
  },
  {
    id: "landing-institutional",
    name: "Institucional",
    description: "Pagina institucional com sobre nos, equipe, servicos, contato e mapa.",
    category: "Institucional",
    icon: Globe,
    tags: ["institucional", "empresa", "contato"],
  },
];

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

  const navLinks = [
    { href: "/pagecube", label: "Paginas", icon: Layout, active: false },
    { href: "/pagecube/forms", label: "Formularios", icon: ClipboardList, active: false },
    { href: "/pagecube/templates", label: "Templates", icon: LayoutTemplate, active: true },
    { href: "/pagecube/submissions", label: "Submissoes", icon: FileText, active: false },
  ];

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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : templates.length > 0 ? (
            <>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">Templates Salvos</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
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
                      <div className="aspect-video bg-gradient-to-br from-background to-surface-hover flex items-center justify-center">
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
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-text-primary font-medium transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        {creating === tpl.id ? "Criando..." : "Usar Template"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {/* Template suggestions - always shown */}
          <div className="mb-4">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-1">
              {templates.length > 0 ? "Mais Sugestoes" : "Sugestoes de Templates"}
            </h2>
            <p className="text-sm text-text-muted mb-4">
              Modelos recomendados para suas landing pages. Em breve disponiveis para uso direto.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_SUGGESTIONS.map((suggestion) => {
              const IconComponent = suggestion.icon;
              return (
                <div
                  key={suggestion.id}
                  className="bg-surface border border-border rounded-lg overflow-hidden hover:border-primary/20 transition-colors"
                >
                  <div className="aspect-video bg-gradient-to-br from-background to-surface-hover flex items-center justify-center relative">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-background/80 border border-border flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs text-text-muted">{suggestion.category}</span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Em breve
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-text-primary font-semibold mb-1">{suggestion.name}</h3>
                    <p className="text-sm text-text-muted mb-3 line-clamp-2">{suggestion.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {suggestion.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-surface-hover border border-border rounded text-text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface-hover border border-border rounded-lg text-text-muted font-medium cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" />
                      Disponivel em breve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
