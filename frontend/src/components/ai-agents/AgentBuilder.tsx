/**
 * FlowCube - Agent Builder Component
 * Visual agent configuration with multi-step wizard
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Brain,
  Wrench,
  Database,
  Shield,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Plus,
  Trash2,
  Sparkles,
  MessageSquare,
  Thermometer,
  Hash,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAgentStore } from "@/stores/aiAgentStore";
import type {
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentDefinition,
  AgentModelConfig,
  AgentPersonality,
  AgentGuardrails,
  LLMProviderType,
} from "@/types/aiAgents.types";

interface AgentBuilderProps {
  agent?: AgentDefinition | null;
  onClose: () => void;
  onSave?: (agent: AgentDefinition) => void;
}

const STEPS = [
  { id: "basics", label: "Basics", icon: Bot, description: "Name and description" },
  { id: "model", label: "Model", icon: Brain, description: "LLM configuration" },
  { id: "prompt", label: "Prompt", icon: MessageSquare, description: "System instructions" },
  { id: "tools", label: "Tools", icon: Wrench, description: "Available tools" },
  { id: "knowledge", label: "Knowledge", icon: Database, description: "Knowledge bases" },
  { id: "guardrails", label: "Guardrails", icon: Shield, description: "Safety settings" },
];

const PERSONALITY_TONES = [
  { value: "professional", label: "Professional", emoji: "👔" },
  { value: "friendly", label: "Friendly", emoji: "😊" },
  { value: "casual", label: "Casual", emoji: "😎" },
  { value: "formal", label: "Formal", emoji: "🎩" },
  { value: "empathetic", label: "Empathetic", emoji: "💝" },
];

const RESPONSE_STYLES = [
  { value: "concise", label: "Concise", description: "Brief, to-the-point responses" },
  { value: "detailed", label: "Detailed", description: "Comprehensive explanations" },
  { value: "conversational", label: "Conversational", description: "Natural dialogue flow" },
];

export default function AgentBuilder({ agent, onClose, onSave }: AgentBuilderProps) {
  const {
    providers,
    tools,
    knowledgeBases,
    fetchProviders,
    fetchTools,
    fetchKnowledgeBases,
    createAgent,
    updateAgent,
    availableModels,
    fetchModels,
  } = useAIAgentStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    avatar_url: string;
    model_config: AgentModelConfig;
    system_prompt: string;
    personality: AgentPersonality;
    guardrails: AgentGuardrails;
    tool_ids: string[];
    knowledge_base_ids: string[];
    fallback_response: string;
    tags: string[];
  }>({
    name: agent?.name || "",
    description: agent?.description || "",
    avatar_url: agent?.avatar_url || "",
    model_config: agent?.model_config || {
      provider_id: "",
      model: "",
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
    },
    system_prompt: agent?.system_prompt || "",
    personality: agent?.personality || {
      tone: "professional",
      response_style: "conversational",
    },
    guardrails: agent?.guardrails || {
      max_conversation_turns: 50,
      max_tokens_per_response: 4096,
      content_moderation: true,
    },
    tool_ids: agent?.tool_ids || [],
    knowledge_base_ids: agent?.knowledge_base_ids || [],
    fallback_response: agent?.fallback_response || "I apologize, but I'm unable to help with that request.",
    tags: agent?.tags || [],
  });

  const [newTag, setNewTag] = useState("");

  // Load data on mount
  useEffect(() => {
    fetchProviders();
    fetchTools(true);
    fetchKnowledgeBases();
  }, [fetchProviders, fetchTools, fetchKnowledgeBases]);

  // Load models when provider changes
  useEffect(() => {
    if (formData.model_config.provider_id) {
      fetchModels(formData.model_config.provider_id);
    }
  }, [formData.model_config.provider_id, fetchModels]);

  const updateFormData = useCallback((path: string, value: unknown) => {
    setFormData((prev) => {
      const keys = path.split(".");
      const newData = { ...prev };
      let current: Record<string, unknown> = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
        current = current[keys[i]] as Record<string, unknown>;
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[path];
      return newErrors;
    });
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basics
        if (!formData.name.trim()) {
          newErrors.name = "Agent name is required";
        }
        break;
      case 1: // Model
        if (!formData.model_config.provider_id) {
          newErrors["model_config.provider_id"] = "Please select a provider";
        }
        if (!formData.model_config.model) {
          newErrors["model_config.model"] = "Please select a model";
        }
        break;
      case 2: // Prompt
        if (!formData.system_prompt.trim()) {
          newErrors.system_prompt = "System prompt is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSave = useCallback(async () => {
    // Validate all steps
    for (let i = 0; i <= currentStep; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    setIsSaving(true);
    try {
      const agentData: AgentCreateRequest = {
        name: formData.name,
        description: formData.description || undefined,
        avatar_url: formData.avatar_url || undefined,
        model_config: formData.model_config,
        system_prompt: formData.system_prompt,
        personality: formData.personality,
        guardrails: formData.guardrails,
        tool_ids: formData.tool_ids.length > 0 ? formData.tool_ids : undefined,
        knowledge_base_ids: formData.knowledge_base_ids.length > 0 ? formData.knowledge_base_ids : undefined,
        fallback_response: formData.fallback_response || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      };

      let savedAgent: AgentDefinition;
      if (agent) {
        savedAgent = await updateAgent(agent.id, agentData as AgentUpdateRequest);
      } else {
        savedAgent = await createAgent(agentData);
      }

      onSave?.(savedAgent);
      onClose();
    } catch (error) {
      console.error("Failed to save agent:", error);
      setErrors({ save: error instanceof Error ? error.message : "Failed to save agent" });
    } finally {
      setIsSaving(false);
    }
  }, [agent, formData, currentStep, validateStep, createAgent, updateAgent, onSave, onClose]);

  const addTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormData("tags", [...formData.tags, newTag.trim()]);
      setNewTag("");
    }
  }, [newTag, formData.tags, updateFormData]);

  const removeTag = useCallback((tag: string) => {
    updateFormData("tags", formData.tags.filter((t) => t !== tag));
  }, [formData.tags, updateFormData]);

  const toggleTool = useCallback((toolId: string) => {
    const newToolIds = formData.tool_ids.includes(toolId)
      ? formData.tool_ids.filter((id) => id !== toolId)
      : [...formData.tool_ids, toolId];
    updateFormData("tool_ids", newToolIds);
  }, [formData.tool_ids, updateFormData]);

  const toggleKnowledgeBase = useCallback((kbId: string) => {
    const newKbIds = formData.knowledge_base_ids.includes(kbId)
      ? formData.knowledge_base_ids.filter((id) => id !== kbId)
      : [...formData.knowledge_base_ids, kbId];
    updateFormData("knowledge_base_ids", newKbIds);
  }, [formData.knowledge_base_ids, updateFormData]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basics
        return (
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                placeholder="e.g., Customer Support Agent"
                className={cn(
                  "w-full px-4 py-3 rounded-lg border bg-white",
                  "focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                  errors.name ? "border-red-300" : "border-gray-200"
                )}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                placeholder="Describe what this agent does..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avatar URL
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => updateFormData("avatar_url", e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                {formData.avatar_url && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={formData.avatar_url}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-pink-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );

      case 1: // Model
        return (
          <div className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Provider <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => updateFormData("model_config.provider_id", provider.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      formData.model_config.provider_id === provider.id
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="font-medium text-gray-900">{provider.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{provider.type}</div>
                    {provider.is_default && (
                      <span className="mt-1 inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                        Default
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {errors["model_config.provider_id"] && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors["model_config.provider_id"]}
                </p>
              )}
            </div>

            {/* Model Selection */}
            {formData.model_config.provider_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.model_config.model}
                  onChange={(e) => updateFormData("model_config.model", e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-lg border bg-white",
                    "focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                    errors["model_config.model"] ? "border-red-300" : "border-gray-200"
                  )}
                >
                  <option value="">Select a model...</option>
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.context_window.toLocaleString()} tokens)
                    </option>
                  ))}
                </select>
                {errors["model_config.model"] && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors["model_config.model"]}
                  </p>
                )}
              </div>
            )}

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  Temperature: {formData.model_config.temperature}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.model_config.temperature}
                onChange={(e) => updateFormData("model_config.temperature", parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Precise (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Max Output Tokens
                </span>
              </label>
              <input
                type="number"
                min="256"
                max="128000"
                value={formData.model_config.max_tokens}
                onChange={(e) => updateFormData("model_config.max_tokens", parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 2: // Prompt
        return (
          <div className="space-y-6">
            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => updateFormData("system_prompt", e.target.value)}
                placeholder="You are a helpful assistant..."
                rows={10}
                className={cn(
                  "w-full px-4 py-3 rounded-lg border bg-white font-mono text-sm",
                  "focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                  errors.system_prompt ? "border-red-300" : "border-gray-200"
                )}
              />
              {errors.system_prompt && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.system_prompt}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.system_prompt.length} characters
              </p>
            </div>

            {/* Personality Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personality Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {PERSONALITY_TONES.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => updateFormData("personality.tone", tone.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 transition-all",
                      formData.personality.tone === tone.value
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className="mr-2">{tone.emoji}</span>
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Response Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Style
              </label>
              <div className="space-y-2">
                {RESPONSE_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => updateFormData("personality.response_style", style.value)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all",
                      formData.personality.response_style === style.value
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="font-medium text-gray-900">{style.label}</div>
                    <div className="text-sm text-gray-500">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fallback Response */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fallback Response
              </label>
              <textarea
                value={formData.fallback_response}
                onChange={(e) => updateFormData("fallback_response", e.target.value)}
                placeholder="Response when the agent cannot help..."
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 3: // Tools
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Select the tools this agent can use to accomplish tasks.
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 text-left transition-all",
                    formData.tool_ids.includes(tool.id)
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{tool.name}</span>
                        {tool.is_builtin && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      formData.tool_ids.includes(tool.id)
                        ? "border-pink-500 bg-pink-500"
                        : "border-gray-300"
                    )}>
                      {formData.tool_ids.includes(tool.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {tools.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No tools available. Create one in the Tools section.</p>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {formData.tool_ids.length} tool(s) selected
            </p>
          </div>
        );

      case 4: // Knowledge
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Connect knowledge bases to give your agent access to custom information.
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {knowledgeBases.map((kb) => (
                <button
                  key={kb.id}
                  onClick={() => toggleKnowledgeBase(kb.id)}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 text-left transition-all",
                    formData.knowledge_base_ids.includes(kb.id)
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{kb.name}</span>
                      </div>
                      {kb.description && (
                        <p className="text-sm text-gray-500 mt-1">{kb.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>{kb.document_count} documents</span>
                        <span>{kb.total_chunks.toLocaleString()} chunks</span>
                      </div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      formData.knowledge_base_ids.includes(kb.id)
                        ? "border-pink-500 bg-pink-500"
                        : "border-gray-300"
                    )}>
                      {formData.knowledge_base_ids.includes(kb.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {knowledgeBases.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No knowledge bases available. Create one first.</p>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {formData.knowledge_base_ids.length} knowledge base(s) selected
            </p>
          </div>
        );

      case 5: // Guardrails
        return (
          <div className="space-y-6">
            {/* Max Conversation Turns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Conversation Turns
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.guardrails.max_conversation_turns || 50}
                onChange={(e) => updateFormData("guardrails.max_conversation_turns", parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum number of back-and-forth messages in a conversation
              </p>
            </div>

            {/* Max Tokens Per Response */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens Per Response
              </label>
              <input
                type="number"
                min="256"
                max="128000"
                value={formData.guardrails.max_tokens_per_response || 4096}
                onChange={(e) => updateFormData("guardrails.max_tokens_per_response", parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            {/* Content Moderation */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
              <div>
                <div className="font-medium text-gray-900">Content Moderation</div>
                <div className="text-sm text-gray-500">Filter inappropriate content</div>
              </div>
              <button
                onClick={() => updateFormData("guardrails.content_moderation", !formData.guardrails.content_moderation)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  formData.guardrails.content_moderation ? "bg-pink-500" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    formData.guardrails.content_moderation ? "left-7" : "left-1"
                  )}
                />
              </button>
            </div>

            {/* PII Redaction */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
              <div>
                <div className="font-medium text-gray-900">PII Redaction</div>
                <div className="text-sm text-gray-500">Automatically redact personal information</div>
              </div>
              <button
                onClick={() => updateFormData("guardrails.pii_redaction", !formData.guardrails.pii_redaction)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  formData.guardrails.pii_redaction ? "bg-pink-500" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    formData.guardrails.pii_redaction ? "left-7" : "left-1"
                  )}
                />
              </button>
            </div>

            {/* Require Tool Confirmation */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
              <div>
                <div className="font-medium text-gray-900">Require Tool Confirmation</div>
                <div className="text-sm text-gray-500">Ask before executing tools</div>
              </div>
              <button
                onClick={() => updateFormData("guardrails.require_tool_confirmation", !formData.guardrails.require_tool_confirmation)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  formData.guardrails.require_tool_confirmation ? "bg-pink-500" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    formData.guardrails.require_tool_confirmation ? "left-7" : "left-1"
                  )}
                />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {agent ? "Edit Agent" : "Create New Agent"}
              </h2>
              <p className="text-sm text-gray-500">
                {STEPS[currentStep].description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  className={cn(
                    "flex flex-col items-center gap-1 group",
                    index <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isActive
                        ? "bg-pink-500 text-white"
                        : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isActive ? "text-pink-600" : "text-gray-500"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {errors.save && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {errors.save}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
              currentStep === 0
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-pink-500 text-white font-medium hover:bg-pink-600 transition-all"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {agent ? "Update Agent" : "Create Agent"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
