"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Loader2,
  RotateCcw,
  GitBranch,
} from "lucide-react";
import { executionApi, type Execution, type ExecutionDetail, type NodeExecutionLog } from "@/lib/api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

const STATUS_CONFIG: Record<ExecutionStatus, { icon: React.ReactNode; color: string; bg: string }> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  running: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
  },
  completed: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-error",
    bg: "bg-error/10",
  },
  cancelled: {
    icon: <Pause className="w-4 h-4" />,
    color: "text-text-muted",
    bg: "bg-surface-hover",
  },
};

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadExecutions();
  }, [statusFilter]);

  async function loadExecutions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      const data = await executionApi.list(params.toString());
      setExecutions(data);
      setError(null);
    } catch (err) {
      setError("Failed to load executions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadExecutionDetail(id: string) {
    try {
      setLoadingDetail(true);
      const detail = await executionApi.get(id);
      setSelectedExecution(detail);
    } catch (err) {
      console.error("Failed to load execution detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleRetry(executionId: string) {
    try {
      setRetrying(executionId);
      await executionApi.retry(executionId);
      await loadExecutions();
      setSelectedExecution(null);
    } catch (err) {
      console.error("Failed to retry execution:", err);
    } finally {
      setRetrying(null);
    }
  }

  function handleRowClick(execution: Execution) {
    if (selectedExecution?.id === execution.id) {
      setSelectedExecution(null);
    } else {
      loadExecutionDetail(execution.id);
    }
  }

  const filteredExecutions = executions.filter((exec) => {
    if (searchQuery) {
      // Would filter by workflow name if available
      return true;
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Executions</h1>
            <p className="text-sm text-text-muted">Monitor workflow runs</p>
          </div>
          <button
            onClick={loadExecutions}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </header>

        {/* Filters Bar */}
        <div className="border-b border-border bg-surface px-6 py-3">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by workflow name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Executions List */}
          <div className={cn(
            "flex-1 overflow-auto transition-all",
            selectedExecution ? "w-1/2" : "w-full"
          )}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            ) : filteredExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Play className="w-12 h-12 text-text-muted mb-4" />
                <h3 className="text-text-secondary font-medium mb-1">No executions yet</h3>
                <p className="text-text-muted text-sm">Run a workflow to see execution history</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-surface-hover sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                      Workflow
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                      Started
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">
                      Trigger
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredExecutions.map((execution) => {
                    const status = STATUS_CONFIG[execution.status];
                    const isSelected = selectedExecution?.id === execution.id;

                    return (
                      <tr
                        key={execution.id}
                        onClick={() => handleRowClick(execution)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected ? "bg-primary/10" : "hover:bg-surface-hover"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className={cn("flex items-center gap-2", status.color)}>
                            {status.icon}
                            <span className="capitalize text-sm">{execution.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/workflows/${execution.workflow}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 text-text-primary hover:text-primary"
                          >
                            <GitBranch className="w-4 h-4 text-text-muted" />
                            <span className="text-sm font-medium">Workflow</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {formatDateTime(execution.started_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {execution.duration_ms ? formatDuration(execution.duration_ms) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-surface-hover rounded text-xs text-text-muted capitalize">
                            {execution.triggered_by}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <ChevronRight
                            className={cn(
                              "w-4 h-4 text-text-muted transition-transform",
                              isSelected && "rotate-90"
                            )}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selectedExecution && (
            <div className="w-1/2 border-l border-border bg-surface overflow-auto">
              <ExecutionDetailPanel
                execution={selectedExecution}
                loading={loadingDetail}
                onClose={() => setSelectedExecution(null)}
                onRetry={() => handleRetry(selectedExecution.id)}
                retrying={retrying === selectedExecution.id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Detail Panel Component ============

interface ExecutionDetailPanelProps {
  execution: ExecutionDetail;
  loading: boolean;
  onClose: () => void;
  onRetry: () => void;
  retrying: boolean;
}

function ExecutionDetailPanel({ execution, loading, onClose, onRetry, retrying }: ExecutionDetailPanelProps) {
  const status = STATUS_CONFIG[execution.status];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Detail Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-hover rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-text-muted" />
          </button>
          <div>
            <h3 className="text-sm font-medium text-text-primary">Execution Details</h3>
            <p className="text-xs text-text-muted">ID: {execution.id.slice(0, 8)}...</p>
          </div>
        </div>
        {execution.status === "failed" && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover rounded text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {retrying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Retry
          </button>
        )}
      </div>

      {/* Status Badge */}
      <div className="p-4 border-b border-border">
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full", status.bg, status.color)}>
          {status.icon}
          <span className="text-sm font-medium capitalize">{execution.status}</span>
        </div>
      </div>

      {/* Metadata */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Started</span>
            <p className="text-text-primary font-medium">{formatDateTime(execution.started_at)}</p>
          </div>
          <div>
            <span className="text-text-muted">Finished</span>
            <p className="text-text-primary font-medium">
              {execution.finished_at ? formatDateTime(execution.finished_at) : "-"}
            </p>
          </div>
          <div>
            <span className="text-text-muted">Duration</span>
            <p className="text-text-primary font-medium">
              {execution.duration_ms ? formatDuration(execution.duration_ms) : "-"}
            </p>
          </div>
          <div>
            <span className="text-text-muted">Triggered By</span>
            <p className="text-text-primary font-medium capitalize">{execution.triggered_by}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {execution.error_message && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-error mb-2">Error Message</h4>
          <pre className="p-3 bg-error/10 border border-error/20 rounded text-xs text-error overflow-auto">
            {execution.error_message}
          </pre>
        </div>
      )}

      {/* Node Logs */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">Node Execution Logs</h4>
          {execution.node_logs && execution.node_logs.length > 0 ? (
            <div className="space-y-2">
              {execution.node_logs.map((log) => (
                <NodeLogItem key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No node logs available</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Node Log Item Component ============

interface NodeLogItemProps {
  log: NodeExecutionLog;
}

function NodeLogItem({ log }: NodeLogItemProps) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    success: "bg-accent-green/20 text-accent-green border-accent-green/30",
    error: "bg-error/20 text-error border-error/30",
    skipped: "bg-surface-hover text-text-muted border-border",
    waiting: "bg-warning/20 text-warning border-warning/30",
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={cn("px-2 py-0.5 text-xs rounded border", statusColors[log.status])}>
            {log.status}
          </span>
          <span className="text-sm text-text-primary font-medium">{log.node_label}</span>
          <span className="text-xs text-text-muted">({log.node_type})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{log.duration_ms}ms</span>
          <ChevronDown
            className={cn("w-4 h-4 text-text-muted transition-transform", expanded && "rotate-180")}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t border-border bg-background space-y-3">
          {log.input_data && (
            <div>
              <h5 className="text-xs font-medium text-text-muted mb-1">Input</h5>
              <pre className="p-2 bg-surface rounded text-xs text-text-secondary overflow-auto max-h-32">
                {JSON.stringify(log.input_data, null, 2)}
              </pre>
            </div>
          )}
          {log.output_data && (
            <div>
              <h5 className="text-xs font-medium text-text-muted mb-1">Output</h5>
              <pre className="p-2 bg-surface rounded text-xs text-text-secondary overflow-auto max-h-32">
                {JSON.stringify(log.output_data, null, 2)}
              </pre>
            </div>
          )}
          {log.error_details && (
            <div>
              <h5 className="text-xs font-medium text-error mb-1">Error</h5>
              <pre className="p-2 bg-error/10 rounded text-xs text-error overflow-auto max-h-32">
                {log.error_details}
              </pre>
            </div>
          )}
          <div className="text-xs text-text-muted">
            Started: {formatDateTime(log.started_at)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Helper Functions ============

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
