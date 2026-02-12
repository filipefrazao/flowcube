"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useKBar } from "kbar";
import {
  Home,
  GitBranch,
  Key,
  History,
  Settings,
  Plus,
  Search,
  MessageSquare,
  User,
  Inbox,
  BarChart3,
  LogOut,
  Smartphone,
  Trophy,
  CreditCard,
  Brain,
  Send,
  Share2,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuthToken } from "@/lib/auth";
import { usePlugins } from "@/hooks/usePlugins";
import type { Plugin } from "@/lib/plugins";

// ============================================================================
// Icon Map: backend icon string -> Lucide component
// ============================================================================

const iconMap: Record<string, LucideIcon> = {
  "home": Home,
  "git-branch": GitBranch,
  "key": Key,
  "history": History,
  "settings": Settings,
  "plus": Plus,
  "search": Search,
  "message-square": MessageSquare,
  "message-circle": Smartphone,
  "user": User,
  "inbox": Inbox,
  "bar-chart-3": BarChart3,
  "log-out": LogOut,
  "smartphone": Smartphone,
  "trophy": Trophy,
  "credit-card": CreditCard,
  "brain": Brain,
  "send": Send,
  "share-2": Share2,
  "puzzle": Puzzle,
};

function getIcon(name: string): LucideIcon {
  return iconMap[name] || Puzzle;
}

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

const coreItems: SidebarItem[] = [
  { icon: <Home className="w-5 h-5" />, label: "Home", href: "/dashboard" },
  { icon: <GitBranch className="w-5 h-5" />, label: "Workflows", href: "/workflows" },
  { icon: <Inbox className="w-5 h-5" />, label: "Conversations", href: "/conversations" },
];

const coreItemsAfterPlugins: SidebarItem[] = [
  { icon: <BarChart3 className="w-5 h-5" />, label: "Analytics", href: "/analytics" },
  { icon: <Key className="w-5 h-5" />, label: "Credentials", href: "/credentials" },
  { icon: <History className="w-5 h-5" />, label: "Executions", href: "/executions" },
];

const bottomItems: SidebarItem[] = [
  { icon: <Settings className="w-5 h-5" />, label: "Settings", href: "/settings" },
];

function pluginToSidebarItem(plugin: Plugin): SidebarItem {
  const IconComponent = getIcon(plugin.icon);
  return {
    icon: <IconComponent className="w-5 h-5" />,
    label: plugin.label,
    href: plugin.frontend_route || "/" + plugin.slug,
  };
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { query } = useKBar();
  const { plugins } = usePlugins();
  const [expanded, setExpanded] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push("/login");
  };

  const pluginItems = plugins.filter(p => p.slug !== "telegram")
    .sort((a, b) => a.menu_position - b.menu_position)
    .map(pluginToSidebarItem);

  const allMainItems = [...coreItems, ...pluginItems, ...coreItemsAfterPlugins];

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        "bg-background-secondary border-r border-border flex flex-col h-screen transition-all duration-200 ease-in-out overflow-hidden flex-shrink-0",
        expanded ? "w-52" : "w-14"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b border-border px-2.5">
        <Link
          href="/workflows"
          className="w-9 h-9 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0"
        >
          <GitBranch className="w-5 h-5 text-white" />
        </Link>
        {expanded && (
          <span className="ml-3 text-sm font-semibold text-text-primary whitespace-nowrap">
            FlowCube
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-2 border-b border-border">
        <Link
          href="/workflows/create"
          className={cn(
            "flex items-center h-10 rounded-lg bg-surface hover:bg-surface-hover transition-colors",
            expanded ? "px-3 gap-3" : "justify-center"
          )}
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          {expanded && (
            <span className="text-sm text-text-secondary whitespace-nowrap">New workflow</span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => query.toggle()}
          className={cn(
            "flex items-center h-10 rounded-lg hover:bg-surface-hover transition-colors w-full mt-1",
            expanded ? "px-3 gap-3" : "justify-center"
          )}
          aria-label="Search"
        >
          <Search className="w-5 h-5 flex-shrink-0" />
          {expanded && (
            <span className="text-sm text-text-secondary whitespace-nowrap">Search</span>
          )}
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {allMainItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center h-10 rounded-lg transition-colors relative",
              expanded ? "px-3 gap-3" : "justify-center",
              isActive(item.href)
                ? "bg-primary-muted text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {expanded && (
              <span className="text-sm whitespace-nowrap truncate">{item.label}</span>
            )}
            {item.badge ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {/* AI */}
      <div className="px-2 py-2 border-t border-border">
        <Link
          href="/ai"
          className={cn(
            "flex items-center h-10 rounded-lg transition-colors",
            expanded ? "px-3 gap-3" : "justify-center",
            isActive("/ai")
              ? "bg-primary-muted text-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          )}
        >
          <MessageSquare className="w-5 h-5 flex-shrink-0" />
          {expanded && (
            <span className="text-sm whitespace-nowrap">AI Chat</span>
          )}
        </Link>
      </div>

      {/* Bottom items */}
      <div className="px-2 py-2 border-t border-border space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center h-10 rounded-lg transition-colors",
              expanded ? "px-3 gap-3" : "justify-center",
              isActive(item.href)
                ? "bg-primary-muted text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {expanded && (
              <span className="text-sm whitespace-nowrap">{item.label}</span>
            )}
          </Link>
        ))}

        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex items-center h-10 rounded-lg transition-colors w-full text-red-500 hover:text-red-600 hover:bg-red-500/10",
            expanded ? "px-3 gap-3" : "justify-center"
          )}
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {expanded && (
            <span className="text-sm whitespace-nowrap">Logout</span>
          )}
        </button>
      </div>

      {/* Profile */}
      <div className="p-2 border-t border-border">
        <Link
          href="/profile"
          className={cn(
            "flex items-center h-10 rounded-lg transition-colors",
            expanded ? "px-2 gap-3" : "justify-center"
          )}
        >
          <div
            className={cn(
              "w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20",
              isActive("/profile") && "ring-2 ring-purple-400/50"
            )}
          >
            <User className="w-5 h-5 text-white" />
          </div>
          {expanded && (
            <span className="text-sm text-text-secondary whitespace-nowrap">Profile</span>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default AppSidebar;
