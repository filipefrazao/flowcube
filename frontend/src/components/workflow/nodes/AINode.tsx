/**
 * FlowCube 3.0 - AI Node
 * 
 * Specialized node for AI model configuration (OpenAI, Claude, DeepSeek)
 */
import { memo, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "../../../lib/utils";
import { Bot, Brain, Sparkles, Loader2, CheckCircle, XCircle, Thermometer } from "lucide-react";

const providerConfig: Record<string, { 
  icon: typeof Bot; 
  color: string; 
  bgColor: string;
  borderColor: string;
  models: string[];
}> = {
  openai: {
    icon: Bot,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"],
  },
  claude: {
    icon: Brain,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    models: ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
  },
  deepseek: {
    icon: Sparkles,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    borderColor: "border-indigo-300",
    models: ["deepseek-r1", "deepseek-r1-70b", "deepseek-coder"],
  },
};

export interface AINodeData extends Record<string, unknown> {
  label: string;
  type: string;
  config?: {
    provider?: "openai" | "claude" | "deepseek";
    model?: string;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
  };
  status?: "pending" | "running" | "success" | "error";
  lastResponse?: {
    tokens?: number;
    duration?: number;
    error?: string;
  };
}

interface AINodeProps {
  id: string;
  data: AINodeData;
  selected?: boolean;
}

const AINode = ({ data, selected }: AINodeProps) => {
  const config = data.config || {};
  const provider = config.provider || data.type as keyof typeof providerConfig || "openai";
  const defaultProviderInfo = { icon: Bot, name: 'AI', borderColor: 'border-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600', models: ['gpt-4'] };
  const providerInfo = providerConfig[provider] || providerConfig.openai || defaultProviderInfo;
  const Icon = providerInfo.icon;
  const model = config.model || providerInfo.models[0];
  const temperature = config.temperature ?? 0.7;

  const systemPromptPreview = useMemo(() => {
    const prompt = config.system_prompt || "";
    return prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;
  }, [config.system_prompt]);

  const StatusIndicator = useMemo(() => {
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

  return (
    <div
      className={cn(
        "relative rounded-lg shadow-md transition-all duration-200 min-w-[220px] bg-white",
        selected ? "ring-2 ring-pink-500" : "",
        providerInfo.borderColor,
        "border-2 hover:shadow-lg"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 p-3 border-b border-gray-100",
        "bg-gradient-to-r from-pink-50 to-purple-50"
      )}>
        <div className={cn("p-2 rounded-lg", providerInfo.bgColor)}>
          <Icon className={cn("w-5 h-5", providerInfo.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-800 truncate">
            {data.label || provider.charAt(0).toUpperCase() + provider.slice(1)}
          </div>
          <div className="text-xs text-gray-500 capitalize">{provider} AI</div>
        </div>
        {StatusIndicator}
      </div>

      {/* Config Preview */}
      <div className="p-3 space-y-2">
        {/* Model */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Model</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-mono font-medium",
            providerInfo.bgColor, providerInfo.color
          )}>
            {model}
          </span>
        </div>

        {/* Temperature */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Thermometer className="w-3 h-3" />
            Temp
          </span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full", providerInfo.bgColor.replace("100", "400"))}
                style={{ width: `${temperature * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-600">{temperature}</span>
          </div>
        </div>

        {/* System Prompt Preview */}
        {config.system_prompt && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400 block mb-1">System Prompt</span>
            <p className="text-xs text-gray-600 italic line-clamp-2">
              "{systemPromptPreview}"
            </p>
          </div>
        )}

        {/* Last Response Stats */}
        {data.lastResponse && (
          <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
            {data.lastResponse.tokens && (
              <span className="text-gray-500">
                <span className="font-medium">{data.lastResponse.tokens}</span> tokens
              </span>
            )}
            {data.lastResponse.duration && (
              <span className="text-gray-400">{data.lastResponse.duration}ms</span>
            )}
          </div>
        )}

        {data.lastResponse?.error && (
          <div className="text-xs text-red-500 truncate">{data.lastResponse.error}</div>
        )}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left}
        className={cn("w-3 h-3 rounded-full border-2 border-white", 
          providerInfo.bgColor.replace("100", "500"))} />
      <Handle type="source" position={Position.Right}
        className={cn("w-3 h-3 rounded-full border-2 border-white",
          providerInfo.bgColor.replace("100", "500"))} />
    </div>
  );
};

export default memo(AINode);
