/**
 * MakeConditionNode - Diamond Make-style condition with true/false/else handles
 *
 * Fixed 3 output handles: true (top), false (middle), else (bottom).
 */
"use client";

import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import MakeNode from "./MakeNode";
import { getNodeVisual } from "./nodeVisualConfig";

const CONDITION_HANDLES = [
  { id: "true", label: "True" },
  { id: "false", label: "False" },
  { id: "else", label: "Else" },
];

function MakeConditionNode({ data, selected }: NodeProps) {
  const nodeType = (data?.type as string) || "condition";
  const visual = getNodeVisual(nodeType);
  const conditions = (data?.config as any)?.conditions || [];

  return (
    <MakeNode
      icon={visual.icon}
      color={visual.color}
      label={(data?.label as string) || "Condition"}
      subtitle={
        conditions.length > 0
          ? `${conditions.length} rule${conditions.length !== 1 ? "s" : ""}`
          : visual.subtitle
      }
      shape="diamond"
      hasInput={true}
      hasOutput={true}
      sourceHandles={CONDITION_HANDLES}
      selected={selected}
      status={data?.status as string}
    />
  );
}

export default memo(MakeConditionNode);
