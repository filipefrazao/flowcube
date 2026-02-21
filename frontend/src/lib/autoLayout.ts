/**
 * Auto-layout utility using dagre for workflow graphs.
 * Arranges nodes in a clean left-to-right (LR) or top-to-bottom (TB) layout.
 */
import dagre from "dagre";
import { Node, Edge } from "@xyflow/react";

export type LayoutDirection = "LR" | "TB";

const NODE_WIDTH = 80;
const NODE_HEIGHT = 80;

export function autoLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = "LR"
): Node[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  // Add nodes
  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Add edges
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  // Apply new positions
  return nodes.map((node) => {
    const pos = g.node(node.id);
    if (!pos) return node;
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}
