/**
 * FlowCube 3.0 - HTTP Request Node
 * 
 * Specialized node for HTTP request configuration
 */
import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "../../../lib/utils";
import { Globe, ArrowRight, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-700 border-green-300",
  POST: "bg-blue-100 text-blue-700 border-blue-300",
  PUT: "bg-yellow-100 text-yellow-700 border-yellow-300",
  PATCH: "bg-orange-100 text-orange-700 border-orange-300",
  DELETE: "bg-red-100 text-red-700 border-red-300",
};

export interface HttpRequestNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string | Record<string, unknown>;
    timeout?: number;
  };
  status?: "pending" | "running" | "success" | "error";
  lastResponse?: {
    statusCode?: number;
    duration?: number;
    error?: string;
  };
}

interface HttpRequestNodeProps {
  id: string;
  data: HttpRequestNodeData;
  selected?: boolean;
}

const HttpRequestNode = ({ data, selected }: HttpRequestNodeProps) => {
  const config = data.config || {};
  const method = config.method || "GET";
  const url = config.url || "https://api.example.com";

  const displayUrl = useMemo(() => {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      return parsed.hostname + (path.length > 15 ? path.slice(0, 15) + "..." : path);
    } catch {
      return url.length > 25 ? url.slice(0, 25) + "..." : url;
    }
  }, [url]);

  const StatusIcon = useMemo(() => {
    switch (data.status) {
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-text-secondary" />;
    }
  }, [data.status]);

  return (
    <div
      className={cn(
        "relative rounded-lg shadow-md transition-all duration-200 min-w-[220px] bg-surface",
        selected ? "ring-2 ring-blue-500 border-blue-300" : "border-border",
        "border-2 hover:shadow-lg"
      )}
    >
      <div className="flex items-center gap-3 p-3 border-b border-border bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="p-2 rounded-lg bg-blue-100">
          <Globe className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-text-primary truncate">
            {data.label || "HTTP Request"}
          </div>
          <div className="text-xs text-text-muted">HTTP Request</div>
        </div>
        {StatusIcon}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-mono font-bold border",
            methodColors[method] || methodColors.GET
          )}>
            {method}
          </span>
          <ArrowRight className="w-3 h-3 text-text-secondary" />
          <span className="text-xs text-text-muted font-mono truncate flex-1">
            {displayUrl}
          </span>
        </div>

        {config.headers && Object.keys(config.headers).length > 0 && (
          <div className="text-xs text-text-muted">
            <span className="font-medium">{Object.keys(config.headers).length}</span> headers
          </div>
        )}

        {data.lastResponse && (
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border">
            <span className={cn(
              "font-mono font-bold",
              data.lastResponse.statusCode && data.lastResponse.statusCode < 400 
                ? "text-green-600" : "text-red-600"
            )}>
              {data.lastResponse.statusCode || "Error"}
            </span>
            {data.lastResponse.duration && (
              <span className="text-text-secondary">{data.lastResponse.duration}ms</span>
            )}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left}
        className="w-3 h-3 rounded-full border-2 border-white bg-blue-500" />
      <Handle type="source" position={Position.Right}
        className="w-3 h-3 rounded-full border-2 border-white bg-blue-500" />
    </div>
  );
};

export default memo(HttpRequestNode);
