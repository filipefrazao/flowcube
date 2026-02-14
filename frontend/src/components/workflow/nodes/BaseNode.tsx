/**
 * FlowCube 4.1 - BaseNode (Dark Theme Redesign)
 *
 * Universal node component with:
 * - Colored header per category (15 categories)
 * - Category icon with tinted background
 * - Status badge (running/success/error/waiting) with animations
 * - Left accent strip per category color
 * - Trigger badge for trigger nodes
 * - Handle animations with category colors
 * - Dark theme using CSS design tokens from workflow-nodes.css
 */
"use client";

import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Zap,
  Bot,
  GitBranch,
  Globe,
  Send,
  BarChart3,
  FileText,
  MousePointer,
  MessageCircle,
  Sparkles,
  Database,
  MessageSquare,
  Mail,
  HardDrive,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ================================
   CATEGORY CONFIGURATION
   ================================ */

interface CategoryConfig {
  cssClass: string;
  handleClass: string;
  icon: React.ElementType;
}

const CATEGORIES: Record<string, CategoryConfig> = {
  triggers:     { cssClass: "fc-cat-triggers",     handleClass: "fc-handle-triggers",     icon: Zap },
  ai:           { cssClass: "fc-cat-ai",           handleClass: "fc-handle-ai",           icon: Bot },
  logic:        { cssClass: "fc-cat-logic",        handleClass: "fc-handle-logic",        icon: GitBranch },
  integrations: { cssClass: "fc-cat-integrations", handleClass: "fc-handle-integrations", icon: Globe },
  outputs:      { cssClass: "fc-cat-outputs",      handleClass: "fc-handle-outputs",      icon: Send },
  analytics:    { cssClass: "fc-cat-analytics",    handleClass: "fc-handle-analytics",    icon: BarChart3 },
  pages:        { cssClass: "fc-cat-pages",        handleClass: "fc-handle-pages",        icon: FileText },
  actions:      { cssClass: "fc-cat-actions",      handleClass: "fc-handle-actions",      icon: MousePointer },
  telegram:     { cssClass: "fc-cat-telegram",     handleClass: "fc-handle-telegram",     icon: MessageCircle },
  premium:      { cssClass: "fc-cat-premium",      handleClass: "fc-handle-premium",      icon: Sparkles },
  salescube:    { cssClass: "fc-cat-salescube",    handleClass: "fc-handle-salescube",    icon: Database },
  whatsapp:     { cssClass: "fc-cat-whatsapp",     handleClass: "fc-handle-whatsapp",     icon: MessageSquare },
  email:        { cssClass: "fc-cat-email",        handleClass: "fc-handle-email",        icon: Mail },
  data:         { cssClass: "fc-cat-data",         handleClass: "fc-handle-data",         icon: HardDrive },
  default:      { cssClass: "fc-cat-default",      handleClass: "",                       icon: Database },
};

/* ================================
   NODE TYPE -> CATEGORY MAP
   ================================ */

const TYPE_TO_CATEGORY: Record<string, string> = {
  // Triggers
  webhook_trigger: "triggers",
  whatsapp_trigger: "triggers",
  schedule: "triggers",
  evolution_trigger: "triggers",
  // AI
  openai: "ai",
  claude: "ai",
  deepseek: "ai",
  ai: "ai",
  llm: "ai",
  // Logic
  condition: "logic",
  decision_tree: "logic",
  set_variable: "logic",
  wait: "logic",
  // Integrations
  http_request: "integrations",
  webhook: "integrations",
  n8n_webhook: "integrations",
  // Outputs
  text_response: "outputs",
  whatsapp_template: "outputs",
  image_response: "outputs",
  // Analytics
  google_organic: "analytics",
  google_ads: "analytics",
  facebook_ads: "analytics",
  meta_ads: "analytics",
  direct: "analytics",
  referral: "analytics",
  social: "analytics",
  // Pages
  landing_page: "pages",
  sales_page: "pages",
  product_page: "pages",
  checkout: "pages",
  thank_you: "pages",
  blog_post: "pages",
  upsell: "pages",
  downsell: "pages",
  // Actions
  button_click: "actions",
  form_submit: "actions",
  purchase: "actions",
  sign_up: "actions",
  add_to_cart: "actions",
  download: "actions",
  video_view: "actions",
  custom_event: "actions",
  scroll: "actions",
  video_play: "actions",
  // Telegram
  telegram_trigger: "telegram",
  telegram_message_trigger: "telegram",
  telegram_command_trigger: "telegram",
  telegram_callback_trigger: "telegram",
  telegram_send: "telegram",
  telegram_send_message: "telegram",
  telegram_buttons: "telegram",
  telegram_keyboard: "telegram",
  telegram_media: "telegram",
  telegram_photo: "telegram",
  telegram_video: "telegram",
  telegram_document: "telegram",
  telegram_callback: "telegram",
  telegram_callback_handler: "telegram",
  // Premium
  premium_trigger: "premium",
  premium_action: "premium",
  premium_condition: "premium",
  premium_ai: "premium",
  // SalesCube
  salescube_create_lead: "salescube",
  salescube_update_lead: "salescube",
  // Email
  email_campaign: "email",
  email_sequence: "email",
  // Data
  tag_segment: "data",
};

