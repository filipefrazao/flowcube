/**
 * FlowCube - Execution Panel (Live Progress + Pin Data)
 *
 * Shows real-time execution progress with node-by-node status,
 * logs, and the ability to pin output data for replay.
 */
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  X, Play, Pin, PinOff, RotateCcw, CheckCircle2, XCircle,
  Loader2, Clock, ChevronDown, ChevronRight, Copy
} from "lucide-react";
import { useExecutionStore, NodeStatus } from "@/stores/executionStore";
import { executionApi, workflowApi } from "@/lib/api";

interface ExecutionPanelProps {
  workflowId: string;
  className?: string;
  onClose?: () => void;
  onPinData?: (nodeId: string, data: any) => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-text-secondary" />,
  running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  success: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  skipped: <Clock className="w-3.5 h-3.5 text-text-muted" />,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "border-border",
  running: "border-blue-600 bg-blue-900/10",
  success: "border-green-800",
  error: "border-red-800 bg-red-900/10",
  skipped: "border-border",
};

export default function ExecutionPanel({
  workflowId,
  className,
  onClose,
  onPinData,
}: ExecutionPanelProps) {
  const {
    activeExecutionId,
    isExecuting,
    nodeStatuses,
    nodeLogs,
  } = useExecutionStore();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [pinnedNodes, setPinnedNodes] = useState<Set<string>>(new Set());
  const [executionDetail, setExecutionDetail] = useState<any>(null);

  // Load execution details when execution completes
  useEffect(() => {
    if (activeExecutionId && !isExecuting) {
      executionApi.get(activeExecutionId).then(setExecutionDetail).catch(() => {});
    }
  }, [activeExecutionId, isExecuting]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const togglePin = (nodeId: string) => {
    const log = nodeLogs.find((l) => l.node_id === nodeId);
    if (!log) return;

    setPinnedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        onPinData?.(nodeId, null);
      } else {
        next.add(nodeId);
        onPinData?.(nodeId, log.output_data);
      }
      return next;
    });
  };

  const handleReplay = async (fromNodeId: string) => {
    if (!activeExecutionId) return;
    try {
      await executionApi.replay(activeExecutionId, fromNodeId);
    } catch {
      // Error handled by API interceptor
    }
  };

  const copyOutput = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const sortedEntries = Object.entries(nodeStatuses).sort((a, b) => {
    const logA = nodeLogs.find((l) => l.node_id === a[0]);
    const logB = nodeLogs.find((l) => l.node_id === b[0]);
    const timeA = logA?.started_at ? new Date(logA.started_at).getTime() : 0;
    const timeB = logB?.started_at ? new Date(logB.started_at).getTime() : 0;
    return timeA - timeB;
  });

  return (
    <div className={cn("w-80 bg-surface border-l border-border flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">
            {isExecuting ? "Executing..." : "Execution"}
          </h2>
          {isExecuting && (
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        )}
      </div>

      {/* Summary */}
      {activeExecutionId && (
        <div className="px-4 py-2 border-b border-border text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-text-muted">Execution</span>
            <span className="text-text-secondary font-mono">
              {activeExecutionId.slice(0, 8)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Nodes</span>
            <span className="text-text-secondary">
              {Object.values(nodeStatuses).filter((s) => s === "success").length}/
              {Object.keys(nodeStatuses).length}
            </span>
          </div>
          {executionDetail?.duration_ms && (
            <div className="flex justify-between">
              <span className="text-text-muted">Duration</span>
              <span className="text-text-secondary">{executionDetail.duration_ms}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Node List */}
      <div className="flex-1 overflow-y-auto">
        {sortedEntries.length === 0 ? (
          <div className="p-4 text-center text-sm text-text-muted">
            No execution data yet. Click Execute to run the workflow.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedEntries.map(([nodeId, nodeStatus]) => {
              const log = nodeLogs.find((l) => l.node_id === nodeId);
              const isExpanded = expandedNodes.has(nodeId);
              const isPinned = pinnedNodes.has(nodeId);

              return (
                <div key={nodeId} className={cn("border-l-2", STATUS_COLORS[nodeStatus])}>
                  {/* Node Header */}
                  <button
                    onClick={() => toggleNode(nodeId)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-surface-hover/50 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-text-muted flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                    )}
                    {STATUS_ICONS[nodeStatus]}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">
                        {log?.node_label || nodeId.slice(0, 12)}
                      </div>
                      {log?.node_type && (
                        <div className="text-[10px] text-text-muted">{log.node_type}</div>
                      )}
                    </div>
                    {log?.duration_ms !== undefined && (
                      <span className="text-[10px] text-text-muted flex-shrink-0">
                        {log.duration_ms}ms
                      </span>
                    )}
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && log && (
                    <div className="px-3 pb-3 space-y-2">
                      {/* Actions */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => togglePin(nodeId)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-[10px]",
                            isPinned
                              ? "bg-amber-900/30 text-amber-400 border border-amber-800"
                              : "bg-surface text-text-secondary hover:text-text-primary"
                          )}
                          title={isPinned ? "Unpin data" : "Pin output for replay"}
                        >
                          {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                          {isPinned ? "Pinned" : "Pin"}
                        </button>
                        <button
                          onClick={() => handleReplay(nodeId)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-surface text-text-secondary hover:text-text-primary"
                          title="Replay from this node"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Replay
                        </button>
                        {log.output_data && (
                          <button
                            onClick={() => copyOutput(log.output_data)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-surface text-text-secondary hover:text-text-primary"
                            title="Copy output"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Output */}
                      {log.output_data && (
                        <div>
                          <div className="text-[10px] text-text-muted mb-1">Output</div>
                          <pre className="text-[10px] text-text-primary bg-background-secondary rounded p-2 overflow-x-auto max-h-32 overflow-y-auto font-mono">
                            {JSON.stringify(log.output_data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Error */}
                      {log.error_details && (
                        <div>
                          <div className="text-[10px] text-red-500 mb-1">Error</div>
                          <pre className="text-[10px] text-red-300 bg-red-900/20 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto font-mono">
                            {typeof log.error_details === "string"
                              ? log.error_details
                              : JSON.stringify(log.error_details, null, 2)}
                          </pre>
                        </div>
                      )}
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
