/**
 * FlowCube 4.0 - Node Types Registry (Make.com Redesign)
 *
 * All nodes use unified Make.com-style circular bubbles.
 * Visual config centralized in nodeVisualConfig.ts.
 * Uses Proxy with multiple traps to prevent React Error #130.
 */
"use client";

import React from "react";
import { NodeTypes, NodeProps } from "@xyflow/react";

// Make-style node components
import MakeActionNode from "./MakeActionNode";
import MakeTriggerNode from "./MakeTriggerNode";
import MakeRouterNode from "./MakeRouterNode";
import MakeConditionNode from "./MakeConditionNode";

// Premium keeps its own glassmorphism style
import { PremiumNode } from "./PremiumNode";

// Telegram default configs (still needed for createNode)
import {
  telegramNodeCategory,
  getTelegramNodeDefaultConfig,
} from "./telegram";

// Type for node component
type NodeComponent = React.ComponentType<NodeProps<any>>;

// ================================
// ALL NODE TYPE MAPPINGS
// ================================
const NODE_COMPONENT_MAP: Record<string, NodeComponent> = {
  // Default fallback
  default: MakeActionNode,

  // Premium nodes (keep glassmorphism)
  premium_trigger: PremiumNode,
  premium_action: PremiumNode,
  premium_condition: PremiumNode,
  premium_ai: PremiumNode,

  // Trigger nodes → hexagon
  webhook_trigger: MakeTriggerNode,
  whatsapp_trigger: MakeTriggerNode,
  evolution_trigger: MakeTriggerNode,
  schedule: MakeTriggerNode,
  manual_trigger: MakeTriggerNode,
  facebook_lead_ads: MakeTriggerNode,

  // Router → diamond with multi-output
  router: MakeRouterNode,

  // Condition → diamond with true/false/else
  condition: MakeConditionNode,
  decision_tree: MakeConditionNode,
  deduplicate: MakeConditionNode,

  // All other nodes → generic circular bubble
  // HTTP / API
  http_request: MakeActionNode,
  webhook: MakeActionNode,
  n8n_webhook: MakeActionNode,
  send_email: MakeActionNode,

  // AI / LLM
  openai: MakeActionNode,
  claude: MakeActionNode,
  deepseek: MakeActionNode,
  ai: MakeActionNode,
  llm: MakeActionNode,

  // Logic (non-branching)
  set_variable: MakeActionNode,
  wait: MakeActionNode,
  merge: MakeActionNode,

  // Data transform
  json_transform: MakeActionNode,
  iterator: MakeActionNode,
  aggregator: MakeActionNode,
  text_parser: MakeActionNode,
  filter: MakeActionNode,
  sort: MakeActionNode,

  // Output
  text_response: MakeActionNode,
  whatsapp_template: MakeActionNode,
  image_response: MakeActionNode,

  // FlowCube modules
  sub_workflow: MakeActionNode,
  send_to_salescube: MakeActionNode,
  salescube_push: MakeActionNode,
  salescube_create_lead: MakeActionNode,
  salescube_update_lead: MakeActionNode,
  chatcube_send: MakeActionNode,
  whatsapp_send: MakeActionNode,
  socialcube_post: MakeActionNode,
  funnelcube_track: MakeActionNode,
  pagecube_submissions: MakeActionNode,

  // Error handler
  error_handler: MakeActionNode,

  // Traffic sources
  google_organic: MakeActionNode,
  google_ads: MakeActionNode,
  facebook_ads: MakeActionNode,
  meta_ads: MakeActionNode,
  direct: MakeActionNode,
  referral: MakeActionNode,
  social: MakeActionNode,

  // Pages
  landing_page: MakeActionNode,
  sales_page: MakeActionNode,
  checkout: MakeActionNode,
  thank_you: MakeActionNode,
  upsell: MakeActionNode,
  downsell: MakeActionNode,

  // Actions
  button_click: MakeActionNode,
  form_submit: MakeActionNode,
  purchase: MakeActionNode,
  custom_event: MakeActionNode,
  scroll: MakeActionNode,
  video_play: MakeActionNode,

  // Telegram nodes → triggers get hexagon, actions get circle
  telegram_trigger: MakeTriggerNode,
  telegram_message_trigger: MakeTriggerNode,
  telegram_command_trigger: MakeTriggerNode,
  telegram_callback_trigger: MakeTriggerNode,
  telegram_send: MakeActionNode,
  telegram_send_message: MakeActionNode,
  telegram_buttons: MakeActionNode,
  telegram_keyboard: MakeActionNode,
  telegram_media: MakeActionNode,
  telegram_photo: MakeActionNode,
  telegram_video: MakeActionNode,
  telegram_document: MakeActionNode,
  telegram_callback: MakeActionNode,
  telegram_callback_handler: MakeActionNode,
};

