'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  GitBranch,
  Key,
  History,
  Database,
  Settings,
  HelpCircle,
  Plus,
  Search,
  MessageSquare,
  Bell,
  User,
  Inbox,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

const mainItems: SidebarItem[] = [
  { icon: <Home className="w-5 h-5" />, label: 'Home', href: '/dashboard' },
  { icon: <GitBranch className="w-5 h-5" />, label: 'Workflows', href: '/workflows' },
  { icon: <Inbox className="w-5 h-5" />, label: 'Conversations', href: '/conversations', badge: 3 },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', href: '/analytics' },
  { icon: <Key className="w-5 h-5" />, label: 'Credentials', href: '/credentials' },
  { icon: <History className="w-5 h-5" />, label: 'Executions', href: '/executions' },
];

const bottomItems: SidebarItem[] = [
  { icon: <Bell className="w-5 h-5" />, label: 'Notifications', href: '/notifications' },
  { icon: <HelpCircle className="w-5 h-5" />, label: 'Help', href: '/help' },
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/settings' },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
    return pathname.startsWith(href);
  };

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
          href="/workflows/new"
          className="sidebar-icon w-full h-10 bg-surface hover:bg-surface-hover"
          title="Create new workflow"
        >
          <Plus className="w-5 h-5" />
        </Link>
        <button
          className="sidebar-icon w-full h-10 mt-1"
          title="Search (Ctrl+K)"
          onClick={() => {
            // Trigger kbar
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-1">
        {mainItems.map((item) => (
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
            {item.badge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
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
