/**
 * FlowCube 3.0 - Node Types Registry
 *
 * Registers all custom node types for React Flow
 */
import { NodeTypes } from "@xyflow/react";
import AnalyticsNode from "./AnalyticsNode";
import HttpRequestNode from "./HttpRequestNode";
import AINode from "./AINode";
import WebhookTriggerNode from "./WebhookTriggerNode";
import TextResponseNode from "./TextResponseNode";
import ConditionNode from "./ConditionNode";
import SalesCubeNode from "./SalesCubeNode";

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

// Node type registry for React Flow
export const nodeTypes: NodeTypes = {
  // Default node
  analyticsNode: AnalyticsNode as any,
  default: AnalyticsNode as any,

  // Specialized nodes
  http_request: HttpRequestNode as any,
  webhook: HttpRequestNode as any,

  // AI nodes
  openai: AINode as any,
  claude: AINode as any,
  deepseek: AINode as any,

  // Triggers
  webhook_trigger: WebhookTriggerNode as any,
  whatsapp_trigger: WebhookTriggerNode as any,
  evolution_trigger: WebhookTriggerNode as any,

  // Responses
  text_response: TextResponseNode as any,
  whatsapp_template: TextResponseNode as any,

  // Logic
  condition: ConditionNode as any,
  decision_tree: ConditionNode as any,

  // Integrations
  salescube_create_lead: SalesCubeNode as any,
  salescube_update_lead: SalesCubeNode as any,
  n8n_webhook: HttpRequestNode as any,

  // Telegram nodes
  telegram_trigger: TelegramTriggerNode as any,
  telegram_message_trigger: TelegramTriggerNode as any,
  telegram_command_trigger: TelegramTriggerNode as any,
  telegram_callback_trigger: TelegramTriggerNode as any,
  telegram_send: TelegramSendNode as any,
  telegram_send_message: TelegramSendNode as any,
  telegram_buttons: TelegramButtonsNode as any,
  telegram_keyboard: TelegramButtonsNode as any,
  telegram_media: TelegramMediaNode as any,
  telegram_photo: TelegramMediaNode as any,
  telegram_video: TelegramMediaNode as any,
  telegram_document: TelegramMediaNode as any,
  telegram_callback: TelegramCallbackNode as any,
  telegram_callback_handler: TelegramCallbackNode as any,
};

// Node categories for the palette
export const nodeCategories = [
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
  // Telegram category
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

// Helper to create a new node
export function createNode(
  type: string,
  label: string,
  position: { x: number; y: number }
) {
  // Determine the correct node type for React Flow
  const reactFlowType = nodeTypes[type] ? type : "analyticsNode";

  return {
    id: `${type}-${Date.now()}`,
    type: reactFlowType,
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
  if (type.startsWith('telegram_')) {
    return getTelegramNodeDefaultConfig(type);
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
  // Telegram nodes
  TelegramTriggerNode,
  TelegramSendNode,
  TelegramButtonsNode,
  TelegramMediaNode,
  TelegramCallbackNode,
};

export default nodeTypes;
