"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { FlowNode } from "@/types/nodes.types";

const blockColors: Record<string, string> = {
  webhook: "border-blue-500",
  whatsapp_trigger: "border-green-500",
  schedule: "border-yellow-500",
  text_input: "border-purple-500",
  email_input: "border-pink-500",
  phone_input: "border-cyan-500",
  choice: "border-orange-500",
  openai: "border-emerald-500",
  claude: "border-amber-500",
  deepseek: "border-indigo-500",
  condition: "border-red-500",
  set_variable: "border-violet-500",
  wait: "border-gray-500",
  text_response: "border-teal-500",
  image_response: "border-rose-500",
  whatsapp_template: "border-lime-500",
};

function BaseNodeComponent({ data, selected }: NodeProps<FlowNode>) {
  const borderColor = blockColors[data.blockType] || "border-border";
  
  return (
    <div
      className={cn(
        "bg-surface border-2 rounded-lg p-4 min-w-[200px] shadow-lg",
        borderColor,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", borderColor.replace("border-", "bg-"))} />
        <span className="text-sm font-medium text-text-primary">{data.label}</span>
      </div>
      
      <div className="mt-2 text-xs text-text-secondary">
        {data.blockType.replace("_", " ")}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
