/**
 * FlowCube - AI Workflow Builder Modal
 *
 * Natural language → React Flow graph generation.
 * Calls POST /api/v1/workflows/ai-build/ to generate a graph
 * and allows the user to insert it into the current workflow or create a new one.
 */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  X, Sparkles, Loader2, Wand2, Copy, Check, AlertCircle
} from "lucide-react";
import { workflowApi } from "@/lib/api";

interface AIBuilderModalProps {
  workflowId?: string;
  onClose: () => void;
  onGraphGenerated?: (graph: any) => void;
}

const EXAMPLE_PROMPTS = [
  "When a webhook receives a lead, create it in SalesCube and send a WhatsApp welcome message",
  "Every day at 9am, fetch pending orders via API, filter unpaid ones, and send reminder emails",
  "When a WhatsApp message arrives, use OpenAI to classify intent, then route to sales or support",
  "Fetch data from API, transform with JMESPath, iterate over items, and POST each to another API",
];

export default function AIBuilderModal({
  workflowId,
  onClose,
  onGraphGenerated,
}: AIBuilderModalProps) {
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<"openai" | "claude">("openai");
  const [generating, setGenerating] = useState(false);
  const [generatedGraph, setGeneratedGraph] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setGenerating(true);
    setError(null);
    setGeneratedGraph(null);

    try {
      const result = await workflowApi.aiBuild(description, provider);
      setGeneratedGraph(result.graph);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to generate workflow");
    } finally {
      setGenerating(false);
    }
  };

  const handleUseGraph = () => {
    if (generatedGraph && onGraphGenerated) {
      onGraphGenerated(generatedGraph);
      onClose();
    }
  };

  const handleCreateWorkflow = async () => {
    if (!generatedGraph) return;
    try {
      setGenerating(true);
      const result = await workflowApi.aiBuild(description, provider, true, description.slice(0, 60));
      if (result.workflow_id) {
        window.location.href = `/workflows/${result.workflow_id}`;
      }
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to create workflow");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(generatedGraph, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-text-primary">AI Workflow Builder</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Describe your workflow
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe what you want to automate in plain language..."
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Example Prompts */}
          <div>
            <label className="block text-xs text-text-muted mb-2">Examples (click to use)</label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setDescription(prompt)}
                  className="text-[11px] px-2.5 py-1.5 bg-surface text-text-secondary rounded-full hover:bg-surface-hover hover:text-text-primary transition-colors text-left"
                >
                  {prompt.length > 60 ? prompt.slice(0, 60) + "..." : prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Selection */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-text-muted">Provider:</label>
            <div className="flex gap-1">
              {(["openai", "claude"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full border transition-colors",
                    provider === p
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-border text-text-secondary hover:border-border"
                  )}
                >
                  {p === "openai" ? "OpenAI" : "Claude"}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Generated Graph Preview */}
          {generatedGraph && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text-primary">
                  Generated Graph ({generatedGraph.nodes?.length || 0} nodes,{" "}
                  {generatedGraph.edges?.length || 0} edges)
                </label>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy JSON"}
                </button>
              </div>
              <pre className="text-xs text-text-primary bg-background-secondary rounded-lg p-4 overflow-auto max-h-48 font-mono border border-border">
                {JSON.stringify(generatedGraph, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {generatedGraph ? (
              <>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-border text-text-primary rounded-lg hover:bg-surface-hover"
                >
                  <Wand2 className="w-4 h-4" />
                  Regenerate
                </button>
                {onGraphGenerated && (
                  <button
                    onClick={handleUseGraph}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-gray-900 rounded-lg hover:bg-primary/90"
                  >
                    Use in Editor
                  </button>
                )}
                <button
                  onClick={handleCreateWorkflow}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-text-primary rounded-lg hover:bg-green-500 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Create Workflow
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating || !description.trim()}
                className="flex items-center gap-2 px-5 py-2 text-sm bg-primary text-gray-900 rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {generating ? "Generating..." : "Generate Workflow"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
