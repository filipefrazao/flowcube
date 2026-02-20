/**
 * FlowCube - Tool Editor Component
 * Create and edit custom tools for AI agents
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  Code,
  Globe,
  Database,
  Search,
  X,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  Copy,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAgentStore } from "@/stores/aiAgentStore";
import type {
  AgentTool,
  AgentToolCreateRequest,
  ToolType,
  ToolParameter,
  ToolDefinition,
  HttpToolConfig,
  CodeToolConfig,
  RetrievalToolConfig,
} from "@/types/aiAgents.types";

interface ToolEditorProps {
  tool?: AgentTool | null;
  onClose: () => void;
  onSave?: (tool: AgentTool) => void;
}

const TOOL_TYPES: Array<{ value: ToolType; label: string; icon: typeof Wrench; description: string }> = [
  { value: "function" as ToolType, label: "Function", icon: Wrench, description: "Custom function tool" },
  { value: "http" as ToolType, label: "HTTP Request", icon: Globe, description: "Make HTTP API calls" },
  { value: "code" as ToolType, label: "Code Execution", icon: Code, description: "Execute JavaScript/Python" },
  { value: "retrieval" as ToolType, label: "Retrieval", icon: Search, description: "Query knowledge bases" },
];

const PARAM_TYPES = ["string", "number", "boolean", "array", "object"] as const;

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

interface ParameterEditorProps {
  parameter: ToolParameter & { key: string };
  onChange: (param: ToolParameter & { key: string }) => void;
  onDelete: () => void;
}

function ParameterEditor({ parameter, onChange, onDelete }: ParameterEditorProps) {
  return (
    <div className="p-4 rounded-lg border border-border bg-background-secondary space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Name</label>
            <input
              type="text"
              value={parameter.key}
              onChange={(e) => onChange({ ...parameter, key: e.target.value, name: e.target.value })}
              placeholder="parameter_name"
              className="w-full px-3 py-2 rounded-lg border border-border text-sm font-mono focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
            <select
              value={parameter.type}
              onChange={(e) => onChange({ ...parameter, type: e.target.value as typeof PARAM_TYPES[number] })}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              {PARAM_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="ml-2 p-2 rounded-lg hover:bg-red-100 text-text-secondary hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
        <input
          type="text"
          value={parameter.description}
          onChange={(e) => onChange({ ...parameter, description: e.target.value })}
          placeholder="Describe this parameter..."
          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={parameter.required}
            onChange={(e) => onChange({ ...parameter, required: e.target.checked })}
            className="rounded border-border text-pink-500 focus:ring-pink-500"
          />
          Required
        </label>
        {!parameter.required && (
          <div className="flex-1">
            <input
              type="text"
              value={String(parameter.default ?? "")}
              onChange={(e) => onChange({ ...parameter, default: e.target.value || undefined })}
              placeholder="Default value"
              className="w-full px-3 py-1.5 rounded border border-border text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToolEditor({ tool, onClose, onSave }: ToolEditorProps) {
  const { createTool, updateTool, testTool, knowledgeBases, fetchKnowledgeBases } = useAIAgentStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; result?: unknown; error?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState(tool?.name || "");
  const [description, setDescription] = useState(tool?.description || "");
  const [toolType, setToolType] = useState<ToolType>(tool?.type || "function" as ToolType);
  const [parameters, setParameters] = useState<Array<ToolParameter & { key: string }>>(
    tool?.definition?.parameters?.properties
      ? Object.entries(tool.definition.parameters.properties).map(([key, param]) => ({
          ...param,
          key,
          required: tool.definition.parameters.required?.includes(key) || false,
        }))
      : []
  );

  // HTTP config
  const [httpMethod, setHttpMethod] = useState<typeof HTTP_METHODS[number]>(
    (tool?.config as HttpToolConfig)?.method || "POST"
  );
  const [httpUrl, setHttpUrl] = useState((tool?.config as HttpToolConfig)?.url || "");
  const [httpHeaders, setHttpHeaders] = useState(
    JSON.stringify((tool?.config as HttpToolConfig)?.headers || {}, null, 2)
  );
  const [httpBodyTemplate, setHttpBodyTemplate] = useState(
    (tool?.config as HttpToolConfig)?.body_template || ""
  );

  // Code config
  const [codeLanguage, setCodeLanguage] = useState<"javascript" | "python">(
    (tool?.config as CodeToolConfig)?.language || "javascript"
  );
  const [code, setCode] = useState((tool?.config as CodeToolConfig)?.code || "");

  // Retrieval config
  const [knowledgeBaseId, setKnowledgeBaseId] = useState(
    (tool?.config as RetrievalToolConfig)?.knowledge_base_id || ""
  );
  const [topK, setTopK] = useState((tool?.config as RetrievalToolConfig)?.top_k || 5);

  // Test arguments
  const [testArgs, setTestArgs] = useState("{}");

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  const addParameter = useCallback(() => {
    setParameters((prev) => [
      ...prev,
      {
        key: `param_${Date.now()}`,
        name: "new_param",
        type: "string",
        description: "",
        required: false,
      },
    ]);
  }, []);

  const updateParameter = useCallback((index: number, param: ToolParameter & { key: string }) => {
    setParameters((prev) => {
      const next = [...prev];
      next[index] = param;
      return next;
    });
  }, []);

  const deleteParameter = useCallback((index: number) => {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const buildToolConfig = useCallback(() => {
    switch (toolType) {
      case "http":
        return {
          method: httpMethod,
          url: httpUrl,
          headers: JSON.parse(httpHeaders || "{}"),
          body_template: httpBodyTemplate || undefined,
        } as HttpToolConfig;
      case "code":
        return {
          language: codeLanguage,
          code,
        } as CodeToolConfig;
      case "retrieval":
        return {
          knowledge_base_id: knowledgeBaseId,
          top_k: topK,
        } as RetrievalToolConfig;
      default:
        return {};
    }
  }, [toolType, httpMethod, httpUrl, httpHeaders, httpBodyTemplate, codeLanguage, code, knowledgeBaseId, topK]);

  const buildToolDefinition = useCallback((): ToolDefinition => {
    const properties: Record<string, ToolParameter> = {};
    const required: string[] = [];

    parameters.forEach((param) => {
      properties[param.key] = {
        name: param.key,
        type: param.type,
        description: param.description,
        required: param.required,
        default: param.default,
      };
      if (param.required) {
        required.push(param.key);
      }
    });

    return {
      name,
      description,
      parameters: {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      },
    };
  }, [name, description, parameters]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Tool name is required";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    if (toolType === "http" && !httpUrl.trim()) {
      newErrors.httpUrl = "URL is required for HTTP tools";
    }
    if (toolType === "code" && !code.trim()) {
      newErrors.code = "Code is required";
    }
    if (toolType === "retrieval" && !knowledgeBaseId) {
      newErrors.knowledgeBaseId = "Please select a knowledge base";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description, toolType, httpUrl, code, knowledgeBaseId]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const toolData: AgentToolCreateRequest = {
        name,
        description,
        type: toolType,
        definition: buildToolDefinition(),
        config: buildToolConfig(),
      };

      let savedTool: AgentTool;
      if (tool) {
        savedTool = await updateTool(tool.id, toolData);
      } else {
        savedTool = await createTool(toolData);
      }

      onSave?.(savedTool);
      onClose();
    } catch (error) {
      console.error("Failed to save tool:", error);
      setErrors({ save: error instanceof Error ? error.message : "Failed to save tool" });
    } finally {
      setIsSaving(false);
    }
  }, [tool, name, description, toolType, validate, buildToolDefinition, buildToolConfig, createTool, updateTool, onSave, onClose]);

  const handleTest = useCallback(async () => {
    if (!tool) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const args = JSON.parse(testArgs);
      const result = await testTool(tool.id, args);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      });
    } finally {
      setIsTesting(false);
    }
  }, [tool, testArgs, testTool]);

  const renderTypeConfig = () => {
    switch (toolType) {
      case "http":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Method</label>
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value as typeof HTTP_METHODS[number])}
                  className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  {HTTP_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={httpUrl}
                  onChange={(e) => setHttpUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                    errors.httpUrl ? "border-red-300" : "border-border"
                  )}
                />
                {errors.httpUrl && (
                  <p className="mt-1 text-xs text-red-500">{errors.httpUrl}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Headers (JSON)</label>
              <textarea
                value={httpHeaders}
                onChange={(e) => setHttpHeaders(e.target.value)}
                rows={3}
                placeholder='{"Content-Type": "application/json"}'
                className="w-full px-3 py-2 rounded-lg border border-border font-mono text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Body Template
                <span className="text-xs text-text-muted ml-2">Use {'{'}{'{'} param_name {'}'}{'}' } for variables</span>
              </label>
              <textarea
                value={httpBodyTemplate}
                onChange={(e) => setHttpBodyTemplate(e.target.value)}
                rows={4}
                placeholder='{"query": "{{query}}", "limit": {{limit}}}'
                className="w-full px-3 py-2 rounded-lg border border-border font-mono text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case "code":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Language</label>
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value as "javascript" | "python")}
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Code <span className="text-red-500">*</span>
                <span className="text-xs text-text-muted ml-2">Parameters available as variables</span>
              </label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={10}
                placeholder={codeLanguage === "javascript"
                  ? "// Access parameters: input.param_name\nreturn { result: 'success' };"
                  : "# Access parameters: input['param_name']\nreturn {'result': 'success'}"
                }
                className={cn(
                  "w-full px-3 py-2 rounded-lg border font-mono text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                  errors.code ? "border-red-300" : "border-border"
                )}
              />
              {errors.code && (
                <p className="mt-1 text-xs text-red-500">{errors.code}</p>
              )}
            </div>
          </div>
        );

      case "retrieval":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Knowledge Base <span className="text-red-500">*</span>
              </label>
              <select
                value={knowledgeBaseId}
                onChange={(e) => setKnowledgeBaseId(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                  errors.knowledgeBaseId ? "border-red-300" : "border-border"
                )}
              >
                <option value="">Select a knowledge base...</option>
                {knowledgeBases.map((kb) => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
              {errors.knowledgeBaseId && (
                <p className="mt-1 text-xs text-red-500">{errors.knowledgeBaseId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Top K Results</label>
              <input
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-text-muted text-center py-8">
            Configure parameters below. The function will be called with these parameters.
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
              <Wrench className="w-6 h-6 text-text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {tool ? "Edit Tool" : "Create New Tool"}
              </h2>
              <p className="text-sm text-text-muted">
                Define a tool for AI agents to use
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Tool Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\s+/g, "_").toLowerCase())}
                placeholder="get_weather"
                className={cn(
                  "w-full px-4 py-3 rounded-lg border font-mono focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                  errors.name ? "border-red-300" : "border-border"
                )}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Get the current weather for a location..."
                rows={2}
                className={cn(
                  "w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                  errors.description ? "border-red-300" : "border-border"
                )}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-500">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Tool Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Tool Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TOOL_TYPES.map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  onClick={() => setToolType(value)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    toolType === value
                      ? "border-pink-500 bg-pink-50"
                      : "border-border hover:border-border"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 mb-1",
                    toolType === value ? "text-pink-500" : "text-text-muted"
                  )} />
                  <div className="font-medium text-sm text-text-primary">{label}</div>
                  <div className="text-xs text-text-muted">{description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Type-specific Config */}
          <div className="p-4 rounded-lg border border-border bg-background-secondary">
            <h3 className="font-medium text-text-primary mb-4">Configuration</h3>
            {renderTypeConfig()}
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-text-primary">Parameters</h3>
              <button
                onClick={addParameter}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface text-sm text-text-secondary"
              >
                <Plus className="w-4 h-4" />
                Add Parameter
              </button>
            </div>
            <div className="space-y-3">
              {parameters.map((param, index) => (
                <ParameterEditor
                  key={index}
                  parameter={param}
                  onChange={(p) => updateParameter(index, p)}
                  onDelete={() => deleteParameter(index)}
                />
              ))}
              {parameters.length === 0 && (
                <div className="text-center py-8 text-text-muted border border-dashed border-border rounded-lg">
                  No parameters defined. Click "Add Parameter" to add one.
                </div>
              )}
            </div>
          </div>

          {/* Test Section (only for existing tools) */}
          {tool && (
            <div className="p-4 rounded-lg border border-border bg-background-secondary">
              <h3 className="font-medium text-text-primary mb-3">Test Tool</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Test Arguments (JSON)
                  </label>
                  <textarea
                    value={testArgs}
                    onChange={(e) => setTestArgs(e.target.value)}
                    rows={3}
                    placeholder='{"param_name": "value"}'
                    className="w-full px-3 py-2 rounded-lg border border-border font-mono text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-text-primary hover:bg-blue-600 disabled:opacity-50"
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Run Test
                </button>
                {testResult && (
                  <div className={cn(
                    "p-3 rounded-lg",
                    testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  )}>
                    <div className={cn(
                      "font-medium text-sm mb-1",
                      testResult.success ? "text-green-700" : "text-red-700"
                    )}>
                      {testResult.success ? "Success" : "Error"}
                    </div>
                    <pre className="text-xs overflow-auto max-h-40">
                      {testResult.success
                        ? JSON.stringify(testResult.result, null, 2)
                        : testResult.error}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {errors.save && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {errors.save}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-background-secondary">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-text-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-text-primary font-medium hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {tool ? "Update Tool" : "Create Tool"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
