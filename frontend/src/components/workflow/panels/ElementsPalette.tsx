/**
 * FlowCube 3.0 - Elements Palette
 *
 * Left sidebar with categorized node elements for drag-and-drop
 * Based on Funnellytics/Typebot patterns
 */
import { useState, useMemo, useCallback } from 'react';
import { cn } from '../../../lib/utils';
import { nodeCategories, createNode, getLabelForType } from '../nodes';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Grip
} from 'lucide-react';

interface ElementsPaletteProps {
  onAddNode: (type: string, label: string) => void;
  className?: string;
}

export default function ElementsPalette({ onAddNode, className }: ElementsPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(nodeCategories.map((c) => c.id))
  );

  // Filter nodes based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return nodeCategories;

    const query = searchQuery.toLowerCase();
    return nodeCategories
      .map((category) => ({
        ...category,
        nodes: category.nodes.filter(
          (node) =>
            node.label.toLowerCase().includes(query) ||
            node.type.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.nodes.length > 0);
  }, [searchQuery]);

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Handle drag start for node
  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string, label: string) => {
      event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  // Handle click to add node at center
  const handleAddNode = useCallback(
    (nodeType: string, label: string) => {
      onAddNode(nodeType, label);
    },
    [onAddNode]
  );

  return (
    <div
      className={cn(
        'w-64 bg-white border-r border-gray-200 flex flex-col h-full',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Elements</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.map((category) => (
          <div key={category.id} className="mb-2">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label={`Toggle ${category.label} category`}
            >
              {expandedCategories.has(category.id) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              <span 
                className="flex-1 text-left text-sm font-medium text-gray-700"
                id={`category-${category.id}`}
              >
                {category.label}
              </span>
              <span className="text-xs text-gray-400" aria-label={`${category.nodes.length} items`}>
                {category.nodes.length}
              </span>
            </button>

            {/* Category Nodes */}
            {expandedCategories.has(category.id) && (
              <div 
                className="ml-4 mt-1 space-y-1"
                role="list"
                aria-labelledby={`category-${category.id}`}
              >
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type, node.label)}
                    onClick={() => handleAddNode(node.type, node.label)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab hover:bg-gray-100 transition-colors active:cursor-grabbing"
                    role="listitem"
                    aria-label={`${node.label} - ${category.label} element`}
                  >
                    <Grip className="w-3 h-3 text-gray-300 group-hover:text-gray-400" aria-hidden="true" />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-sm text-gray-600 group-hover:text-gray-900">
                      {node.label}
                    </span>
                    <Plus className="w-4 h-4 text-gray-300 group-hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* No results */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm" role="status">
            No elements found for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Create Custom Element
        </button>
      </div>
    </div>
  );
}