const TRIGGER_TYPES = new Set([
  "webhook_trigger",
  "whatsapp_trigger",
  "schedule",
  "evolution_trigger",
  "telegram_trigger",
  "telegram_message_trigger",
  "telegram_command_trigger",
  "telegram_callback_trigger",
  "premium_trigger",
]);

/* ================================
   STATUS BADGE COMPONENT
   ================================ */

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "running":
      return (
        <div className="flex items-center gap-1.5" title="Running">
          <Loader2 className="w-3.5 h-3.5 animate-spin-running" style={{ color: "var(--node-status-running)" }} />
        </div>
      );
    case "success":
      return (
        <div className="flex items-center" title="Success">
          <CheckCircle2 className="w-3.5 h-3.5 animate-check-success" style={{ color: "var(--node-status-success)" }} />
        </div>
      );
    case "error":
      return (
        <div className="flex items-center" title="Error">
          <div className="fc-status-badge error" />
        </div>
      );
    case "waiting":
      return (
        <div className="flex items-center" title="Waiting">
          <Clock className="w-3.5 h-3.5" style={{ color: "var(--node-status-waiting)" }} />
        </div>
      );
    default:
      return null;
  }
}

/* ================================
   BASE NODE COMPONENT
   ================================ */

interface BaseNodeData extends Record<string, unknown> {
  label: string;
  blockType?: string;
  type?: string;
  status?: string;
  executionCount?: number;
  config?: Record<string, unknown>;
}

function BaseNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData;
  const nodeType = nodeData.blockType || nodeData.type || "default";

  const category = useMemo(() => {
    return TYPE_TO_CATEGORY[nodeType] || "default";
  }, [nodeType]);

  const catConfig = CATEGORIES[category] || CATEGORIES.default;
  const Icon = catConfig.icon;
  const isTrigger = TRIGGER_TYPES.has(nodeType);
  const status = nodeData.status;
  const execCount = nodeData.executionCount;

  const displayLabel = useMemo(() => {
    return nodeData.label || nodeType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, [nodeData.label, nodeType]);

  const displaySubtitle = useMemo(() => {
    return nodeType.replace(/_/g, " ");
  }, [nodeType]);

  return (
    <div className={cn("fc-node", catConfig.cssClass, selected && "selected")}>
      {/* Trigger Badge */}
      {isTrigger && <div className="fc-trigger-badge">Trigger</div>}

      {/* Target Handle (top) - not shown for triggers */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className={cn(
            "!w-3 !h-3 !border-2",
            catConfig.handleClass
          )}
          style={{ borderColor: "var(--node-bg)" }}
        />
      )}

      {/* Header */}
      <div className="fc-node-header">
        {/* Category Icon */}
        <div className="fc-node-icon">
          <Icon />
        </div>

        {/* Title & Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="fc-node-title">{displayLabel}</div>
          <div className="fc-node-subtitle">{displaySubtitle}</div>
        </div>

        {/* Status Badge */}
        {status && status !== "draft" && <StatusBadge status={status} />}
      </div>

      {/* Body (only shown when execution count exists) */}
      {execCount != null && execCount > 0 && (
        <div className="fc-node-body">
          <span className="fc-exec-count">{execCount} runs</span>
        </div>
      )}

      {/* Source Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !border-2",
          catConfig.handleClass
        )}
        style={{ borderColor: "var(--node-bg)" }}
      />
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
export default BaseNode;
