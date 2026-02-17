/**
 * MakeNode - Make.com-style circular bubble node
 *
 * Unified base component for all workflow nodes.
 * Renders compact icon-centric bubbles with label below.
 * Supports circle, hexagon, and diamond shapes.
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

// Shape CSS classes for the icon container
const SHAPE_CLASSES: Record<string, string> = {
  circle: "rounded-full",
  hexagon: "make-node-hexagon",
  diamond: "make-node-diamond",
};

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
  const shapeClass = SHAPE_CLASSES[shape] || SHAPE_CLASSES.circle;

  // Status border classes
  const statusClass =
    status === "running"
      ? "make-node-running"
      : status === "success"
        ? "make-node-success"
        : status === "error"
          ? "make-node-error"
          : "";

  // Calculate handle positions for multiple source handles
  const multiHandleSpacing = sourceHandles
    ? 100 / (sourceHandles.length + 1)
    : 0;

  return (
    <div
      className={`
        relative flex flex-col items-center
        transition-all duration-200
        ${statusClass}
      `}
      style={{ width: 120 }}
    >
      {/* Badge (optional - for FlowCube modules) */}
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span
            className={`
              text-[9px] font-bold uppercase tracking-wider
              px-1.5 py-0.5 rounded-sm
              ${palette.bgLight} ${palette.text}
              border ${palette.border}
            `}
          >
            {badge}
          </span>
        </div>
      )}

      {/* Icon bubble */}
      <div
        className={`
          relative w-16 h-16 flex items-center justify-center
          ${shapeClass}
          ${palette.bgLight}
          border-2
          ${selected ? `${palette.borderSelected} shadow-lg ${palette.glow}` : palette.border}
          ${selected ? "scale-110" : ""}
          transition-all duration-200
          hover:brightness-110
        `}
      >
        <Icon className={`w-6 h-6 ${palette.text}`} strokeWidth={1.8} />

        {/* Input handle (left of shape) */}
        {hasInput && !sourceHandles && (
          <Handle
            type="target"
            position={Position.Left}
            className={`${palette.handle} ${palette.handleBorder} !w-2.5 !h-2.5`}
            style={{ left: -5 }}
          />
        )}

        {/* Single output handle (right of shape) */}
        {hasOutput && !sourceHandles && (
          <Handle
            type="source"
            position={Position.Right}
            className={`${palette.handle} ${palette.handleBorder} !w-2.5 !h-2.5`}
            style={{ right: -5 }}
          />
        )}

        {/* Multiple source handles (Router/Condition) */}
        {sourceHandles && (
          <>
            {hasInput && (
              <Handle
                type="target"
                position={Position.Left}
                className={`${palette.handle} ${palette.handleBorder} !w-2.5 !h-2.5`}
                style={{ left: -5 }}
              />
            )}
            {sourceHandles.map((handle, index) => (
              <Handle
                key={handle.id}
                type="source"
                position={Position.Right}
                id={handle.id}
                className={`${palette.handle} ${palette.handleBorder} !w-2 !h-2`}
                style={{
                  right: -4,
                  top: `${multiHandleSpacing * (index + 1)}%`,
                }}
                title={handle.label}
              />
            ))}
          </>
        )}
      </div>

      {/* Label */}
      <div className="mt-1.5 text-center max-w-[120px]">
        <div className="text-[11px] font-medium text-gray-200 truncate leading-tight">
          {label}
        </div>
        <div className="text-[9px] text-gray-500 truncate leading-tight">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export default memo(MakeNode);
