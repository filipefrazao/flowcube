/**
 * MakeRouterNode - Diamond Make-style router with multiple outputs
 *
 * Generates dynamic source handles from data.config.routes + fallback.
 */
"use client";

import { memo, useMemo } from "react";
import { NodeProps } from "@xyflow/react";
import MakeNode from "./MakeNode";
import { getNodeVisual } from "./nodeVisualConfig";

function MakeRouterNode({ data, selected }: NodeProps) {
  const nodeType = (data?.type as string) || "router";
  const visual = getNodeVisual(nodeType);
  const routes = (data?.config as any)?.routes || [];

  const sourceHandles = useMemo(() => {
    const handles = routes.map((route: any, i: number) => ({
      id: route.handle || `route_${i + 1}`,
      label: route.label || `Route ${i + 1}`,
    }));
    handles.push({ id: "fallback", label: "Fallback" });
    return handles;
  }, [routes]);

  return (
    <MakeNode
      icon={visual.icon}
      color={visual.color}
      label={(data?.label as string) || "Router"}
      subtitle={`${routes.length} route${routes.length !== 1 ? "s" : ""}`}
      shape="diamond"
      hasInput={true}
      hasOutput={true}
      sourceHandles={sourceHandles}
      selected={selected}
      status={data?.status as string}
    />
  );
}

export default memo(MakeRouterNode);
