/**
 * FlowCube 3.0 - Webhook Trigger Node
 * 
 * Entry point node for webhook-triggered workflows
 */
import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "../../../lib/utils";
import { Webhook, Copy, CheckCircle, Radio, ExternalLink } from "lucide-react";

export interface WebhookTriggerNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    webhook_url?: string;
    webhook_path?: string;
    secret?: string;
    source?: "evolution" | "n8n" | "salescube" | "custom";
  };
  status?: "active" | "inactive" | "receiving";
  stats?: {
    totalReceived: number;
    lastReceived?: string;
  };
}

interface WebhookTriggerNodeProps {
  id: string;
  data: WebhookTriggerNodeData;
  selected?: boolean;
}

const sourceColors: Record<string, { bg: string; text: string; border: string }> = {
  evolution: { bg: "bg-green-100", text: "text-green-700", border: "border-green-400" },
  n8n: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-400" },
  salescube: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-400" },
  custom: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-400" },
};

const WebhookTriggerNode = ({ data, selected }: WebhookTriggerNodeProps) => {
  const config = data.config || {};
  const source = config.source || "custom";
  const defaultColors = { bg: 'bg-background-secondary', border: 'border-border', text: 'text-text-secondary', iconBg: 'bg-surface-hover' };
  const colors = sourceColors[source] || sourceColors.custom || defaultColors;

  const webhookUrl = useMemo(() => {
    if (config.webhook_url) return config.webhook_url;
    const path = config.webhook_path || "webhook";
    return `https://platform.frzgroup.com.br/api/v1/webhooks/${path}`;
  }, [config.webhook_url, config.webhook_path]);

  const displayUrl = useMemo(() => {
    try {
      const url = new URL(webhookUrl);
      return url.pathname;
    } catch {
      return webhookUrl.slice(0, 30) + "...";
    }
  }, [webhookUrl]);

  const statusIndicator = useMemo(() => {
    switch (data.status) {
      case "active":
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Active
          </span>
        );
      case "receiving":
        return (
          <span className="flex items-center gap-1 text-xs text-blue-600">
            <Radio className="w-3 h-3 animate-ping" />
            Receiving
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs text-text-secondary">
            <span className="w-2 h-2 bg-gray-400 rounded-full" />
            Inactive
          </span>
        );
    }
  }, [data.status]);

  return (
    <div
      className={cn(
        "relative rounded-lg shadow-md transition-all duration-200 min-w-[240px] bg-surface",
        selected ? "ring-2 ring-yellow-500" : "",
        "border-2 border-yellow-300 hover:shadow-lg"
      )}
    >
      {/* Trigger indicator (top) */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
        TRIGGER
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 p-3 pt-4 border-b border-border bg-gradient-to-r from-yellow-50 to-orange-50">
        <div className="p-2 rounded-lg bg-yellow-100">
          <Webhook className="w-5 h-5 text-yellow-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-text-primary truncate">
            {data.label || "Webhook Trigger"}
          </div>
          <div className="text-xs text-text-muted">Webhook Entry Point</div>
        </div>
        {statusIndicator}
      </div>

      {/* Config */}
      <div className="p-3 space-y-2">
        {/* Source Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Source</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium capitalize",
            colors.bg, colors.text
          )}>
            {source}
          </span>
        </div>

        {/* Webhook URL */}
        <div className="mt-2 p-2 bg-background-secondary rounded border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-secondary">Endpoint</span>
            <button className="text-text-secondary hover:text-text-muted transition-colors">
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <code className="text-xs font-mono text-text-muted truncate flex-1">
              {displayUrl}
            </code>
            <ExternalLink className="w-3 h-3 text-text-secondary" />
          </div>
        </div>

        {/* Stats */}
        {data.stats && (
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border">
            <span className="text-text-muted">
              <span className="font-medium">{data.stats.totalReceived}</span> received
            </span>
            {data.stats.lastReceived && (
              <span className="text-text-secondary">
                Last: {new Date(data.stats.lastReceived).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Only source handle (triggers start the flow) */}
      <Handle type="source" position={Position.Right}
        className="w-3 h-3 rounded-full border-2 border-white bg-yellow-500" />
    </div>
  );
};

export default memo(WebhookTriggerNode);
