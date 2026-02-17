/**
 * FlowCube 4.0 - Node Types Registry (DEFINITIVE FIX)
 *
 * Registers all custom node types for React Flow
 * Uses comprehensive Proxy with multiple traps to prevent React Error #130
 */
"use client";

import React, { memo } from "react";
import { NodeTypes, NodeProps } from "@xyflow/react";
import AnalyticsNode from "./AnalyticsNode";
import HttpRequestNode from "./HttpRequestNode";
import AINode from "./AINode";
import WebhookTriggerNode from "./WebhookTriggerNode";
import TextResponseNode from "./TextResponseNode";
import ConditionNode from "./ConditionNode";
import SalesCubeNode from "./SalesCubeNode";
import { PremiumNode } from "./PremiumNode";
// New visual node types (Phase 2)
import TriggerNode from "./TriggerNode";
import TransformNode from "./TransformNode";
import RouterNode from "./RouterNode";
import FlowCubeModuleNode from "./FlowCubeModuleNode";
import ErrorNode from "./ErrorNode";

// Telegram nodes
import {
  TelegramTriggerNode,
  TelegramSendNode,
  TelegramButtonsNode,
  TelegramMediaNode,
  TelegramCallbackNode,
  telegramNodeCategory,
  getTelegramNodeDefaultConfig,
} from "./telegram";

// Type for node component
type NodeComponent = React.ComponentType<NodeProps<any>>;

// ================================
// ALL NODE TYPE MAPPINGS
// ================================
// This object maps ALL possible node types to their React components
// ANY type not explicitly listed will use AnalyticsNode as fallback

const NODE_COMPONENT_MAP: Record<string, NodeComponent> = {
  // Default/Fallback
  analyticsNode: AnalyticsNode,
  default: AnalyticsNode,

  // Premium nodes (glassmorphism)
  premium_trigger: PremiumNode,
  premium_action: PremiumNode,
  premium_condition: PremiumNode,
  premium_ai: PremiumNode,

  // HTTP nodes
  http_request: HttpRequestNode,
  webhook: HttpRequestNode,
  n8n_webhook: HttpRequestNode,

  // AI/LLM nodes
  openai: AINode,
  claude: AINode,
  deepseek: AINode,
  ai: AINode,
  llm: AINode,

  // Trigger nodes (new visual shape)
  webhook_trigger: TriggerNode,
  whatsapp_trigger: TriggerNode,
  evolution_trigger: TriggerNode,
  schedule: TriggerNode,
  manual_trigger: TriggerNode,

  // Response/Output nodes
  text_response: TextResponseNode,
  whatsapp_template: TextResponseNode,
  image_response: TextResponseNode,

  // Logic/Flow nodes
  condition: ConditionNode,
  decision_tree: ConditionNode,
  set_variable: ConditionNode,
  wait: ConditionNode,

  // Router node (Make-style diamond)
  router: RouterNode,

  // Data transform nodes
  json_transform: TransformNode,
  iterator: TransformNode,
  aggregator: TransformNode,
  text_parser: TransformNode,
  filter: TransformNode,
  sort: TransformNode,

  // Sub-workflow
  sub_workflow: FlowCubeModuleNode,

  // Error handler
  error_handler: ErrorNode,

  // FlowCube module integration nodes
  salescube_create_lead: FlowCubeModuleNode,
  salescube_update_lead: FlowCubeModuleNode,
  chatcube_send: FlowCubeModuleNode,
  whatsapp_send: FlowCubeModuleNode,
  socialcube_post: FlowCubeModuleNode,
  funnelcube_track: FlowCubeModuleNode,
  pagecube_submissions: FlowCubeModuleNode,

  // Email
  send_email: HttpRequestNode,

  // Traffic source nodes (use AnalyticsNode for tracking)
  google_organic: AnalyticsNode,
  google_ads: AnalyticsNode,
  facebook_ads: AnalyticsNode,
  meta_ads: AnalyticsNode,
  direct: AnalyticsNode,
  referral: AnalyticsNode,
  social: AnalyticsNode,

  // Page nodes (use AnalyticsNode for funnel tracking)
  landing_page: AnalyticsNode,
  sales_page: AnalyticsNode,
  checkout: AnalyticsNode,
  thank_you: AnalyticsNode,
  upsell: AnalyticsNode,
  downsell: AnalyticsNode,

  // Action/Event nodes
  button_click: AnalyticsNode,
  form_submit: AnalyticsNode,
  purchase: AnalyticsNode,
  custom_event: AnalyticsNode,
  scroll: AnalyticsNode,
  video_play: AnalyticsNode,

  // Telegram nodes
  telegram_trigger: TelegramTriggerNode,
  telegram_message_trigger: TelegramTriggerNode,
  telegram_command_trigger: TelegramTriggerNode,
  telegram_callback_trigger: TelegramTriggerNode,
  telegram_send: TelegramSendNode,
  telegram_send_message: TelegramSendNode,
  telegram_buttons: TelegramButtonsNode,
  telegram_keyboard: TelegramButtonsNode,
  telegram_media: TelegramMediaNode,
  telegram_photo: TelegramMediaNode,
  telegram_video: TelegramMediaNode,
  telegram_document: TelegramMediaNode,
  telegram_callback: TelegramCallbackNode,
  telegram_callback_handler: TelegramCallbackNode,
};

