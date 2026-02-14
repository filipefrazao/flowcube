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

  // Trigger nodes
  webhook_trigger: WebhookTriggerNode,
  whatsapp_trigger: WebhookTriggerNode,
  evolution_trigger: WebhookTriggerNode,
  schedule: WebhookTriggerNode,

  // Response/Output nodes
  text_response: TextResponseNode,
  whatsapp_template: TextResponseNode,
  image_response: TextResponseNode,

  // Logic/Flow nodes
  condition: ConditionNode,
  decision_tree: ConditionNode,
  set_variable: ConditionNode,
  wait: ConditionNode,

  // Integration nodes
  salescube_create_lead: SalesCubeNode,
  salescube_update_lead: SalesCubeNode,

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
    color: "#10B981",
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
    color: "#F59E0B",
    description: "Conditional branching and routing",
    nodes: [
      { type: "condition", label: "Condition", description: "If/else branching" },
      { type: "decision_tree", label: "Router", description: "Multi-way routing" },
      { type: "set_variable", label: "Set Variable", description: "Store data" },
      { type: "wait", label: "Wait/Delay", description: "Add delay" },
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
      { type: "salescube_create_lead", label: "SalesCube Lead", description: "Create CRM lead" },
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
  // Telegram nodes
  TelegramTriggerNode,
  TelegramSendNode,
  TelegramButtonsNode,
  TelegramMediaNode,
  TelegramCallbackNode,
};

export default nodeTypes;
