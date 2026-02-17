/**
 * MakeActionNode - Generic circular Make-style node
 *
 * Reads visual config from nodeVisualConfig and renders via MakeNode.
 * Used for all standard (non-trigger, non-router, non-condition) nodes.
 */
"use client";

import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import MakeNode from "./MakeNode";
import { getNodeVisual } from "./nodeVisualConfig";

function MakeActionNode({ data, selected }: NodeProps) {
  const nodeType = (data?.type as string) || (data?.blockType as string) || "default";
  const visual = getNodeVisual(nodeType);

  return (
    <MakeNode
      icon={visual.icon}
      color={visual.color}
      label={(data?.label as string) || nodeType.replace(/_/g, " ")}
      subtitle={visual.subtitle}
      badge={visual.badge}
      shape={visual.shape}
      hasInput={visual.hasInput}
      hasOutput={visual.hasOutput}
      selected={selected}
      status={data?.status as string}
    />
  );
}

export default memo(MakeActionNode);
