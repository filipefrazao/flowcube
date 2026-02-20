"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useKBar } from "kbar";
import {
  LayoutDashboard,
  MessageSquare,
  Kanban,
  GraduationCap,
  Brain,
  GitBranch,
  Layout,
  BarChart3,
  Share2,
  FileText,
  Settings,
  LogOut,
  User,
  Search,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuthToken } from "@/lib/auth";

// ============================================================================
// Types
// ============================================================================

interface SubItem {
  label: string;
  href: string;
}

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: SubItem[];
  groupLabel?: string; // Displays a section separator above this item
}

// ============================================================================
// Sidebar Configuration
// ============================================================================

const sections: SidebarSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    groupLabel: "Aplicação",
  },
  {
    id: "chatcube",
    label: "ChatCube",
    icon: MessageSquare,
    groupLabel: "Atendimento",
    children: [
      { label: "Instancias", href: "/chatcube" },
      { label: "Conversas", href: "/chatcube/conversations" },
      { label: "Contatos", href: "/chatcube/contacts" },
      { label: "Grupos", href: "/chatcube/groups" },
      { label: "Templates", href: "/chatcube/templates" },
      { label: "Campanhas", href: "/chatcube/campaigns" },
      { label: "Telefonia", href: "/chatcube/telephony" },
    ],
  },
  {
    id: "salescube",
    label: "SalesCube",
    icon: Kanban,
    groupLabel: "CRM",
    children: [
      { label: "Quadro", href: "/salescube" },
      { label: "Leads", href: "/salescube/leads" },
      { label: "Tarefas", href: "/salescube/tasks" },
      { label: "Produtos", href: "/salescube/products" },
      { label: "Categorias", href: "/salescube/categories" },
      { label: "Vendas", href: "/salescube/sales" },
      { label: "Financeiro", href: "/salescube/financial" },
    ],
  },
  {
    id: "minicube",
    label: "MiniCube",
    icon: GraduationCap,
    groupLabel: "Educação",
    children: [
      { label: "Turmas", href: "/minicube/turmas" },
      { label: "Clientes", href: "/minicube/clientes" },
      { label: "Polos", href: "/minicube/polos" },
      { label: "Flows", href: "/minicube/flows" },
      { label: "Blocos", href: "/minicube/blocos" },
    ],
  },
  {
    id: "cubeai",
    label: "Cube AI",
    icon: Brain,
    groupLabel: "Inteligência Artificial",
    children: [
      { label: "Agentes", href: "/cubeai/agents" },
      { label: "Conhecimentos", href: "/cubeai/knowledge" },
    ],
  },
  {
    id: "flowcube",
    label: "FlowCube",
    icon: GitBranch,
    groupLabel: "Automação",
    children: [
      { label: "Workflows", href: "/workflows" },
      { label: "Credenciais", href: "/credentials" },
      { label: "Execucoes", href: "/executions" },
    ],
  },
  {
    id: "pagecube",
    label: "PageCube",
    icon: Layout,
    groupLabel: "Conteúdo",
    children: [
      { label: "Páginas", href: "/pagecube" },
      { label: "Templates", href: "/pagecube/templates" },
      { label: "Formulários", href: "/pagecube/forms" },
      { label: "Submissões", href: "/pagecube/submissions" },
    ],
  },
  {
    id: "funnelcube",
    label: "FunnelCube",
    icon: BarChart3,
    href: "/funnelcube",
  },
  {
    id: "socialcube",
    label: "SocialCube",
    icon: Share2,
    children: [
      { label: "Dashboard", href: "/socialcube" },
      { label: "Contas", href: "/socialcube/accounts" },
      { label: "Calendário", href: "/socialcube/calendar" },
      { label: "Publicar", href: "/socialcube/posts/new" },
      { label: "Analytics", href: "/socialcube/analytics" },
      { label: "Concorrentes", href: "/socialcube/competitors" },
      { label: "Smart Links", href: "/socialcube/smartlinks" },
      { label: "Lead Ads", href: "/socialcube/leadads" },
    ],
  },
  {
    id: "reports",
    label: "Relatorios",
    icon: FileText,
    groupLabel: "Analytics",
    children: [
      { label: "Lead Febracis", href: "/reports/lead-febracis" },
      { label: "Lead Fit", href: "/reports/lead-fit" },
      { label: "Curva ABC", href: "/reports/curva-abc" },
      { label: "Lead Vitta", href: "/reports/lead-vitta" },
    ],
  },
  {
    id: "achievements",
    label: "Conquistas",
    icon: Trophy,
    href: "/achievements",
    groupLabel: "Sistema",
  },
  {
    id: "settings",
    label: "Configuracoes",
    icon: Settings,
    children: [
      { label: "Usuarios", href: "/settings" },
      { label: "Grupos", href: "/settings/groups" },
      { label: "Unidades", href: "/settings/units" },
      { label: "Squads", href: "/settings/squads" },
      { label: "Tags", href: "/settings/tags" },
      { label: "Integracoes", href: "/settings/integrations" },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { query } = useKBar();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Auto-expand section based on current pathname
  useEffect(() => {
    for (const section of sections) {
      if (section.children) {
        const isActive = section.children.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + "/")
        );
        if (isActive) {
          setExpandedSections((prev) => {
            const next = new Set(prev);
            next.add(section.id);
            return next;
          });
        }
      }
    }
  }, [pathname]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isSectionActive = (section: SidebarSection) => {
    if (section.href) return isActive(section.href);
    if (section.children) return section.children.some((c) => isActive(c.href));
    return false;
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen transition-all duration-200 ease-in-out overflow-hidden flex-shrink-0",
        "bg-background-secondary border-r border-border",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between border-b border-border px-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary">
            <span className="text-text-primary font-bold text-xs">FP</span>
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-text-primary whitespace-nowrap truncate">
              FRZ Platform
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-text-muted hover:text-text-primary transition-colors p-1 flex-shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-border flex-shrink-0">
        <button
          type="button"
          onClick={() => query.toggle()}
          className={cn(
            "flex items-center h-8 rounded-md hover:bg-surface-hover transition-colors w-full text-text-muted hover:text-text-secondary",
            collapsed ? "justify-center" : "px-2.5 gap-2"
          )}
          aria-label="Search"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xs whitespace-nowrap flex-1 text-left">
              Pesquisar menu...{" "}
              <kbd className="ml-1 text-[9px] bg-surface px-1 py-0.5 rounded border border-border">⌘K</kbd>
            </span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-1 px-2 overflow-y-auto overflow-x-hidden">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = isSectionActive(section);
          const expanded = expandedSections.has(section.id);
          const hasChildren = !!section.children;

          return (
            <div key={section.id}>
              {/* Group label separator */}
              {!collapsed && section.groupLabel && (
                <div className="mt-4 mb-1 px-2 first:mt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted select-none">
                    {section.groupLabel}
                  </span>
                </div>
              )}

              {/* Section header */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      setExpandedSections((prev) => {
                        const next = new Set(prev);
                        next.add(section.id);
                        return next;
                      });
                    } else {
                      toggleSection(section.id);
                    }
                  }}
                  className={cn(
                    "flex items-center w-full h-8 rounded-md transition-colors",
                    collapsed ? "justify-center" : "px-2.5 gap-2.5",
                    active
                      ? "text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="text-sm whitespace-nowrap flex-1 text-left font-medium">
                        {section.label}
                      </span>
                      {expanded ? (
                        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
                      )}
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={section.href || "/"}
                  className={cn(
                    "flex items-center h-8 rounded-md transition-colors",
                    collapsed ? "justify-center" : "px-2.5 gap-2.5",
                    active
                      ? "text-primary bg-primary/10"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm whitespace-nowrap font-medium">{section.label}</span>
                  )}
                </Link>
              )}

              {/* Children */}
              {hasChildren && expanded && !collapsed && (
                <div className="ml-3 mt-0.5 mb-1 border-l border-border pl-3 space-y-0.5">
                  {section.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "flex items-center h-7 rounded-md px-2 text-sm transition-colors",
                        isActive(child.href)
                          ? "text-primary bg-primary/10 font-medium"
                          : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-border space-y-0.5 flex-shrink-0">
        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex items-center h-8 rounded-md transition-colors w-full text-red-500 hover:text-red-400 hover:bg-red-500/10",
            collapsed ? "justify-center" : "px-2.5 gap-2.5"
          )}
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>

        {/* Profile */}
        <Link
          href="/profile"
          className={cn(
            "flex items-center rounded-md transition-colors",
            collapsed ? "h-10 justify-center" : "h-12 px-2 gap-2.5",
            isActive("/profile") ? "bg-primary/10" : "hover:bg-surface-hover"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-text-primary truncate">Filipe Frazão</div>
              <div className="text-[10px] text-text-muted truncate">filipefrazao@frzgroup.com.br</div>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default AppSidebar;
