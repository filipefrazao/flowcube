'use client';
import { useState, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Zap, MessageSquare, GitBranch, Brain,
  Copy, Trash2, Play
} from 'lucide-react';

interface CommandPaletteProps {
  onAddNode?: (type: string) => void;
  onAction?: (action: string) => void;
}

export function CommandPalette({ onAddNode, onAction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setOpen(true);
  }, { enableOnFormTags: true });

  useHotkeys('escape', () => setOpen(false), { enabled: open });

  const commands = [
    {
      id: 'add-trigger',
      label: 'Add Trigger Node',
      icon: Zap,
      category: 'Nodes',
      action: () => onAddNode?.('trigger')
    },
    {
      id: 'add-action',
      label: 'Add Action Node',
      icon: MessageSquare,
      category: 'Nodes',
      action: () => onAddNode?.('action')
    },
    {
      id: 'add-condition',
      label: 'Add Condition Node',
      icon: GitBranch,
      category: 'Nodes',
      action: () => onAddNode?.('condition')
    },
    {
      id: 'add-ai',
      label: 'Add AI Node',
      icon: Brain,
      category: 'AI',
      action: () => onAddNode?.('ai')
    },
    {
      id: 'duplicate',
      label: 'Duplicate Selected',
      icon: Copy,
      category: 'Actions',
      action: () => onAction?.('duplicate')
    },
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: Trash2,
      category: 'Actions',
      action: () => onAction?.('delete')
    },
    {
      id: 'test',
      label: 'Test Workflow',
      icon: Play,
      category: 'Actions',
      action: () => onAction?.('test')
    },
  ];

  const handleSelect = useCallback((command: typeof commands[0]) => {
    command.action();
    setOpen(false);
    setSearch('');
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          <motion.div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[600px] z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Command
              className="rounded-xl bg-background-secondary border border-border shadow-2xl overflow-hidden"
              shouldFilter={false}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="w-5 h-5 text-primary" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search commands or add nodes..."
                  className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted"
                  autoFocus
                />
                <kbd className="px-2 py-1 text-xs bg-surface rounded border border-border text-text-secondary">Esc</kbd>
              </div>

              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-text-muted">
                  No results found.
                </Command.Empty>

                {['Nodes', 'AI', 'Actions'].map(category => (
                  <Command.Group
                    key={category}
                    heading={category}
                    className="text-xs text-primary px-2 py-2 font-semibold"
                  >
                    {commands
                      .filter(cmd => cmd.category === category)
                      .map(command => (
                        <Command.Item
                          key={command.id}
                          value={command.label}
                          onSelect={() => handleSelect(command)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-hover data-[selected=true]:bg-primary/10 transition-colors"
                        >
                          <command.icon className="w-4 h-4 text-primary" />
                          <span className="flex-1 text-text-primary">{command.label}</span>
                        </Command.Item>
                      ))}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
                <span>Navigate with ↑ ↓</span>
                <span>Select with ↵</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
