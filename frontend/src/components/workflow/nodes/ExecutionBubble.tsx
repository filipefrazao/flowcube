"use client";

import { memo } from "react";
import { useExecutionStore, NodeStatus } from "@/stores/executionStore";
import { cn } from "@/lib/utils";

interface ExecutionBubbleProps {
  nodeId: string;
  onClick?: (nodeId: string) => void;
}

const STATUS_STYLES: Record<NodeStatus, string> = {
  idle: "hidden",
  running: "bg-blue-500 animate-pulse shadow-blue-500/40",
  success: "bg-green-500 shadow-green-500/40",
  error: "bg-red-500 shadow-red-500/40",
  skipped: "bg-gray-500 shadow-gray-500/40",
};

const STATUS_ICONS: Record<NodeStatus, string> = {
  idle: "",
  running: "\u25B6",
  success: "\u2713",
  error: "!",
  skipped: "\u2212",
};

function ExecutionBubbleComponent({ nodeId, onClick }: ExecutionBubbleProps) {
  const status = useExecutionStore((s) => s.nodeStatuses[nodeId] || "idle");
  const log = useExecutionStore((s) =>
    s.nodeLogs.filter((l) => l.node_id === nodeId).pop()
  );

  if (status === "idle") return null;

  return (
    <button
      className={cn(
        "absolute -top-2.5 -right-2.5 z-50 rounded-full",
        "w-6 h-6 flex items-center justify-center",
        "text-white text-[10px] font-bold cursor-pointer",
        "shadow-lg hover:scale-110 transition-transform",
        STATUS_STYLES[status]
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(nodeId);
      }}
      title={
        status === "error"
          ? log?.error || "Error"
          : status === "success" && log?.duration_ms
          ? `${log.duration_ms}ms`
          : status
      }
    >
      {STATUS_ICONS[status]}
    </button>
  );
}

export const ExecutionBubble = memo(ExecutionBubbleComponent);
export default ExecutionBubble;
