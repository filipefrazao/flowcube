'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Puzzle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuthToken } from '@/lib/auth';
import { usePlugins } from '@/hooks/usePlugins';
import type { Plugin } from '@/lib/plugins';

// ============================================================================
// Icon Map: backend icon string -> Lucide component
// ============================================================================

const iconMap: Record<string, LucideIcon> = {
  'home': Home,
  'git-branch': GitBranch,
  'key': Key,
  'history': History,
  'settings': Settings,
  'plus': Plus,
  'search': Search,
  'message-square': MessageSquare,
  'message-circle': Smartphone,
  'user': User,
  'inbox': Inbox,
  'bar-chart-3': BarChart3,
  'log-out': LogOut,
  'smartphone': Smartphone,
  'trophy': Trophy,
  'credit-card': CreditCard,
  'brain': Brain,
  'send': Send,
  'puzzle': Puzzle,
};

function getIcon(name: string): LucideIcon {
  return iconMap[name] || Puzzle;
}

// ============================================================================
// Types
// ============================================================================

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

// ============================================================================
// Core items (always visible, not from plugins API)
// ============================================================================

const coreItems: SidebarItem[] = [
  { icon: <Home className="w-5 h-5" />, label: 'Home', href: '/dashboard' },
  { icon: <GitBranch className="w-5 h-5" />, label: 'Workflows', href: '/workflows' },
  { icon: <Inbox className="w-5 h-5" />, label: 'Conversations', href: '/conversations' },
];

const coreItemsAfterPlugins: SidebarItem[] = [
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', href: '/analytics' },
  { icon: <Key className="w-5 h-5" />, label: 'Credentials', href: '/credentials' },
  { icon: <History className="w-5 h-5" />, label: 'Executions', href: '/executions' },
];

const bottomItems: SidebarItem[] = [
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/settings' },
];

// ============================================================================
// Helper: convert Plugin -> SidebarItem
// ============================================================================

function pluginToSidebarItem(plugin: Plugin): SidebarItem {
  const IconComponent = getIcon(plugin.icon);
  return {
    icon: <IconComponent className="w-5 h-5" />,
    label: plugin.label,
    href: plugin.frontend_route || '/' + plugin.slug,
  };
}

// ============================================================================
// AppSidebar Component
// ============================================================================

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { plugins } = usePlugins();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  // Convert plugins to sidebar items, sorted by menu_position
  const pluginItems = plugins
    .sort((a, b) => a.menu_position - b.menu_position)
    .map(pluginToSidebarItem);

  // Build full nav: core top -> plugins -> core bottom
  const allMainItems = [...coreItems, ...pluginItems, ...coreItemsAfterPlugins];

  return (
    <aside className="w-14 bg-background-secondary border-r border-border flex flex-col h-screen">
      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b border-border">
        <Link href="/workflows" className="w-9 h-9 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
          <GitBranch className="w-5 h-5 text-white" />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-b border-border">
        <Link
          href="/workflows/create"
          className="sidebar-icon w-full h-10 bg-surface hover:bg-surface-hover"
          title="Create new workflow"
        >
          <Plus className="w-5 h-5" />
        </Link>
        <button
          className="sidebar-icon w-full h-10 mt-1"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation (Core + Plugins) */}
      <nav className="flex-1 py-2 px-2 space-y-1">
        {allMainItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'sidebar-icon w-full relative',
              isActive(item.href) && 'active'
            )}
            title={item.label}
          >
            {item.icon}
            {item.badge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Chat / AI Assistant */}
      <div className="px-2 py-2 border-t border-border">
        <button
          className="sidebar-icon w-full"
          title="AI Assistant"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="px-2 py-2 border-t border-border space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'sidebar-icon w-full relative',
              isActive(item.href) && 'active'
            )}
            title={item.label}
          >
            {item.icon}
          </Link>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="sidebar-icon w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile */}
      <div className="p-2 border-t border-border">
        <button
          className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mx-auto transition-colors shadow-lg shadow-purple-500/20"
          title="Profile"
        >
          <User className="w-5 h-5 text-white" />
        </button>
      </div>
    </aside>
  );
}

export default AppSidebar;
