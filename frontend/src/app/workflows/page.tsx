"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Copy,
  MoreVertical,
  Search,
  ChevronDown,
  Play,
  Pause,
  GitBranch,
  Clock,
  Filter,
  Grid3X3,
  List,
  Folder,
  Tag,
} from "lucide-react";
import { workflowApi } from "@/lib/api";
import type { Workflow } from "@/types/workflow.types";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/layout/AppSidebar";

type ViewMode = "grid" | "list";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "created">("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    try {
      setLoading(true);
      const data = await workflowApi.list();
      setWorkflows(data || []);
    } catch (err) {
      setError("Failed to load workflows");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      await workflowApi.delete(id);
      setWorkflows(workflows.filter((w) => w.id !== id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const newWorkflow = await workflowApi.duplicate(id);
      setWorkflows([newWorkflow, ...workflows]);
    } catch (err) {
      console.error("Error duplicating:", err);
    }
  }

  // Filter and sort workflows
  const filteredWorkflows = workflows
    .filter((w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "updated":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary text-sm">Loading workflows...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-text-primary">Workflows</h1>
            <span className="px-2 py-0.5 text-xs bg-surface rounded-full text-text-secondary">
              {workflows.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <button className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
                <Clock className="w-4 h-4" />
                <span>Sort by {sortBy}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode */}
            <div className="flex items-center bg-surface border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid"
                    ? "bg-primary-muted text-primary"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-colors border-l border-border",
                  viewMode === "list"
                    ? "bg-primary-muted text-primary"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* New Workflow */}
            <Link
              href="/workflows/create"
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add workflow
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
              {error}
            </div>
          )}

          {filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 mb-6 rounded-2xl bg-surface flex items-center justify-center">
                <GitBranch className="w-10 h-10 text-text-muted" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                {searchQuery ? "No workflows found" : "No workflows yet"}
              </h2>
              <p className="text-text-secondary mb-6 text-center max-w-md">
                {searchQuery
                  ? `No workflows match "${searchQuery}". Try a different search.`
                  : "Create your first workflow to automate tasks and connect your apps."}
              </p>
              {!searchQuery && (
                <Link
                  href="/workflows/create"
                  className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create your first workflow
                </Link>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onDelete={() => handleDelete(workflow.id)}
                  onDuplicate={() => handleDuplicate(workflow.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkflows.map((workflow) => (
                <WorkflowRow
                  key={workflow.id}
                  workflow={workflow}
                  onDelete={() => handleDelete(workflow.id)}
                  onDuplicate={() => handleDuplicate(workflow.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

interface WorkflowCardProps {
  workflow: Workflow;
  onDelete: () => void;
  onDuplicate: () => void;
}

function WorkflowCard({ workflow, onDelete, onDuplicate }: WorkflowCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="workflow-card group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            workflow.is_published ? "bg-accent-green/20" : "bg-surface-hover"
          )}>
            <GitBranch className={cn(
              "w-5 h-5",
              workflow.is_published ? "text-accent-green" : "text-text-muted"
            )} />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/workflows/${workflow.id}`}
              className="text-sm font-medium text-text-primary hover:text-primary truncate block"
            >
              {workflow.name}
            </Link>
            <p className="text-xs text-text-muted mt-0.5">
              {workflow.block_count || 0} nodes
            </p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
          >
            <MoreVertical className="w-4 h-4 text-text-muted" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-44 bg-surface border border-border rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => {
                    onDuplicate();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      {workflow.tags && workflow.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {workflow.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-surface-hover text-text-secondary rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              workflow.is_published
                ? "bg-accent-green/20 text-accent-green"
                : "bg-surface-hover text-text-muted"
            )}
          >
            {workflow.is_published ? "Published" : "Draft"}
          </span>
        </div>
        <span className="text-xs text-text-muted">
          {formatRelativeTime(workflow.updated_at)}
        </span>
      </div>
    </div>
  );
}

function WorkflowRow({ workflow, onDelete, onDuplicate }: WorkflowCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg hover:border-primary/30 transition-colors group">
      {/* Icon */}
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
        workflow.is_published ? "bg-accent-green/20" : "bg-surface-hover"
      )}>
        <GitBranch className={cn(
          "w-4 h-4",
          workflow.is_published ? "text-accent-green" : "text-text-muted"
        )} />
      </div>

      {/* Name & Description */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/workflows/${workflow.id}`}
          className="text-sm font-medium text-text-primary hover:text-primary"
        >
          {workflow.name}
        </Link>
        {workflow.description && (
          <p className="text-xs text-text-muted truncate">{workflow.description}</p>
        )}
      </div>

      {/* Status */}
      <span
        className={cn(
          "px-2 py-0.5 rounded text-xs font-medium flex-shrink-0",
          workflow.is_published
            ? "bg-accent-green/20 text-accent-green"
            : "bg-surface-hover text-text-muted"
        )}
      >
        {workflow.is_published ? "Published" : "Draft"}
      </span>

      {/* Nodes count */}
      <span className="text-xs text-text-muted w-16 flex-shrink-0">
        {workflow.block_count || 0} nodes
      </span>

      {/* Updated */}
      <span className="text-xs text-text-muted w-24 flex-shrink-0">
        {formatRelativeTime(workflow.updated_at)}
      </span>

      {/* Actions */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
        >
          <MoreVertical className="w-4 h-4 text-text-muted" />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-44 bg-surface border border-border rounded-lg shadow-lg z-20 py-1">
              <button
                onClick={() => {
                  onDuplicate();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
