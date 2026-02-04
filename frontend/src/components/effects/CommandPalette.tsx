/**
 * FlowCube Premium - Command Palette
 *
 * VS Code / Notion style command palette using kbar
 * Accessible with Cmd+K / Ctrl+K
 */
'use client';

import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
  Action,
  ActionImpl,
} from 'kbar';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Home,
  Plus,
  Settings,
  Search,
  FileText,
  Trash2,
  Copy,
  Save,
  Play,
  Pause,
  Upload,
  Download,
  Moon,
  Sun,
  HelpCircle,
  LogOut,
  MessageSquare,
  BarChart3,
  Users,
  Zap,
  Bot,
  Webhook,
} from 'lucide-react';
import { ReactNode } from 'react';

interface CommandPaletteProviderProps {
  children: ReactNode;
  onThemeToggle?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onNewWorkflow?: () => void;
}

// Define actions
const createActions = (
  router: ReturnType<typeof useRouter>,
  callbacks: {
    onThemeToggle?: () => void;
    onSave?: () => void;
    onExport?: () => void;
    onNewWorkflow?: () => void;
  }
): Action[] => [
  // Navigation
  {
    id: 'home',
    name: 'Go to Dashboard',
    shortcut: ['g', 'h'],
    keywords: 'home dashboard',
    icon: <Home className="w-4 h-4" />,
    section: 'Navigation',
    perform: () => router.push('/dashboard'),
  },
  {
    id: 'workflows',
    name: 'View Workflows',
    shortcut: ['g', 'w'],
    keywords: 'workflows list flows',
    icon: <FileText className="w-4 h-4" />,
    section: 'Navigation',
    perform: () => router.push('/workflows'),
  },
  {
    id: 'conversations',
    name: 'View Conversations',
    shortcut: ['g', 'c'],
    keywords: 'chat messages inbox',
    icon: <MessageSquare className="w-4 h-4" />,
    section: 'Navigation',
    perform: () => router.push('/conversations'),
  },
  {
    id: 'analytics',
    name: 'View Analytics',
    shortcut: ['g', 'a'],
    keywords: 'stats metrics charts',
    icon: <BarChart3 className="w-4 h-4" />,
    section: 'Navigation',
    perform: () => router.push('/analytics'),
  },
  {
    id: 'settings',
    name: 'Settings',
    shortcut: ['g', 's'],
    keywords: 'settings preferences config',
    icon: <Settings className="w-4 h-4" />,
    section: 'Navigation',
    perform: () => router.push('/settings'),
  },

  // Actions
  {
    id: 'new-workflow',
    name: 'Create New Workflow',
    shortcut: ['n'],
    keywords: 'new create workflow flow',
    icon: <Plus className="w-4 h-4" />,
    section: 'Actions',
    perform: callbacks.onNewWorkflow,
  },
  {
    id: 'save',
    name: 'Save Workflow',
    shortcut: ['Meta+s'],
    keywords: 'save',
    icon: <Save className="w-4 h-4" />,
    section: 'Actions',
    perform: callbacks.onSave,
  },
  {
    id: 'export',
    name: 'Export Workflow',
    shortcut: ['Meta+e'],
    keywords: 'export download json',
    icon: <Download className="w-4 h-4" />,
    section: 'Actions',
    perform: callbacks.onExport,
  },

  // Add Nodes
  {
    id: 'add-node',
    name: 'Add Node...',
    keywords: 'add node element',
    icon: <Zap className="w-4 h-4" />,
    section: 'Add Elements',
  },
  {
    id: 'add-trigger',
    name: 'Add WhatsApp Trigger',
    keywords: 'whatsapp trigger start',
    icon: <MessageSquare className="w-4 h-4" />,
    parent: 'add-node',
  },
  {
    id: 'add-ai',
    name: 'Add AI Node',
    keywords: 'ai gpt claude llm',
    icon: <Bot className="w-4 h-4" />,
    parent: 'add-node',
  },
  {
    id: 'add-webhook',
    name: 'Add Webhook',
    keywords: 'webhook api http',
    icon: <Webhook className="w-4 h-4" />,
    parent: 'add-node',
  },

  // Appearance
  {
    id: 'toggle-theme',
    name: 'Toggle Dark/Light Mode',
    shortcut: ['Meta+Shift+d'],
    keywords: 'theme dark light mode appearance',
    icon: <Moon className="w-4 h-4" />,
    section: 'Appearance',
    perform: callbacks.onThemeToggle,
  },

  // Help
  {
    id: 'help',
    name: 'Help & Documentation',
    shortcut: ['?'],
    keywords: 'help docs documentation',
    icon: <HelpCircle className="w-4 h-4" />,
    section: 'Help',
    perform: () => window.open('https://docs.flowcube.io', '_blank'),
  },
];

// Results component with styling
function RenderResults() {
  const { results } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {item}
          </div>
        ) : (
          <div
            className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
              active ? 'bg-purple-500/10 text-white' : 'text-gray-300'
            }`}
          >
            <span className="text-gray-400">{item.icon}</span>
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              {item.subtitle && (
                <div className="text-xs text-gray-500">{item.subtitle}</div>
              )}
            </div>
            {item.shortcut?.length ? (
              <div className="flex gap-1">
                {item.shortcut.map((sc) => (
                  <kbd
                    key={sc}
                    className="px-2 py-1 text-xs font-mono bg-gray-800 rounded border border-gray-700"
                  >
                    {sc}
                  </kbd>
                ))}
              </div>
            ) : null}
          </div>
        )
      }
    />
  );
}

// Main provider component
export function CommandPaletteProvider({
  children,
  onThemeToggle,
  onSave,
  onExport,
  onNewWorkflow,
}: CommandPaletteProviderProps) {
  const router = useRouter();

  const actions = createActions(router, {
    onThemeToggle,
    onSave,
    onExport,
    onNewWorkflow,
  });

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <KBarAnimator className="w-full max-w-xl overflow-hidden rounded-xl bg-gray-900 border border-gray-700 shadow-2xl">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
                <Search className="w-5 h-5 text-gray-500" />
                <KBarSearch
                  className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 outline-none"
                  placeholder="Type a command or search..."
                />
                <kbd className="px-2 py-1 text-xs font-mono bg-gray-800 text-gray-400 rounded border border-gray-700">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                <RenderResults />
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
                <div className="flex gap-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>esc Close</span>
                </div>
                <span className="text-purple-400">FlowCube Command Palette</span>
              </div>
            </KBarAnimator>
          </motion.div>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
}

// Hook to trigger command palette
export function useCommandPalette() {
  // This would be implemented with kbar's useKBar hook
  return {
    toggle: () => {
      // kbar handles Cmd+K automatically
    },
  };
}

export default CommandPaletteProvider;
