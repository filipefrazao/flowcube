/**
 * FlowCube 3.0 - Node Configuration Editor
 * 
 * Dynamic configuration forms for each node type
 */
import { useCallback } from "react";
import { useWorkflowStore, useSelectedNode } from "../../../stores/workflowStore";
import { cn } from "../../../lib/utils";
import { 
  Globe, Bot, MessageSquare, GitBranch, Users,
  Plus, Minus, ChevronDown
} from "lucide-react";

interface NodeConfigEditorProps {
  className?: string;
}

// Type guard for node data
interface ConfigurableNodeData {
  type?: string;
  config?: Record<string, unknown>;
}

export default function NodeConfigEditor({ className }: NodeConfigEditorProps) {
  const selectedNode = useSelectedNode();
  const { updateNodeData } = useWorkflowStore();

  const updateConfig = useCallback((key: string, value: unknown) => {
    if (!selectedNode) return;
    const currentConfig = (selectedNode.data as ConfigurableNodeData).config || {};
    updateNodeData(selectedNode.id, {
      config: { ...currentConfig, [key]: value }
    });
  }, [selectedNode, updateNodeData]);

  if (!selectedNode) return null;

  const nodeData = selectedNode.data as ConfigurableNodeData;
  const nodeType = nodeData.type || "default";
  const config = nodeData.config || {};

  // Render config based on node type
  switch (nodeType) {
    case "http_request":
    case "webhook":
    case "n8n_webhook":
      return <HttpConfigEditor config={config} updateConfig={updateConfig} className={className} />;
    
    case "openai":
    case "claude":
    case "deepseek":
      return <AIConfigEditor config={config} nodeType={nodeType} updateConfig={updateConfig} className={className} />;
    
    case "webhook_trigger":
    case "whatsapp_trigger":
      return <WebhookTriggerConfigEditor config={config} updateConfig={updateConfig} className={className} />;
    
    case "text_response":
    case "whatsapp_template":
      return <TextResponseConfigEditor config={config} updateConfig={updateConfig} className={className} />;
    
    case "condition":
    case "decision_tree":
      return <ConditionConfigEditor config={config} updateConfig={updateConfig} className={className} />;
    
    case "salescube_create_lead":
      return <SalesCubeConfigEditor config={config} updateConfig={updateConfig} className={className} />;
    
    default:
      return (
        <div className={cn("text-sm text-gray-500 p-4", className)}>
          No configuration options for this node type.
        </div>
      );
  }
}

