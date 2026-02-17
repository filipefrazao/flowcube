/**
 * FlowCube - Template Preview Modal
 *
 * Full-screen modal with read-only React Flow preview of a template.
 */
"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { X, Zap, Clock, Tag } from "lucide-react";
import type { WorkflowTemplate } from "./TemplateCard";

interface TemplatePreviewProps {
  template: WorkflowTemplate;
  onClose: () => void;
  onUse: (template: WorkflowTemplate) => void;
}

export default function TemplatePreview({ template, onClose, onUse }: TemplatePreviewProps) {
  const nodes = useMemo(() => template.graph?.nodes || [], [template]);
  const edges = useMemo(() => template.graph?.edges || [], [template]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{template.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Graph Preview */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-6 min-h-[300px] relative">
            {/* Simple node layout visualization */}
            <div className="space-y-4">
              {nodes.map((node: any, index: number) => {
                const nodeType = node.data?.type || node.type || "default";
                const label = node.data?.label || "Untitled";
                const isFirst = index === 0;

                return (
                  <div key={node.id} className="flex items-center gap-3">
                    {/* Step number */}
                    <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
                      {index + 1}
                    </div>

                    {/* Node card */}
                    <div
                      className={cn(
                        "flex-1 p-3 rounded-lg border",
                        isFirst
                          ? "border-amber-800 bg-amber-900/10"
                          : "border-gray-700 bg-gray-800/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-200">{label}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-900 rounded text-gray-500">
                          {nodeType}
                        </span>
                      </div>
                      {node.data?.config && Object.keys(node.data.config).length > 0 && (
                        <div className="mt-2 text-[10px] text-gray-500 font-mono truncate">
                          {JSON.stringify(node.data.config).slice(0, 80)}...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Meta & Actions */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {nodes.length} nodes, {edges.length} connections
            </span>
            {template.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {template.tags.join(", ")}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300"
            >
              Close
            </button>
            <button
              onClick={() => onUse(template)}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Zap className="w-4 h-4" />
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
