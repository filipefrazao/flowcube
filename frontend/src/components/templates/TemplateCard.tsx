/**
 * FlowCube - Template Card Component
 *
 * Card for displaying a workflow template in the gallery grid.
 */
"use client";

import { cn } from "@/lib/utils";
import {
  Zap, Globe, Bot, MessageSquare, Mail, GitBranch,
  Clock, ArrowRight, Eye
} from "lucide-react";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  node_count: number;
  tags: string[];
  graph: any;
  usage_count?: number;
  created_at?: string;
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onPreview: (template: WorkflowTemplate) => void;
  onUse: (template: WorkflowTemplate) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  marketing: <Mail className="w-4 h-4" />,
  sales: <Zap className="w-4 h-4" />,
  support: <MessageSquare className="w-4 h-4" />,
  integration: <Globe className="w-4 h-4" />,
  ai: <Bot className="w-4 h-4" />,
  automation: <GitBranch className="w-4 h-4" />,
  scheduling: <Clock className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "bg-purple-900/20 text-purple-400 border-purple-800",
  sales: "bg-green-900/20 text-green-400 border-green-800",
  support: "bg-blue-900/20 text-blue-400 border-blue-800",
  integration: "bg-amber-900/20 text-amber-400 border-amber-800",
  ai: "bg-pink-900/20 text-pink-400 border-pink-800",
  automation: "bg-cyan-900/20 text-cyan-400 border-cyan-800",
  scheduling: "bg-orange-900/20 text-orange-400 border-orange-800",
};

export default function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  const categoryColor = CATEGORY_COLORS[template.category] || "bg-gray-800 text-gray-400 border-gray-700";
  const categoryIcon = CATEGORY_ICONS[template.category] || <Zap className="w-4 h-4" />;

  return (
    <div className="bg-surface border border-gray-800 rounded-xl hover:border-gray-700 transition-all group">
      {/* Mini Graph Preview */}
      <div className="h-32 bg-gray-900/50 rounded-t-xl flex items-center justify-center relative overflow-hidden">
        {/* Simple node visualization */}
        <div className="flex items-center gap-3">
          {(template.graph?.nodes || []).slice(0, 4).map((node: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              {i < Math.min((template.graph?.nodes?.length || 0) - 1, 3) && (
                <ArrowRight className="w-3 h-3 text-gray-600" />
              )}
            </div>
          ))}
          {(template.graph?.nodes?.length || 0) > 4 && (
            <span className="text-xs text-gray-600">+{template.graph.nodes.length - 4}</span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onPreview(template)}
            className="px-3 py-1.5 bg-gray-800/90 text-gray-200 rounded-lg text-xs flex items-center gap-1 hover:bg-gray-700"
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category Badge */}
        <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium", categoryColor)}>
          {categoryIcon}
          {template.category}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-sm font-semibold text-gray-200 line-clamp-1">{template.name}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>{template.node_count} nodes</span>
          {template.usage_count !== undefined && (
            <span>{template.usage_count} uses</span>
          )}
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Use Button */}
        <button
          onClick={() => onUse(template)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Use Template
        </button>
      </div>
    </div>
  );
}
