import type { Node, Edge as ReactFlowEdge } from "@xyflow/react";
import type { Block, BlockType } from "./workflow.types";

export interface FlowNode extends Node {
  data: {
    block: Block;
    label: string;
    blockType: BlockType;
  };
}

export interface FlowEdge extends ReactFlowEdge {
  data?: {
    condition?: Record<string, unknown>;
  };
}

export interface BlockCategory {
  id: string;
  label: string;
  icon: string;
  blocks: {
    type: BlockType;
    label: string;
    description: string;
    icon: string;
  }[];
}