// ================================
// SAFE NODE TYPE RESOLVER
// ================================
function getNodeComponent(type: string | symbol): NodeComponent {
  if (typeof type !== "string") {
    return MakeActionNode;
  }

  const component = NODE_COMPONENT_MAP[type];
  if (component) {
    return component;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(`[FlowCube] Unknown node type: "${type}", using MakeActionNode`);
  }

  return MakeActionNode;
}

// ================================
// PROXY-BASED NODE TYPES
// ================================
export const nodeTypes: NodeTypes = new Proxy(NODE_COMPONENT_MAP as NodeTypes, {
  get(target, prop: string | symbol, receiver): any {
    if (typeof prop === "symbol") {
      return Reflect.get(target, prop, receiver);
    }
    if (prop === "hasOwnProperty" || prop === "toString" || prop === "valueOf") {
      return Reflect.get(target, prop, receiver);
    }
    return getNodeComponent(prop);
  },

  has(target, prop: string | symbol): boolean {
    if (typeof prop === "string") {
      return true;
    }
    return Reflect.has(target, prop);
  },

  ownKeys(target): (string | symbol)[] {
    return Reflect.ownKeys(target);
  },

  getOwnPropertyDescriptor(target, prop: string | symbol) {
    if (typeof prop === "string" && !(prop in target)) {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: MakeActionNode,
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
      { type: "facebook_lead_ads", label: "Facebook Lead Ads", description: "Meta Lead Ads form" },
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
      { type: "deduplicate", label: "Deduplicate", description: "Filter duplicates" },
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
      { type: "send_to_salescube", label: "Send to SalesCube", description: "Push lead to SalesCube CRM" },
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

export function createNode(
  type: string,
  label: string,
  position: { x: number; y: number }
) {
  return {
    id: `${type}-${Date.now()}`,
    type: type,
    position,
    data: {
      label,
      type,
      config: getDefaultConfig(type),
      status: "draft" as const,
    },
  };
}

function getDefaultConfig(type: string): Record<string, unknown> {
  if (type.startsWith("telegram_")) {
    return getTelegramNodeDefaultConfig(type);
  }

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
    case "facebook_lead_ads":
      return { page_id: "", form_id: "" };
    case "deduplicate":
      return { field: "phone", ttl_hours: 24, dedup_service_url: "https://sc.frzgroup.com.br/dedup" };
    case "send_to_salescube":
    case "salescube_push":
      return {
        name_field: "{{name}}", phone_field: "{{phone}}", email_field: "{{email}}",
        channel: 78, column: 48, origin: 11, responsibles: [], random_distribution: true, tags: [],
      };
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

export function getCategoryForType(type: string): string | undefined {
  for (const category of nodeCategories) {
    if (category.nodes.some((n) => n.type === type)) {
      return category.id;
    }
  }
  return undefined;
}

export function getLabelForType(type: string): string {
  for (const category of nodeCategories) {
    const node = category.nodes.find((n) => n.type === type);
    if (node) return node.label;
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Export new Make-style components
export {
  MakeActionNode,
  MakeTriggerNode,
  MakeRouterNode,
  MakeConditionNode,
  PremiumNode,
};

export default nodeTypes;
