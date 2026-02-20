"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from "@xyflow/react";

function AnimatedEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isRunning = data?.status === "running";
  const isError = data?.status === "error";

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: isError ? "#EF4444" : isRunning ? "#3B82F6" : "#4B5563",
          strokeWidth: selected ? 3 : 2,
          strokeOpacity: 0.3,
          filter: isRunning ? "blur(4px)" : "none",
          ...style,
        }}
      />

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isError ? "#EF4444" : isRunning ? "#3B82F6" : selected ? "#6366F1" : "#4B5563",
          strokeWidth: selected ? 2.5 : 1.5,
          ...style,
        }}
      />

      {isRunning && (
        <path
          d={edgePath}
          fill="none"
          stroke="#60A5FA"
          strokeWidth={2}
          strokeDasharray="8 4"
          className="animated-edge"
        />
      )}

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-text-secondary"
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeComponent);

export const edgeTypes = {
  default: AnimatedEdge,
  animated: AnimatedEdge,
};
