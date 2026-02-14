"use client";

import { memo, useMemo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  Zap, Globe, GitBranch, Repeat, Brain, MessageSquare,
  Database, Webhook, Plug, Send, BarChart3, ShoppingCart,
  Loader2, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import "./workflow-nodes.css";

const CATEGORY_COLORS: Record<string, { bg: string; header: string; text: string }> = {
  triggers:     { bg: "border-emerald-500/30", header: "bg-emerald-600",   text: "text-emerald-400" },
  actions:      { bg: "border-blue-500/30",    header: "bg-blue-600",      text: "text-blue-400" },
  conditions:   { bg: "border-amber-500/30",   header: "bg-amber-600",     text: "text-amber-400" },
  loops:        { bg: "border-violet-500/30",  header: "bg-violet-600",    text: "text-violet-400" },
  ai:           { bg: "border-pink-500/30",    header: "bg-pink-600",      text: "text-pink-400" },
  messaging:    { bg: "border-cyan-500/30",    header: "bg-cyan-600",      text: "text-cyan-400" },
  data:         { bg: "border-teal-500/30",    header: "bg-teal-600",      text: "text-teal-400" },
  webhook:      { bg: "border-orange-500/30",  header: "bg-orange-600",    text: "text-orange-400" },
  integration:  { bg: "border-indigo-500/30",  header: "bg-indigo-600",    text: "text-indigo-400" },
  telegram:     { bg: "border-blue-400/30",    header: "bg-blue-500",      text: "text-blue-300" },
  premium:      { bg: "border-purple-500/30",  header: "bg-purple-600",    text: "text-purple-400" },
  analytics:    { bg: "border-red-500/30",     header: "bg-red-600",       text: "text-red-400" },
  salescube:    { bg: "border-sky-500/30",     header: "bg-sky-600",       text: "text-sky-400" },
  outputs:      { bg: "border-teal-500/30",    header: "bg-teal-600",      text: "text-teal-400" },
  traffic:      { bg: "border-indigo-500/30",  header: "bg-indigo-600",    text: "text-indigo-400" },
  pages:        { bg: "border-orange-500/30",  header: "bg-orange-600",    text: "text-orange-400" },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  triggers: Zap, actions: Globe, conditions: GitBranch, loops: Repeat,
  ai: Brain, messaging: MessageSquare, data: Database, webhook: Webhook,
  integration: Plug, telegram: Send, premium: Zap, analytics: BarChart3,
  salescube: ShoppingCart, outputs: MessageSquare, traffic: Globe, pages: Globe,
};

const TYPE_TO_CATEGORY: Record<string, string> = {
  webhook_trigger: "triggers", whatsapp_trigger: "triggers", schedule: "triggers",
  evolution_trigger: "triggers",
  http_request: "actions", webhook: "webhook", n8n_webhook: "webhook",
  openai: "ai", claude: "ai", deepseek: "ai", ai: "ai", llm: "ai",
  condition: "conditions", decision_tree: "conditions", set_variable: "data", wait: "loops",
  text_response: "outputs", whatsapp_template: "outputs", image_response: "outputs",
  salescube_create_lead: "salescube", salescube_update_lead: "salescube",
  telegram_trigger: "telegram", telegram_send: "telegram", telegram_buttons: "telegram",
  telegram_media: "telegram", telegram_callback: "telegram",
  telegram_message_trigger: "telegram", telegram_command_trigger: "telegram",
  telegram_callback_trigger: "telegram", telegram_send_message: "telegram",
  telegram_keyboard: "telegram", telegram_photo: "telegram",
  telegram_video: "telegram", telegram_document: "telegram",
  telegram_callback_handler: "telegram",
  premium_trigger: "premium", premium_action: "premium", premium_condition: "premium",
  premium_ai: "premium",
  google_organic: "traffic", google_ads: "traffic", facebook_ads: "traffic",
  meta_ads: "traffic", direct: "traffic", referral: "traffic", social: "traffic",
  landing_page: "pages", sales_page: "pages", checkout: "pages",
  thank_you: "pages", upsell: "pages", downsell: "pages",
  button_click: "analytics", form_submit: "analytics", purchase: "analytics",
  custom_event: "analytics", scroll: "analytics", video_play: "analytics",
};

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "draft" || status === "idle") return null;

  const config: Record<string, { icon: React.ElementType; cls: string; anim: string }> = {
    running: { icon: Loader2, cls: "text-blue-400 bg-blue-500/20", anim: "node-spinner" },
    success: { icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/20", anim: "" },
    error:   { icon: AlertCircle, cls: "text-red-400 bg-red-500/20", anim: "" },
    waiting: { icon: Clock, cls: "text-amber-400 bg-amber-500/20", anim: "" },
  };

  const c = config[status];
  if (!c) return null;
  const Icon = c.icon;

  return (
    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium", c.cls)}>
      <Icon className={cn("w-3 h-3", c.anim)} />
      <span className="capitalize">{status}</span>
    </div>
  );
}

function BaseNodeComponent({ data, selected, dragging }: NodeProps<any>) {
  const blockType = data.blockType || data.type || "default";
  const category = TYPE_TO_CATEGORY[blockType] || "actions";
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.actions;
  const CategoryIcon = CATEGORY_ICONS[category] || Globe;
  const status = data.status || data.executionStatus;

  const statusClass = useMemo(() => {
    if (status === "running") return "node-status-running";
    if (status === "error") return "node-status-error";
    if (status === "success") return "node-status-success";
    return "";
  }, [status]);

  return (
    <div
      className={cn(
        "workflow-node",
        selected && "selected",
        dragging && "dragging",
        statusClass
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!-top-[5px]"
      />

      <div className={cn("workflow-node-header", colors.header)}>
        <CategoryIcon className="w-4 h-4 text-white/80" />
        <span className="truncate flex-1">{data.label || blockType.replace(/_/g, " ")}</span>
        <StatusBadge status={status} />
      </div>

      <div className="workflow-node-body">
        {data.description && (
          <p className="text-xs text-gray-400 mb-1.5 line-clamp-2">{data.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className={cn("text-[11px] font-medium", colors.text)}>
            {blockType.replace(/_/g, " ")}
          </span>
          {data.config?.model && (
            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {data.config.model}
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!-bottom-[5px]"
      />
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
