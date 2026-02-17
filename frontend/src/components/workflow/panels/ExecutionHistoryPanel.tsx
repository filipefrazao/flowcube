/**
 * FlowCube - Execution History Panel
 *
 * Lists recent executions for a workflow with status indicators,
 * click to overlay execution on the canvas.
 */
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  X, History, CheckCircle2, XCircle, Clock, Loader2,
  RotateCcw, RefreshCw, ChevronRight
} from "lucide-react";
import { executionApi, type Execution } from "@/lib/api";
import { useExecutionStore } from "@/stores/executionStore";

interface ExecutionHistoryPanelProps {
  workflowId: string;
  className?: string;
  onClose?: () => void;
  onSelectExecution?: (executionId: string) => void;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  completed: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: "text-green-400",
    bg: "bg-green-900/20",
  },
  failed: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: "text-red-400",
    bg: "bg-red-900/20",
  },
  running: {
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    color: "text-blue-400",
    bg: "bg-blue-900/20",
  },
  pending: {
    icon: <Clock className="w-3.5 h-3.5" />,
    color: "text-gray-400",
    bg: "bg-gray-800",
  },
  cancelled: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: "text-gray-500",
    bg: "bg-gray-800",
  },
};

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export default function ExecutionHistoryPanel({
  workflowId,
  className,
  onClose,
  onSelectExecution,
}: ExecutionHistoryPanelProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const { activeExecutionId } = useExecutionStore();

  useEffect(() => {
    loadExecutions();
  }, [workflowId]);

  // Auto-refresh while there's a running execution
  useEffect(() => {
    if (!activeExecutionId) return;
    const interval = setInterval(loadExecutions, 5000);
    return () => clearInterval(interval);
  }, [activeExecutionId]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const data = await executionApi.list({ workflow: workflowId, ordering: "-started_at" });
      setExecutions(data.results || []);
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (executionId: string) => {
    try {
      setRetrying(executionId);
      await executionApi.retry(executionId);
      loadExecutions();
    } catch {
      // Handled by API interceptor
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className={cn("w-80 bg-surface border-l border-gray-800 flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-gray-200">Execution History</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadExecutions}
            className="p-1 hover:bg-gray-800 rounded"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-400", loading && "animate-spin")} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Execution List */}
      <div className="flex-1 overflow-y-auto">
        {executions.length === 0 && !loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No executions yet
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {executions.map((exec) => {
              const config = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending;
              const isActive = exec.id === activeExecutionId;

              return (
                <div
                  key={exec.id}
                  className={cn(
                    "p-3 hover:bg-gray-800/50 cursor-pointer transition-colors",
                    isActive && "bg-primary/5 border-l-2 border-primary"
                  )}
                  onClick={() => onSelectExecution?.(exec.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded", config.bg, config.color)}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-200 capitalize">
                          {exec.status}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {formatTimeAgo(exec.started_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-gray-500">
                          via {exec.triggered_by}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {formatDuration(exec.duration_ms)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {exec.status === "failed" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(exec.id);
                          }}
                          disabled={retrying === exec.id}
                          className="p-1 hover:bg-gray-700 rounded"
                          title="Retry"
                        >
                          <RotateCcw
                            className={cn(
                              "w-3 h-3 text-gray-400",
                              retrying === exec.id && "animate-spin"
                            )}
                          />
                        </button>
                      )}
                      <ChevronRight className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                  {exec.error_message && (
                    <div className="mt-1.5 text-[10px] text-red-400 bg-red-900/10 rounded px-2 py-1 truncate">
                      {exec.error_message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
