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
  },
  {
    id: "chatcube",
    label: "ChatCube",
    icon: MessageSquare,
    children: [
      { label: "Instancias", href: "/chatcube" },
      { label: "Conversas", href: "/chatcube/conversations" },
      { label: "Contatos", href: "/chatcube/contacts" },
      { label: "Grupos", href: "/chatcube/groups" },
      { label: "Templates", href: "/chatcube/templates" },
      { label: "Campanhas", href: "/chatcube/campaigns" },
    ],
  },
  {
    id: "salescube",
    label: "SalesCube",
    icon: Kanban,
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
    children: [
      { label: "Agentes", href: "/cubeai/agents" },
      { label: "Conhecimentos", href: "/cubeai/knowledge" },
    ],
  },
  {
    id: "flowcube",
    label: "FlowCube",
    icon: GitBranch,
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
    href: "/pagecube",
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
    href: "/socialcube",
  },
  {
    id: "reports",
    label: "Relatorios",
    icon: FileText,
    children: [
      { label: "Lead Febracis", href: "/reports/lead-febracis" },
      { label: "Lead Fit", href: "/reports/lead-fit" },
      { label: "Curva ABC", href: "/reports/curva-abc" },
      { label: "Lead Vitta", href: "/reports/lead-vitta" },
    ],
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
        const isActive = section.children.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"));
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
        "bg-gray-900 border-r border-gray-800 flex flex-col h-screen transition-all duration-200 ease-in-out overflow-hidden flex-shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between border-b border-gray-800 px-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">FP</span>
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-gray-100 whitespace-nowrap">
              FRZ Platform
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-100 transition-colors p-1"
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
      <div className="p-2 border-b border-gray-800">
        <button
          type="button"
          onClick={() => query.toggle()}
          className={cn(
            "flex items-center h-9 rounded-lg hover:bg-gray-800 transition-colors w-full text-gray-400 hover:text-gray-100",
            collapsed ? "justify-center" : "px-3 gap-3"
          )}
          aria-label="Search"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm whitespace-nowrap">Buscar... <kbd className="ml-auto text-[10px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">⌘K</kbd></span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = isSectionActive(section);
          const expanded = expandedSections.has(section.id);
          const hasChildren = !!section.children;

          return (
            <div key={section.id}>
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
                    "flex items-center w-full h-9 rounded-lg transition-colors",
                    collapsed ? "justify-center" : "px-3 gap-3",
                    active
                      ? "bg-indigo-600/20 text-indigo-400"
                      : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="text-sm whitespace-nowrap flex-1 text-left">{section.label}</span>
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      )}
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={section.href || "/"}
                  className={cn(
                    "flex items-center h-9 rounded-lg transition-colors",
                    collapsed ? "justify-center" : "px-3 gap-3",
                    active
                      ? "bg-indigo-600/20 text-indigo-400"
                      : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm whitespace-nowrap">{section.label}</span>
                  )}
                </Link>
              )}

              {/* Children */}
              {hasChildren && expanded && !collapsed && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-800 pl-3">
                  {section.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "flex items-center h-8 rounded-lg px-3 text-sm transition-colors",
                        isActive(child.href)
                          ? "text-indigo-400 bg-indigo-600/10"
                          : "text-gray-500 hover:text-gray-100 hover:bg-gray-800"
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

      {/* Bottom */}
      <div className="px-2 py-2 border-t border-gray-800 space-y-1">
        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex items-center h-9 rounded-lg transition-colors w-full text-red-500 hover:text-red-400 hover:bg-red-500/10",
            collapsed ? "justify-center" : "px-3 gap-3"
          )}
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm whitespace-nowrap">Sair</span>}
        </button>

        {/* Profile */}
        <Link
          href="/profile"
          className={cn(
            "flex items-center h-10 rounded-lg transition-colors",
            collapsed ? "justify-center" : "px-2 gap-3",
            isActive("/profile")
              ? "bg-indigo-600/20 text-indigo-400"
              : "text-gray-400 hover:text-gray-100"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-sm text-gray-300 whitespace-nowrap">Perfil</span>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default AppSidebar;
