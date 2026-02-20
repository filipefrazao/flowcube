/**
 * FlowCube 3.0 - Condition Node
 * 
 * Branching node for conditional logic
 */
import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "../../../lib/utils";
import { GitBranch, CheckCircle, XCircle, ArrowRight } from "lucide-react";

export interface ConditionNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    conditions?: Array<{
      id: string;
      field: string;
      operator: string;
      value: string;
      label?: string;
    }>;
    default_output?: string;
  };
  stats?: {
    evaluations: number;
    branches: Record<string, number>;
  };
}

interface ConditionNodeProps {
  id: string;
  data: ConditionNodeData;
  selected?: boolean;
}

const operatorLabels: Record<string, string> = {
  equals: "=",
  not_equals: "!=",
  contains: "contains",
  starts_with: "starts",
  ends_with: "ends",
  greater_than: ">",
  less_than: "<",
  is_empty: "empty",
  is_not_empty: "!empty",
  matches: "regex",
};

const ConditionNode = ({ data, selected }: ConditionNodeProps) => {
  const config = data.config || {};
  const conditions = config.conditions || [];

  const conditionsSummary = useMemo(() => {
    if (conditions.length === 0) return "No conditions set";
    if (conditions.length === 1) {
      const c = conditions[0];
      return `${c.field} ${operatorLabels[c.operator] || c.operator} ${c.value}`;
    }
    return `${conditions.length} conditions`;
  }, [conditions]);

  return (
    <div
      className={cn(
        "relative rounded-lg shadow-md transition-all duration-200 min-w-[200px] bg-surface",
        selected ? "ring-2 ring-red-500" : "",
        "border-2 border-red-300 hover:shadow-lg"
      )}
    >
      {/* Diamond shape indicator */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 rotate-45 w-4 h-4 bg-red-400 border-2 border-white" />

      {/* Header */}
      <div className="flex items-center gap-3 p-3 pt-4 border-b border-border bg-gradient-to-r from-red-50 to-orange-50">
        <div className="p-2 rounded-lg bg-red-100">
          <GitBranch className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-text-primary truncate">
            {data.label || "Condition"}
          </div>
          <div className="text-xs text-text-muted">Branch Logic</div>
        </div>
      </div>

      {/* Conditions Preview */}
      <div className="p-3 space-y-2">
        {/* Summary */}
        <div className="text-xs text-text-muted font-mono bg-background-secondary px-2 py-1 rounded">
          {conditionsSummary}
        </div>

        {/* Branches */}
        {conditions.length > 0 && (
          <div className="space-y-1 mt-2">
            {conditions.slice(0, 3).map((condition, idx) => (
              <div key={condition.id || idx} className="flex items-center gap-2 text-xs">
                <ArrowRight className="w-3 h-3 text-text-secondary" />
                <span className="text-text-muted truncate flex-1">
                  {condition.label || `Branch ${idx + 1}`}
                </span>
                {data.stats?.branches && (
                  <span className="text-text-secondary font-mono">
                    {data.stats.branches[condition.id] || 0}
                  </span>
                )}
              </div>
            ))}
            {conditions.length > 3 && (
              <div className="text-xs text-text-secondary pl-5">
                +{conditions.length - 3} more
              </div>
            )}
          </div>
        )}

        {/* Default branch */}
        <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-border">
          <ArrowRight className="w-3 h-3 text-text-primary" />
          <span className="text-text-secondary italic">else (default)</span>
        </div>

        {/* Stats */}
        {data.stats && (
          <div className="text-xs text-text-muted mt-2 pt-2 border-t border-border">
            <span className="font-medium">{data.stats.evaluations}</span> evaluations
          </div>
        )}
      </div>

      {/* Input Handle */}
      <Handle type="target" position={Position.Left}
        className="w-3 h-3 rounded-full border-2 border-white bg-red-500" />
      
      {/* Multiple output handles for branches */}
      <Handle type="source" position={Position.Right} id="true"
        className="w-3 h-3 rounded-full border-2 border-white bg-green-500"
        style={{ top: "35%" }} />
      <Handle type="source" position={Position.Right} id="false"
        className="w-3 h-3 rounded-full border-2 border-white bg-red-500"
        style={{ top: "65%" }} />
    </div>
  );
};

export default memo(ConditionNode);