// HTTP Request Config
function HttpConfigEditor({ 
  config, 
  updateConfig, 
  className 
}: { 
  config: Record<string, unknown>; 
  updateConfig: (key: string, value: unknown) => void;
  className?: string;
}) {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Globe className="w-4 h-4 inline mr-1" />
          Method
        </label>
        <div className="flex gap-1">
          {methods.map((method) => (
            <button
              key={method}
              onClick={() => updateConfig("method", method)}
              className={cn(
                "flex-1 px-2 py-1.5 text-xs font-mono rounded border transition-colors",
                config.method === method
                  ? "bg-blue-100 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL
        </label>
        <input
          type="text"
          value={(config.url as string) || ""}
          onChange={(e) => updateConfig("url", e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">
          Use {"{{variable}}"} for dynamic values
        </p>
      </div>

      {/* Headers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Headers
        </label>
        <HeadersEditor 
          headers={(config.headers as Record<string, string>) || {}}
          onChange={(headers) => updateConfig("headers", headers)}
        />
      </div>

      {/* Body (for POST/PUT/PATCH) */}
      {["POST", "PUT", "PATCH"].includes(config.method as string) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Request Body (JSON)
          </label>
          <textarea
            value={typeof config.body === "string" ? config.body : JSON.stringify(config.body || {}, null, 2)}
            onChange={(e) => {
              try {
                updateConfig("body", JSON.parse(e.target.value));
              } catch {
                updateConfig("body", e.target.value);
              }
            }}
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      {/* Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Timeout (ms)
        </label>
        <input
          type="number"
          value={(config.timeout as number) || 30000}
          onChange={(e) => updateConfig("timeout", parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// Headers Editor Component
function HeadersEditor({
  headers,
  onChange
}: {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}) {
  const entries = Object.entries(headers);
  
  const addHeader = () => {
    onChange({ ...headers, "": "" });
  };
  
  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const newHeaders = { ...headers };
    if (oldKey !== newKey) delete newHeaders[oldKey];
    newHeaders[newKey] = value;
    onChange(newHeaders);
  };
  
  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    onChange(newHeaders);
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, value], idx) => (
        <div key={idx} className="flex gap-2">
          <input
            type="text"
            value={key}
            onChange={(e) => updateHeader(key, e.target.value, value)}
            placeholder="Header name"
            className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 font-mono"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => updateHeader(key, key, e.target.value)}
            placeholder="Value"
            className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 font-mono"
          />
          <button
            onClick={() => removeHeader(key)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addHeader}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
      >
        <Plus className="w-3 h-3" /> Add Header
      </button>
    </div>
  );
}

// AI Config Editor
function AIConfigEditor({
  config,
  nodeType,
  updateConfig,
  className
}: {
  config: Record<string, unknown>;
  nodeType: string;
  updateConfig: (key: string, value: unknown) => void;
  className?: string;
}) {
  const models: Record<string, string[]> = {
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"],
    claude: ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
    deepseek: ["deepseek-r1", "deepseek-r1-70b", "deepseek-coder"],
  };

  const availableModels = models[nodeType] || models.openai;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Model */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Bot className="w-4 h-4 inline mr-1" />
          Model
        </label>
        <select
          value={(config.model as string) || availableModels[0]}
          onChange={(e) => updateConfig("model", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {availableModels.map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          System Prompt
        </label>
        <textarea
          value={(config.system_prompt as string) || ""}
          onChange={(e) => updateConfig("system_prompt", e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="You are a helpful assistant..."
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Temperature: {((config.temperature as number) || 0.7).toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={(config.temperature as number) || 0.7}
          onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Tokens
        </label>
        <input
          type="number"
          value={(config.max_tokens as number) || 2000}
          onChange={(e) => updateConfig("max_tokens", parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// Webhook Trigger Config
function WebhookTriggerConfigEditor({
  config,
  updateConfig,
  className
}: {
  config: Record<string, unknown>;
  updateConfig: (key: string, value: unknown) => void;
  className?: string;
}) {
  const sources = ["evolution", "n8n", "salescube", "custom"];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Webhook Source
        </label>
        <select
          value={(config.source as string) || "evolution"}
          onChange={(e) => updateConfig("source", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {sources.map((source) => (
            <option key={source} value={source}>{source.charAt(0).toUpperCase() + source.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Webhook Path */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Webhook Path
        </label>
        <input
          type="text"
          value={(config.webhook_path as string) || ""}
          onChange={(e) => updateConfig("webhook_path", e.target.value)}
          placeholder="my-workflow"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          URL: /api/v1/webhooks/{(config.webhook_path as string) || "my-workflow"}
        </p>
      </div>

      {/* Secret */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Secret (optional)
        </label>
        <input
          type="password"
          value={(config.secret as string) || ""}
          onChange={(e) => updateConfig("secret", e.target.value)}
          placeholder="Webhook secret for validation"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// Text Response Config
function TextResponseConfigEditor({
  config,
  updateConfig,
  className
}: {
  config: Record<string, unknown>;
  updateConfig: (key: string, value: unknown) => void;
  className?: string;
}) {
  const channels = ["whatsapp", "sms", "email", "webhook"];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Channel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Channel
        </label>
        <select
          value={(config.channel as string) || "whatsapp"}
          onChange={(e) => updateConfig("channel", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {channels.map((channel) => (
            <option key={channel} value={channel}>{channel.charAt(0).toUpperCase() + channel.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Message Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message
        </label>
        <textarea
          value={(config.text as string) || ""}
          onChange={(e) => updateConfig("text", e.target.value)}
          rows={5}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Hello {{name}}! Your order is ready."
        />
        <p className="text-xs text-gray-400 mt-1">
          Use {"{{variable}}"} for dynamic content
        </p>
      </div>

      {/* Delay */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delay (ms)
        </label>
        <input
          type="number"
          value={(config.delay_ms as number) || 0}
          onChange={(e) => updateConfig("delay_ms", parseInt(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>
    </div>
  );
}

// Condition Config
function ConditionConfigEditor({
  config,
  updateConfig,
  className
}: {
  config: Record<string, unknown>;
  updateConfig: (key: string, value: unknown) => void;
  className?: string;
}) {
  const operators = [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Not Equals" },
    { value: "contains", label: "Contains" },
    { value: "starts_with", label: "Starts With" },
    { value: "ends_with", label: "Ends With" },
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
    { value: "is_empty", label: "Is Empty" },
    { value: "is_not_empty", label: "Is Not Empty" },
  ];

  const conditions = (config.conditions as Array<{id: string; field: string; operator: string; value: string; label: string}>) || [];

  const addCondition = () => {
    updateConfig("conditions", [
      ...conditions,
      { id: `cond-${Date.now()}`, field: "", operator: "equals", value: "", label: `Branch ${conditions.length + 1}` }
    ]);
  };

  const updateCondition = (idx: number, updates: Partial<typeof conditions[0]>) => {
    const newConditions = [...conditions];
    newConditions[idx] = { ...newConditions[idx], ...updates };
    updateConfig("conditions", newConditions);
  };

  const removeCondition = (idx: number) => {
    updateConfig("conditions", conditions.filter((_, i) => i !== idx));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <GitBranch className="w-4 h-4 inline mr-1" />
          Conditions
        </label>

        <div className="space-y-3">
          {conditions.map((condition, idx) => (
            <div key={condition.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={condition.label}
                  onChange={(e) => updateCondition(idx, { label: e.target.value })}
                  className="text-sm font-medium bg-transparent border-none focus:ring-0 p-0"
                  placeholder="Branch name"
                />
                <button
                  onClick={() => removeCondition(idx)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
              
              <input
                type="text"
                value={condition.field}
                onChange={(e) => updateCondition(idx, { field: e.target.value })}
                placeholder="Field (e.g., intent, message)"
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
              />
              
              <div className="flex gap-2">
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(idx, { operator: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                >
                  {operators.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                
                {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addCondition}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
        >
          <Plus className="w-3 h-3" /> Add Condition
        </button>
      </div>

      {/* Default Output */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Branch (else)
        </label>
        <input
          type="text"
          value={(config.default_output as string) || "else"}
          onChange={(e) => updateConfig("default_output", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// SalesCube Config
function SalesCubeConfigEditor({
  config,
  updateConfig,
  className
}: {
  config: Record<string, unknown>;
  updateConfig: (key: string, value: unknown) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Action */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          Action
        </label>
        <select
          value={(config.action as string) || "create_lead"}
          onChange={(e) => updateConfig("action", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="create_lead">Create Lead</option>
          <option value="update_lead">Update Lead</option>
          <option value="get_lead">Get Lead</option>
        </select>
      </div>

      {/* Channel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Channel ID
        </label>
        <input
          type="number"
          value={(config.channel as number) || ""}
          onChange={(e) => updateConfig("channel", parseInt(e.target.value))}
          placeholder="78"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Column */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Column ID
        </label>
        <input
          type="number"
          value={(config.column as number) || ""}
          onChange={(e) => updateConfig("column", parseInt(e.target.value))}
          placeholder="48"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Origin */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Origin ID
        </label>
        <input
          type="number"
          value={(config.origin as number) || ""}
          onChange={(e) => updateConfig("origin", parseInt(e.target.value))}
          placeholder="11"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Field Mapping */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Field Mapping
        </label>
        <div className="space-y-2 text-xs">
          <div className="flex gap-2">
            <span className="w-20 text-gray-500">name →</span>
            <input
              type="text"
              value={((config.mapping as Record<string, string>) || {}).name || "{{contact_name}}"}
              onChange={(e) => updateConfig("mapping", { ...((config.mapping as Record<string, string>) || {}), name: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-200 rounded font-mono"
            />
          </div>
          <div className="flex gap-2">
            <span className="w-20 text-gray-500">phone →</span>
            <input
              type="text"
              value={((config.mapping as Record<string, string>) || {}).phone || "{{phone}}"}
              onChange={(e) => updateConfig("mapping", { ...((config.mapping as Record<string, string>) || {}), phone: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-200 rounded font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
