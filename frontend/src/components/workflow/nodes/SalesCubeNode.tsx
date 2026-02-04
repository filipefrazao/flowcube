/**
 * FlowCube 3.0 - SalesCube Integration Node
 * 
 * Node for SalesCube CRM operations (create lead, update, etc.)
 */
import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "../../../lib/utils";
import { Users, UserPlus, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";

const actionConfig: Record<string, { 
  icon: typeof UserPlus; 
  label: string;
  color: string;
}> = {
  create_lead: { icon: UserPlus, label: "Create Lead", color: "text-blue-600" },
  update_lead: { icon: RefreshCw, label: "Update Lead", color: "text-yellow-600" },
  get_lead: { icon: Users, label: "Get Lead", color: "text-green-600" },
};

export interface SalesCubeNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    action?: "create_lead" | "update_lead" | "get_lead";
    channel?: number;
    column?: number;
    origin?: number;
    responsibles?: number[];
    mapping?: Record<string, string>;
  };
  status?: "pending" | "running" | "success" | "error";
  lastResponse?: {
    lead_id?: number;
    error?: string;
  };
}

interface SalesCubeNodeProps {
  id: string;
  data: SalesCubeNodeData;
  selected?: boolean;
}

const SalesCubeNode = ({ data, selected }: SalesCubeNodeProps) => {
  const config = data.config || {};
  const action = config.action || "create_lead";
  const actionInfo = actionConfig[action] || actionConfig.create_lead;
  const ActionIcon = actionInfo.icon;

  const StatusIcon = useMemo(() => {
    switch (data.status) {
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  }, [data.status]);

  const mappingCount = Object.keys(config.mapping || {}).length;

  return (
    <div
      className={cn(
        "relative rounded-lg shadow-md transition-all duration-200 min-w-[220px] bg-white",
        selected ? "ring-2 ring-blue-500" : "",
        "border-2 border-blue-400 hover:shadow-lg"
      )}
    >
      {/* SalesCube branding stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-t-lg" />

      {/* Header */}
      <div className="flex items-center gap-3 p-3 pt-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="p-2 rounded-lg bg-blue-100">
          <ActionIcon className={cn("w-5 h-5", actionInfo.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-800 truncate">
            {data.label || actionInfo.label}
          </div>
          <div className="text-xs text-gray-500">SalesCube CRM</div>
        </div>
        {StatusIcon}
      </div>

      {/* Config */}
      <div className="p-3 space-y-2">
        {/* Action */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Action</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            {actionInfo.label}
          </span>
        </div>

        {/* Channel & Column */}
        {(config.channel || config.column) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {config.channel && (
              <div>
                <span className="text-gray-400">Channel</span>
                <span className="ml-1 font-mono text-gray-700">#{config.channel}</span>
              </div>
            )}
            {config.column && (
              <div>
                <span className="text-gray-400">Column</span>
                <span className="ml-1 font-mono text-gray-700">#{config.column}</span>
              </div>
            )}
          </div>
        )}

        {/* Mapping count */}
        {mappingCount > 0 && (
          <div className="text-xs text-gray-500">
            <span className="font-medium">{mappingCount}</span> fields mapped
          </div>
        )}

        {/* Last Response */}
        {data.lastResponse && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            {data.lastResponse.lead_id && (
              <div className="text-xs text-green-600">
                Created: Lead <span className="font-mono font-bold">#{data.lastResponse.lead_id}</span>
              </div>
            )}
            {data.lastResponse.error && (
              <div className="text-xs text-red-500 truncate">
                {data.lastResponse.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left}
        className="w-3 h-3 rounded-full border-2 border-white bg-blue-500" />
      <Handle type="source" position={Position.Right}
        className="w-3 h-3 rounded-full border-2 border-white bg-blue-500" />
    </div>
  );
};

export default memo(SalesCubeNode);
