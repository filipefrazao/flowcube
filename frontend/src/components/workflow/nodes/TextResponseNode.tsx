/**
 * FlowCube 3.0 - Text Response Node
 * 
 * Output node for sending text responses (WhatsApp, etc.)
 */
import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "../../../lib/utils";
import { MessageSquare, Send, CheckCircle, XCircle, Clock } from "lucide-react";

export interface TextResponseNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    text?: string;
    channel?: "whatsapp" | "sms" | "email" | "webhook";
    delay_ms?: number;
    variables?: string[];
  };
  status?: "pending" | "sent" | "delivered" | "error";
  stats?: {
    sent: number;
    delivered: number;
    failed: number;
  };
}

interface TextResponseNodeProps {
  id: string;
  data: TextResponseNodeData;
  selected?: boolean;
}

const channelColors: Record<string, { bg: string; text: string; icon: string }> = {
  whatsapp: { bg: "bg-green-100", text: "text-green-700", icon: "text-green-600" },
  sms: { bg: "bg-blue-100", text: "text-blue-700", icon: "text-blue-600" },
  email: { bg: "bg-purple-100", text: "text-purple-700", icon: "text-purple-600" },
  webhook: { bg: "bg-orange-100", text: "text-orange-700", icon: "text-orange-600" },
};

const TextResponseNode = ({ data, selected }: TextResponseNodeProps) => {
  const config = data.config || {};
  const channel = config.channel || "whatsapp";
  const defaultColors = { bg: 'bg-background-secondary', border: 'border-border', text: 'text-text-secondary', iconBg: 'bg-surface-hover' };
  const colors = channelColors[channel] || channelColors.whatsapp || defaultColors;

  const textPreview = useMemo(() => {
    const text = config.text || "";
    if (text.length > 80) return text.slice(0, 80) + "...";
    return text || "No message configured";
  }, [config.text]);

  // Find variables in text ({{variable}})
  const variableCount = useMemo(() => {
    const matches = (config.text || "").match(/\{\{[^}]+\}\}/g);
    return matches ? matches.length : 0;
  }, [config.text]);

  const StatusIcon = useMemo(() => {
    switch (data.status) {
      case "sent":
        return <Send className="w-4 h-4 text-blue-500" />;
      case "delivered":
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
        selected ? "ring-2 ring-teal-500" : "",
        "border-2 border-teal-300 hover:shadow-lg"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="p-2 rounded-lg bg-teal-100">
          <MessageSquare className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-text-primary truncate">
            {data.label || "Text Response"}
          </div>
          <div className="text-xs text-text-muted">Send Message</div>
        </div>
        {StatusIcon}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Channel */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Channel</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium capitalize",
            colors.bg, colors.text
          )}>
            {channel}
          </span>
        </div>

        {/* Message Preview */}
        <div className="mt-2 p-2 bg-background-secondary rounded border border-border">
          <p className="text-xs text-text-muted whitespace-pre-wrap line-clamp-3">
            {textPreview}
          </p>
        </div>

        {/* Variables indicator */}
        {variableCount > 0 && (
          <div className="text-xs text-purple-600">
            <span className="font-medium">{variableCount}</span> variable{variableCount > 1 ? "s" : ""} used
          </div>
        )}

        {/* Delay */}
        {config.delay_ms && config.delay_ms > 0 && (
          <div className="text-xs text-text-muted">
            Delay: <span className="font-medium">{config.delay_ms}ms</span>
          </div>
        )}

        {/* Stats */}
        {data.stats && (
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border">
            <span className="text-green-600">
              <span className="font-medium">{data.stats.delivered}</span> delivered
            </span>
            {data.stats.failed > 0 && (
              <span className="text-red-500">
                <span className="font-medium">{data.stats.failed}</span> failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left}
        className="w-3 h-3 rounded-full border-2 border-white bg-teal-500" />
      <Handle type="source" position={Position.Right}
        className="w-3 h-3 rounded-full border-2 border-white bg-teal-500" />
    </div>
  );
};

export default memo(TextResponseNode);
