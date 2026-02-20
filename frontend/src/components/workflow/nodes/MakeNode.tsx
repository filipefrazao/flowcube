/**
 * MakeNode - Make.com-style circular bubble node (v2)
 *
 * Redesigned with insights from Gemini, v0, and Google AI:
 * - SOLID dark backgrounds (bg-{color}-950), NOT transparent overlays
 * - Gradient overlay for depth
 * - Proper glow on selection via box-shadow
 * - Status indicator dot (top-right corner)
 * - React Flow default white bg overridden via CSS
 */
"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { COLOR_PALETTE } from "./nodeVisualConfig";
import type { LucideIcon } from "lucide-react";

export interface MakeNodeProps {
  icon: LucideIcon;
  color: string;
  label: string;
  subtitle: string;
  badge?: string;
  shape?: "circle" | "hexagon" | "diamond";
  hasInput?: boolean;
  hasOutput?: boolean;
  sourceHandles?: Array<{ id: string; label: string }>;
  selected?: boolean;
  status?: string;
}

function MakeNode({
  icon: Icon,
  color,
  label,
  subtitle,
  badge,
  shape = "circle",
  hasInput = true,
  hasOutput = true,
  sourceHandles,
  selected = false,
  status,
}: MakeNodeProps) {
  const palette = COLOR_PALETTE[color] || COLOR_PALETTE.blue;

  // Shape-specific classes
  const shapeClass =
    shape === "hexagon"
      ? "make-node-hexagon"
      : shape === "diamond"
        ? "make-node-diamond"
        : "rounded-full";

  // Status animation class (on the outer wrapper for drop-shadow)
  const statusClass =
    status === "running"
      ? "make-node-running"
      : status === "success"
        ? "make-node-success"
        : status === "error"
          ? "make-node-error"
          : "";

  // Multi-handle spacing
  const multiHandleSpacing = sourceHandles
    ? 100 / (sourceHandles.length + 1)
    : 0;

  return (
    <div
      className={`relative flex flex-col items-center ${statusClass}`}
      style={{ width: 128 }}
    >
      {/* Badge (optional - for FlowCube modules) */}
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span
            className={`
              text-[8px] font-bold uppercase tracking-widest
              px-2 py-0.5 rounded-full border
              ${palette.badgeBg}
            `}
          >
            {badge}
          </span>
        </div>
      )}

      {/* Icon bubble - the main visual */}
      <div
        className={`
          relative w-16 h-16 flex items-center justify-center
          ${shapeClass}
          ${palette.bg}
          border-2
          ${selected ? `${palette.borderSelected} ${palette.glow}` : palette.border}
          transition-all duration-200
          ${selected ? "scale-105" : "hover:scale-[1.03]"}
        `}
      >
        {/* Gradient overlay for depth/glass effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none ${shapeClass}`}
        />

        {/* Icon */}
        <Icon
          className={`relative z-10 w-7 h-7 ${palette.text} drop-shadow-sm`}
          strokeWidth={1.6}
        />

        {/* Input handle (left of shape) */}
        {hasInput && !sourceHandles && (
          <Handle
            type="target"
            position={Position.Left}
            className={`${palette.handle} ${palette.handleBorder} !w-2.5 !h-2.5 !border-2`}
            style={{ left: -6 }}
          />
        )}

        {/* Single output handle (right of shape) */}
        {hasOutput && !sourceHandles && (
          <Handle
            type="source"
            position={Position.Right}
            className={`${palette.handle} ${palette.handleBorder} !w-2.5 !h-2.5 !border-2`}
            style={{ right: -6 }}
          />
        )}

        {/* Multiple source handles (Router/Condition) */}
        {sourceHandles && (
          <>
            {hasInput && (
              <Handle
                type="target"
                position={Position.Left}
                className={`${palette.handle} ${palette.handleBorder} !w-2.5 !h-2.5 !border-2`}
                style={{ left: -6 }}
              />
            )}
            {sourceHandles.map((handle, index) => (
              <Handle
                key={handle.id}
                type="source"
                position={Position.Right}
                id={handle.id}
                className={`${palette.handle} ${palette.handleBorder} !w-2 !h-2 !border-2`}
                style={{
                  right: -5,
                  top: `${multiHandleSpacing * (index + 1)}%`,
                }}
                title={handle.label}
              />
            ))}
          </>
        )}
      </div>

      {/* Labels below the bubble */}
      <div className="mt-2 text-center w-full max-w-[128px]">
        <div
          className="text-[11px] font-medium text-text-primary truncate leading-tight px-1"
          title={label}
        >
          {label}
        </div>
        <div
          className="text-[9px] text-text-muted truncate leading-tight mt-0.5 px-1"
          title={subtitle}
        >
          {subtitle}
        </div>
      </div>

      {/* Status indicator dot (top-right corner) */}
      {status && status !== "draft" && status !== "idle" && (
        <div
          className={`
            absolute -top-1 -right-1 w-3 h-3 rounded-full
            border-2 border-gray-950
            ${status === "running" ? "bg-blue-500 animate-pulse" : ""}
            ${status === "success" ? "bg-emerald-500" : ""}
            ${status === "error" ? "bg-red-500 animate-pulse" : ""}
          `}
        />
      )}
    </div>
  );
}

export default memo(MakeNode);