// ================================
// SAFE NODE TYPE RESOLVER
// ================================
// This function ALWAYS returns a valid component
function getNodeComponent(type: string | symbol): NodeComponent {
  if (typeof type !== "string") {
    return AnalyticsNode;
  }
  
  const component = NODE_COMPONENT_MAP[type];
  if (component) {
    return component;
  }
  
  // Log unknown type for debugging
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[FlowCube] Unknown node type: "${type}", using AnalyticsNode`);
  }
  
  return AnalyticsNode;
}

// ================================
// PROXY-BASED NODE TYPES
// ================================
// Comprehensive Proxy that handles all access patterns used by React Flow

export const nodeTypes: NodeTypes = new Proxy(NODE_COMPONENT_MAP as NodeTypes, {
  // GET trap - handles property access
  get(target, prop: string | symbol, receiver): any {
    // Handle special properties that React/ReactFlow might access
    if (typeof prop === "symbol") {
      // Handle Symbol.iterator, Symbol.toStringTag, etc.
      return Reflect.get(target, prop, receiver);
    }
    
    // Handle Object prototype methods
    if (prop === "hasOwnProperty" || prop === "toString" || prop === "valueOf") {
      return Reflect.get(target, prop, receiver);
    }
    
    // Return valid component for any string key
    return getNodeComponent(prop);
  },
  
  // HAS trap - handles "in" operator
  has(target, prop: string | symbol): boolean {
    // All node types are "available" - we return AnalyticsNode for unknowns
    if (typeof prop === "string") {
      return true;
    }
    return Reflect.has(target, prop);
  },
  
  // OWN_KEYS trap - handles Object.keys()
  ownKeys(target): (string | symbol)[] {
    return Reflect.ownKeys(target);
  },
  
  // GET_OWN_PROPERTY_DESCRIPTOR trap
  getOwnPropertyDescriptor(target, prop: string | symbol) {
    if (typeof prop === "string" && !(prop in target)) {
      // Create descriptor for unknown types that we'll handle
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: AnalyticsNode,
      };
    }
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },
});

// ================================
// NODE CATEGORIES FOR PALETTE
// ================================
export const nodeCategories = [
  {
    id: "premium",
    label: "Premium Nodes",
    color: "#A855F7",
    description: "Premium glassmorphism nodes with neon effects",
    nodes: [
      { type: "premium_trigger", label: "Premium Trigger", description: "Webhook with neon glow" },
      { type: "premium_action", label: "Premium Action", description: "Action with glassmorphism" },
      { type: "premium_condition", label: "Premium Condition", description: "Logic with animations" },
      { type: "premium_ai", label: "Premium AI", description: "AI node with sparkles" },
    ],
  },
  {
    id: "triggers",
    label: "Triggers",
    color: "#EAB308",
    description: "Entry points that start your workflow",
    nodes: [
      { type: "webhook_trigger", label: "Webhook", description: "HTTP webhook trigger" },
      { type: "whatsapp_trigger", label: "WhatsApp", description: "Evolution API message" },
      { type: "schedule", label: "Schedule", description: "Time-based trigger" },
    ],
  },
  telegramNodeCategory,
  {
    id: "ai",
    label: "AI Models",
    color: "#EC4899",
    description: "AI/LLM processing nodes",
    nodes: [
      { type: "openai", label: "OpenAI", description: "GPT-4o, GPT-4o-mini" },
      { type: "claude", label: "Claude", description: "Claude 3.5 Sonnet/Opus" },
      { type: "deepseek", label: "DeepSeek", description: "DeepSeek R1" },
    ],
  },
  {
    id: "logic",
    label: "Logic & Flow",
    color: "#EF4444",
    description: "Conditional branching and routing",
    nodes: [
      { type: "condition", label: "Condition", description: "If/else branching" },
      { type: "router", label: "Router", description: "Multi-way routing (Make-style)" },
      { type: "set_variable", label: "Set Variable", description: "Store data" },
      { type: "wait", label: "Wait/Delay", description: "Add delay" },
      { type: "merge", label: "Merge", description: "Merge branches" },
      { type: "sub_workflow", label: "Sub-Workflow", description: "Run another workflow" },
    ],
  },
  {
    id: "data",
    label: "Data Transform",
    color: "#0EA5E9",
    description: "Process and transform data",
    nodes: [
      { type: "json_transform", label: "JSON Transform", description: "JMESPath expressions" },
      { type: "iterator", label: "Iterator", description: "Loop over array items" },
      { type: "aggregator", label: "Aggregator", description: "Collect items into array" },
      { type: "text_parser", label: "Text Parser", description: "Regex extract/replace" },
      { type: "filter", label: "Filter", description: "Filter array by condition" },
      { type: "sort", label: "Sort", description: "Sort array items" },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    color: "#3B82F6",
    description: "External service connections",
    nodes: [
      { type: "http_request", label: "HTTP Request", description: "REST API calls" },
      { type: "webhook", label: "Send Webhook", description: "POST to URL" },
      { type: "n8n_webhook", label: "N8N Webhook", description: "Trigger N8N workflow" },
      { type: "send_email", label: "Send Email", description: "SMTP email" },
      { type: "whatsapp_send", label: "WhatsApp Send", description: "Evolution API message" },
    ],
  },
  {
    id: "flowcube_modules",
    label: "FlowCube Modules",
    color: "#FF6D5A",
    description: "Built-in FlowCube integrations",
    nodes: [
      { type: "salescube_create_lead", label: "SalesCube Lead", description: "Create CRM lead" },
      { type: "salescube_update_lead", label: "Update Lead", description: "Update CRM lead" },
      { type: "chatcube_send", label: "ChatCube Send", description: "Send via ChatCube" },
      { type: "socialcube_post", label: "Social Post", description: "Schedule social post" },
      { type: "funnelcube_track", label: "Track Event", description: "Track analytics event" },
      { type: "pagecube_submissions", label: "Form Data", description: "Get form submissions" },
    ],
  },
  {
    id: "outputs",
    label: "Outputs",
    color: "#14B8A6",
    description: "Send responses and messages",
    nodes: [
      { type: "text_response", label: "Text Response", description: "Send text message" },
      { type: "whatsapp_template", label: "WA Template", description: "Send WA template" },
      { type: "image_response", label: "Image", description: "Send image" },
    ],
  },
  {
    id: "traffic",
    label: "Traffic Sources",
    color: "#6366F1",
    description: "Track traffic origins",
    nodes: [
      { type: "google_organic", label: "Google Organic", description: "Organic search" },
      { type: "google_ads", label: "Google Ads", description: "Paid search" },
      { type: "facebook_ads", label: "Facebook Ads", description: "Meta ads" },
      { type: "direct", label: "Direct", description: "Direct traffic" },
    ],
  },
  {
    id: "pages",
    label: "Pages",
    color: "#F97316",
    description: "Track page visits",
    nodes: [
      { type: "landing_page", label: "Landing Page", description: "Entry page" },
      { type: "sales_page", label: "Sales Page", description: "Sales/offer page" },
      { type: "checkout", label: "Checkout", description: "Payment page" },
      { type: "thank_you", label: "Thank You", description: "Confirmation page" },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    color: "#10B981",
    description: "Track user actions",
    nodes: [
      { type: "button_click", label: "Button Click", description: "CTA click" },
      { type: "form_submit", label: "Form Submit", description: "Form completion" },
      { type: "purchase", label: "Purchase", description: "Transaction" },
      { type: "custom_event", label: "Custom Event", description: "Any event" },
    ],
  },
];

// ================================
// HELPER FUNCTIONS
// ================================

// Helper to create a new node with safe type
export function createNode(
  type: string,
  label: string,
  position: { x: number; y: number }
) {
  // Use the actual type - the Proxy will handle fallback
  return {
    id: `${type}-${Date.now()}`,
    type: type, // Keep original type, Proxy handles rendering
    position,
    data: {
      label,
      type,
      config: getDefaultConfig(type),
      status: "draft" as const,
    },
  };
}

// Get default config for each node type
function getDefaultConfig(type: string): Record<string, unknown> {
  // Check Telegram nodes first
  if (type.startsWith("telegram_")) {
    return getTelegramNodeDefaultConfig(type);
  }

  // Check Premium nodes
  if (type.startsWith("premium_")) {
    const nodeType = type.replace("premium_", "") as "trigger" | "action" | "condition" | "ai";
    return { type: nodeType, label: "", description: "" };
  }

  switch (type) {
    case "http_request":
    case "webhook":
    case "n8n_webhook":
      return { method: "POST", url: "", headers: {}, timeout: 30000 };
    case "openai":
      return { provider: "openai", model: "gpt-4o-mini", temperature: 0.7 };
    case "claude":
      return { provider: "claude", model: "claude-3-5-sonnet", temperature: 0.7 };
    case "deepseek":
      return { provider: "deepseek", model: "deepseek-r1", temperature: 0.7 };
    case "webhook_trigger":
    case "whatsapp_trigger":
      return { source: "evolution" };
    case "text_response":
      return { channel: "whatsapp", text: "" };
    case "condition":
      return { conditions: [], default_output: "else" };
    case "salescube_create_lead":
      return { action: "create_lead", channel: 78, column: 48, origin: 11 };
    case "router":
      return { routes: [{ handle: "route_1", label: "Route 1", filters: [] }] };
    case "json_transform":
      return { expression: "", input_variable: "", output_variable: "transform_result" };
    case "iterator":
      return { input_variable: "" };
    case "aggregator":
      return { input_variable: "", output_variable: "aggregated_result" };
    case "text_parser":
      return { action: "extract", pattern: "", text: "", output_variable: "parsed_result" };
    case "filter":
      return { input_variable: "", field: "", operator: "not_empty", value: "" };
    case "sort":
      return { input_variable: "", field: "", direction: "asc" };
    case "sub_workflow":
      return { workflow_id: "", input_mapping: {}, output_variable: "sub_workflow_result" };
    case "send_email":
      return { to: "", subject: "", body: "" };
    case "whatsapp_send":
      return { instance: "", to: "", message: "" };
    case "manual_trigger":
      return {};
    case "merge":
      return {};
    default:
      return {};
  }
}

// Get category for a node type
export function getCategoryForType(type: string): string | undefined {
  for (const category of nodeCategories) {
    if (category.nodes.some((n) => n.type === type)) {
      return category.id;
    }
  }
  return undefined;
}

// Get label for a node type
export function getLabelForType(type: string): string {
  for (const category of nodeCategories) {
    const node = category.nodes.find((n) => n.type === type);
    if (node) return node.label;
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Export individual components
export {
  AnalyticsNode,
  HttpRequestNode,
  AINode,
  WebhookTriggerNode,
  TextResponseNode,
  ConditionNode,
  SalesCubeNode,
  PremiumNode,
  // New visual nodes
  TriggerNode,
  TransformNode,
  RouterNode,
  FlowCubeModuleNode,
  ErrorNode,
  // Telegram nodes
  TelegramTriggerNode,
  TelegramSendNode,
  TelegramButtonsNode,
  TelegramMediaNode,
  TelegramCallbackNode,
};

export default nodeTypes;
