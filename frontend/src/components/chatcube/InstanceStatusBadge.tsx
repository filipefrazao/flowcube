"use client";

import type { InstanceStatus } from "@/types/chatcube.types";
import { cn } from "@/lib/utils";

interface InstanceStatusBadgeProps {
  status: InstanceStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<InstanceStatus, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  connected: {
    label: "Connected",
    dotColor: "bg-accent-green",
    bgColor: "bg-accent-green/10",
    textColor: "text-accent-green",
  },
  connecting: {
    label: "Connecting",
    dotColor: "bg-yellow-400",
    bgColor: "bg-yellow-400/10",
    textColor: "text-yellow-400",
  },
  disconnected: {
    label: "Disconnected",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-400/10",
    textColor: "text-gray-400",
  },
  banned: {
    label: "Banned",
    dotColor: "bg-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-500",
  },
  timeout: {
    label: "Timeout",
    dotColor: "bg-orange-400",
    bgColor: "bg-orange-400/10",
    textColor: "text-orange-400",
  },
};

export function InstanceStatusBadge({ status, size = "sm" }: InstanceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bgColor,
        config.textColor,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          config.dotColor,
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          status === "connecting" && "animate-pulse"
        )}
      />
      {config.label}
    </span>
  );
}

export default InstanceStatusBadge;
