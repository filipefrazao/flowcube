/**
 * MakeTriggerNode - Hexagonal Make-style trigger node
 *
 * Entry points for workflows. No input handle, only output.
 * Reads icon from nodeVisualConfig.
 */
"use client";

import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import MakeNode from "./MakeNode";
import { getNodeVisual } from "./nodeVisualConfig";

function MakeTriggerNode({ data, selected }: NodeProps) {
  const nodeType = (data?.type as string) || "webhook_trigger";
  const visual = getNodeVisual(nodeType);

  return (
    <MakeNode
      icon={visual.icon}
      color={visual.color}
      label={(data?.label as string) || "Trigger"}
      subtitle={visual.subtitle}
      shape="hexagon"
      hasInput={false}
      hasOutput={true}
      selected={selected}
      status={data?.status as string}
    />
  );
}

export default memo(MakeTriggerNode);
