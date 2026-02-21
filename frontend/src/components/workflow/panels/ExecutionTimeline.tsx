"use client";

import { useMemo } from "react";
import { useExecutionStore, NodeLog, NodeStatus } from "@/stores/executionStore";
import { Clock, CheckCircle, XCircle, Loader2, SkipForward, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionTimelineProps {
  onNodeClick?: (nodeId: string) => void;
}

const STATUS_CONFIG: Record<NodeStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  idle: { icon: Clock, color: "text-gray-400", label: "Idle" },
  running: { icon: Loader2, color: "text-blue-400", label: "Running" },
  success: { icon: CheckCircle, color: "text-green-400", label: "Success" },
  error: { icon: XCircle, color: "text-red-400", label: "Error" },
  skipped: { icon: SkipForward, color: "text-gray-400", label: "Skipped" },
};

export function ExecutionTimeline({ onNodeClick }: ExecutionTimelineProps) {
  const { nodeLogs, isExecuting, activeExecutionId } = useExecutionStore();

  // Group logs by node, keep latest per node
  const timeline = useMemo(() => {
    const nodeMap = new Map<string, NodeLog>();
    for (const log of nodeLogs) {
      nodeMap.set(log.node_id, log);
    }
    return Array.from(nodeMap.values());
  }, [nodeLogs]);

  const totalDuration = useMemo(() => {
    return timeline.reduce((sum, log) => sum + (log.duration_ms || 0), 0);
  }, [timeline]);

  if (!activeExecutionId && timeline.length === 0) return null;

  return (
    <div className="border-t border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-text-primary">Execution Timeline</span>
          {isExecuting && (
            <span className="flex items-center gap-1 text-[10px] text-blue-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Running
            </span>
          )}
        </div>
        <div className="text-[10px] text-text-muted">
          {timeline.length} node{timeline.length !== 1 ? "s" : ""}
          {totalDuration > 0 && ` · ${totalDuration}ms total`}
        </div>
      </div>

      {/* Progress bar */}
      {timeline.length > 0 && (
        <div className="flex h-1.5 bg-background">
          {timeline.map((log, i) => {
            const widthPct = totalDuration > 0
              ? Math.max(((log.duration_ms || 0) / totalDuration) * 100, 2)
              : 100 / timeline.length;
            return (
              <div
                key={log.node_id}
                className={cn(
                  "h-full transition-all",
                  log.status === "success" ? "bg-green-500" :
                  log.status === "error" ? "bg-red-500" :
                  log.status === "running" ? "bg-blue-500 animate-pulse" :
                  "bg-gray-500"
                )}
                style={{ width: `${widthPct}%` }}
                title={`${log.node_label || log.node_type}: ${log.duration_ms || 0}ms`}
              />
            );
          })}
        </div>
      )}

      {/* Node list */}
      <div className="flex overflow-x-auto px-2 py-2 gap-1.5">
        {timeline.map((log, i) => {
          const config = STATUS_CONFIG[log.status];
          const Icon = config.icon;
          return (
            <button
              key={log.node_id}
              onClick={() => onNodeClick?.(log.node_id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
                "text-[11px] whitespace-nowrap transition-colors",
                "hover:bg-surface-hover border border-border/50",
                log.status === "error" ? "bg-red-500/5" :
                log.status === "running" ? "bg-blue-500/5" :
                "bg-background"
              )}
            >
              <Icon className={cn("w-3 h-3 flex-shrink-0", config.color,
                log.status === "running" ? "animate-spin" : "")} />
              <span className="text-text-primary font-medium">
                {log.node_label || log.node_type}
              </span>
              {log.duration_ms !== undefined && (
                <span className="text-text-muted">{log.duration_ms}ms</span>
              )}
              {i < timeline.length - 1 && (
                <ChevronRight className="w-3 h-3 text-text-muted/50 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ExecutionTimeline;
