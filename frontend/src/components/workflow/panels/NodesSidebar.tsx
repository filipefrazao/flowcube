'use client';

import React, { useState } from 'react';
import { 
  Webhook, 
  MessageSquare, 
  Clock, 
  Type, 
  Mail, 
  Phone, 
  List,
  Brain,
  Sparkles,
  Zap,
  GitBranch,
  Variable,
  Timer,
  MessageCircle,
  Image,
  Send,
  ChevronDown,
  ChevronRight,
  Search,
  GripVertical
} from 'lucide-react';
import { BLOCK_DEFINITIONS, BlockType, BlockCategory } from '@/types/workflow.types';

interface NodesSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const categoryIcons: Record<BlockCategory, React.ReactNode> = {
  triggers: <Zap className="w-4 h-4" />,
  inputs: <Type className="w-4 h-4" />,
  ai: <Brain className="w-4 h-4" />,
  logic: <GitBranch className="w-4 h-4" />,
  outputs: <Send className="w-4 h-4" />,
};

const categoryLabels: Record<BlockCategory, string> = {
  triggers: 'Triggers',
  inputs: 'Inputs',
  ai: 'AI / LLM',
  logic: 'Logic',
  outputs: 'Outputs',
};

const categoryColors: Record<BlockCategory, string> = {
  triggers: 'text-amber-400',
  inputs: 'text-blue-400',
  ai: 'text-purple-400',
  logic: 'text-primary',
  outputs: 'text-rose-400',
};

const blockIcons: Record<BlockType, React.ReactNode> = {
  webhook: <Webhook className="w-4 h-4" />,
  whatsapp_trigger: <MessageSquare className="w-4 h-4" />,
  schedule: <Clock className="w-4 h-4" />,
  text_input: <Type className="w-4 h-4" />,
  email_input: <Mail className="w-4 h-4" />,
  phone_input: <Phone className="w-4 h-4" />,
  choice: <List className="w-4 h-4" />,
  openai: <Sparkles className="w-4 h-4" />,
  claude: <Brain className="w-4 h-4" />,
  deepseek: <Zap className="w-4 h-4" />,
  condition: <GitBranch className="w-4 h-4" />,
  set_variable: <Variable className="w-4 h-4" />,
  wait: <Timer className="w-4 h-4" />,
  text_response: <MessageCircle className="w-4 h-4" />,
  image_response: <Image className="w-4 h-4" />,
  whatsapp_template: <Send className="w-4 h-4" />,
};

export function NodesSidebar({ isCollapsed = false, onToggle }: NodesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<BlockCategory>>(
    new Set<BlockCategory>(['triggers', 'inputs', 'ai', 'logic', 'outputs'])
  );

  const toggleCategory = (category: BlockCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const onDragStart = (event: React.DragEvent, blockType: BlockType) => {
    event.dataTransfer.setData('application/flowcube-block', blockType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Group blocks by category
  const blocksByCategory = BLOCK_DEFINITIONS.reduce((acc, block) => {
    if (!acc[block.category]) {
      acc[block.category] = [];
    }
    acc[block.category].push(block);
    return acc;
  }, {} as Record<BlockCategory, typeof BLOCK_DEFINITIONS>);

  // Filter blocks by search
  const filteredBlocksByCategory = Object.entries(blocksByCategory).reduce(
    (acc, [category, blocks]) => {
      const filtered = blocks.filter(
        block =>
          block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          block.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category as BlockCategory] = filtered;
      }
      return acc;
    },
    {} as Record<BlockCategory, typeof BLOCK_DEFINITIONS>
  );

  if (isCollapsed) {
    return (
      <div className="w-12 bg-surface border-r border-border flex flex-col items-center py-4 gap-4">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5 text-text-secondary" />
        </button>
        {Object.entries(categoryIcons).map(([category, icon]) => (
          <div
            key={category}
            className={`p-2 rounded-lg ${categoryColors[category as BlockCategory]}`}
            title={categoryLabels[category as BlockCategory]}
          >
            {icon}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 bg-surface border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Blocks</h2>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 rounded hover:bg-surface-hover transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Block Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(filteredBlocksByCategory).map(([category, blocks]) => (
          <div key={category} className="mb-2">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category as BlockCategory)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-hover/50 transition-colors"
            >
              <span className={categoryColors[category as BlockCategory]}>
                {categoryIcons[category as BlockCategory]}
              </span>
              <span className="text-sm font-medium text-text-primary flex-1 text-left">
                {categoryLabels[category as BlockCategory]}
              </span>
              <span className="text-xs text-text-muted">{blocks.length}</span>
              {expandedCategories.has(category as BlockCategory) ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {/* Block Items */}
            {expandedCategories.has(category as BlockCategory) && (
              <div className="mt-1 space-y-1">
                {blocks.map((block) => (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, block.type)}
                    className="flex items-center gap-2 px-3 py-2 ml-2 rounded-lg bg-surface/30 hover:bg-surface-hover/60 cursor-grab active:cursor-grabbing transition-colors group"
                  >
                    <GripVertical className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className={categoryColors[block.category]}>
                      {blockIcons[block.type]}
                    </span>
                    <span className="text-sm text-text-primary">{block.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(filteredBlocksByCategory).length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">No blocks found</p>
          </div>
        )}
      </div>

      {/* Help Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-text-muted text-center">
          Drag blocks to the canvas
        </p>
      </div>
    </div>
  );
}

export default NodesSidebar;
