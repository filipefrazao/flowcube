/**
 * Node Visual Config - Central registry for Make.com-style node visuals
 *
 * Maps every node type to its icon, color, shape, and display properties.
 * Single source of truth - no more scattered configs across 13+ component files.
 */
import {
  Webhook,
  Clock,
  MessageSquare,
  Zap,
  Globe,
  Send,
  Bot,
  Brain,
  Sparkles,
  Cpu,
  GitBranch,
  GitMerge,
  Variable,
  Timer,
  Shuffle,
  Repeat,
  Layers,
  FileText,
  Filter,
  ArrowUpDown,
  MessageCircle,
  Image,
  Mail,
  Phone,
  Users,
  Share2,
  BarChart3,
  Search,
  DollarSign,
  Target,
  MousePointer,
  FormInput,
  ShoppingCart,
  ScrollText,
  Video,
  Layout,
  CreditCard,
  Gift,
  TrendingDown,
  AlertTriangle,
  Workflow,
  Keyboard,
  type LucideIcon,
} from "lucide-react";

export interface NodeVisualDef {
  icon: LucideIcon;
  color: string;
  subtitle: string;
  shape: "circle" | "hexagon" | "diamond";
  badge?: string;
  hasInput: boolean;
  hasOutput: boolean;
}

/**
 * Color palette using SOLID DARK backgrounds (bg-{color}-950)
 * with bright accent icons (text-{color}-400).
 *
 * Key insight from AI design analysis: use dark solid backgrounds,
 * NOT semi-transparent overlays (bg-{color}-500/15 looks washed-out/white).
 */
export const COLOR_PALETTE: Record<
  string,
  {
    bg: string;
    border: string;
    borderSelected: string;
    text: string;
    glow: string;
    handle: string;
    handleBorder: string;
    badgeBg: string;
  }
> = {
  amber: {
    bg: "bg-amber-950",
    border: "border-amber-500/30",
    borderSelected: "border-amber-400",
    text: "text-amber-400",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.35)]",
    handle: "!bg-amber-400",
    handleBorder: "!border-amber-900",
    badgeBg: "bg-amber-900/80 text-amber-300 border-amber-600/40",
  },
  blue: {
    bg: "bg-blue-950",
    border: "border-blue-500/30",
    borderSelected: "border-blue-400",
    text: "text-blue-400",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.35)]",
    handle: "!bg-blue-400",
    handleBorder: "!border-blue-900",
    badgeBg: "bg-blue-900/80 text-blue-300 border-blue-600/40",
  },
  pink: {
    bg: "bg-pink-950",
    border: "border-pink-500/30",
    borderSelected: "border-pink-400",
    text: "text-pink-400",
    glow: "shadow-[0_0_20px_rgba(236,72,153,0.35)]",
    handle: "!bg-pink-400",
    handleBorder: "!border-pink-900",
    badgeBg: "bg-pink-900/80 text-pink-300 border-pink-600/40",
  },
  red: {
    bg: "bg-red-950",
    border: "border-red-500/30",
    borderSelected: "border-red-400",
    text: "text-red-400",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.35)]",
    handle: "!bg-red-400",
    handleBorder: "!border-red-900",
    badgeBg: "bg-red-900/80 text-red-300 border-red-600/40",
  },
  purple: {
    bg: "bg-purple-950",
    border: "border-purple-500/30",
    borderSelected: "border-purple-400",
    text: "text-purple-400",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.35)]",
    handle: "!bg-purple-400",
    handleBorder: "!border-purple-900",
    badgeBg: "bg-purple-900/80 text-purple-300 border-purple-600/40",
  },
  sky: {
    bg: "bg-sky-950",
    border: "border-sky-500/30",
    borderSelected: "border-sky-400",
    text: "text-sky-400",
    glow: "shadow-[0_0_20px_rgba(14,165,233,0.35)]",
    handle: "!bg-sky-400",
    handleBorder: "!border-sky-900",
    badgeBg: "bg-sky-900/80 text-sky-300 border-sky-600/40",
  },
  teal: {
    bg: "bg-teal-950",
    border: "border-teal-500/30",
    borderSelected: "border-teal-400",
    text: "text-teal-400",
    glow: "shadow-[0_0_20px_rgba(20,184,166,0.35)]",
    handle: "!bg-teal-400",
    handleBorder: "!border-teal-900",
    badgeBg: "bg-teal-900/80 text-teal-300 border-teal-600/40",
  },
  orange: {
    bg: "bg-orange-950",
    border: "border-orange-500/30",
    borderSelected: "border-orange-400",
    text: "text-orange-400",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.35)]",
    handle: "!bg-orange-400",
    handleBorder: "!border-orange-900",
    badgeBg: "bg-orange-900/80 text-orange-300 border-orange-600/40",
  },
  coral: {
    bg: "bg-rose-950",
    border: "border-rose-500/30",
    borderSelected: "border-rose-400",
    text: "text-rose-400",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.35)]",
    handle: "!bg-rose-400",
    handleBorder: "!border-rose-900",
    badgeBg: "bg-rose-900/80 text-rose-300 border-rose-600/40",
  },
  indigo: {
    bg: "bg-indigo-950",
    border: "border-indigo-500/30",
    borderSelected: "border-indigo-400",
    text: "text-indigo-400",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.35)]",
    handle: "!bg-indigo-400",
    handleBorder: "!border-indigo-900",
    badgeBg: "bg-indigo-900/80 text-indigo-300 border-indigo-600/40",
  },
  cyan: {
    bg: "bg-cyan-950",
    border: "border-cyan-500/30",
    borderSelected: "border-cyan-400",
    text: "text-cyan-400",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.35)]",
    handle: "!bg-cyan-400",
    handleBorder: "!border-cyan-900",
    badgeBg: "bg-cyan-900/80 text-cyan-300 border-cyan-600/40",
  },
  violet: {
    bg: "bg-violet-950",
    border: "border-violet-500/30",
    borderSelected: "border-violet-400",
    text: "text-violet-400",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.35)]",
    handle: "!bg-violet-400",
    handleBorder: "!border-violet-900",
    badgeBg: "bg-violet-900/80 text-violet-300 border-violet-600/40",
  },
  emerald: {
    bg: "bg-emerald-950",
    border: "border-emerald-500/30",
    borderSelected: "border-emerald-400",
    text: "text-emerald-400",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.35)]",
    handle: "!bg-emerald-400",
    handleBorder: "!border-emerald-900",
    badgeBg: "bg-emerald-900/80 text-emerald-300 border-emerald-600/40",
  },
};

export const NODE_VISUAL_CONFIG: Record<string, NodeVisualDef> = {
  // ── Triggers (hexagon, amber) ───────────────────────────
  webhook_trigger: { icon: Webhook, color: "amber", subtitle: "Webhook", shape: "hexagon", hasInput: false, hasOutput: true },
  schedule: { icon: Clock, color: "amber", subtitle: "Schedule", shape: "hexagon", hasInput: false, hasOutput: true },
  whatsapp_trigger: { icon: MessageSquare, color: "amber", subtitle: "WhatsApp", shape: "hexagon", hasInput: false, hasOutput: true },
  evolution_trigger: { icon: MessageSquare, color: "amber", subtitle: "Evolution API", shape: "hexagon", hasInput: false, hasOutput: true },
  manual_trigger: { icon: Zap, color: "amber", subtitle: "Manual", shape: "hexagon", hasInput: false, hasOutput: true },

  // ── HTTP / API (circle, blue) ───────────────────────────
  http_request: { icon: Globe, color: "blue", subtitle: "HTTP Request", shape: "circle", hasInput: true, hasOutput: true },
  webhook: { icon: Webhook, color: "blue", subtitle: "Send Webhook", shape: "circle", hasInput: true, hasOutput: true },
  n8n_webhook: { icon: Webhook, color: "blue", subtitle: "N8N Webhook", shape: "circle", hasInput: true, hasOutput: true },
  send_email: { icon: Mail, color: "blue", subtitle: "Email", shape: "circle", hasInput: true, hasOutput: true },

  // ── AI / LLM (circle, pink) ────────────────────────────
  openai: { icon: Bot, color: "pink", subtitle: "OpenAI", shape: "circle", hasInput: true, hasOutput: true },
  claude: { icon: Brain, color: "pink", subtitle: "Claude", shape: "circle", hasInput: true, hasOutput: true },
  deepseek: { icon: Sparkles, color: "pink", subtitle: "DeepSeek", shape: "circle", hasInput: true, hasOutput: true },
  ai: { icon: Cpu, color: "pink", subtitle: "AI", shape: "circle", hasInput: true, hasOutput: true },
  llm: { icon: Cpu, color: "pink", subtitle: "LLM", shape: "circle", hasInput: true, hasOutput: true },

  // ── Logic (diamond/circle, red) ────────────────────────
  condition: { icon: GitBranch, color: "red", subtitle: "If/Else", shape: "diamond", hasInput: true, hasOutput: true },
  decision_tree: { icon: GitBranch, color: "red", subtitle: "Decision Tree", shape: "diamond", hasInput: true, hasOutput: true },
  set_variable: { icon: Variable, color: "red", subtitle: "Set Variable", shape: "circle", hasInput: true, hasOutput: true },
  wait: { icon: Timer, color: "red", subtitle: "Delay", shape: "circle", hasInput: true, hasOutput: true },
  merge: { icon: GitMerge, color: "red", subtitle: "Merge", shape: "circle", hasInput: true, hasOutput: true },

  // ── Router (diamond, purple) ───────────────────────────
  router: { icon: GitBranch, color: "purple", subtitle: "Router", shape: "diamond", hasInput: true, hasOutput: true },

  // ── Data Transform (circle, sky) ───────────────────────
  json_transform: { icon: Shuffle, color: "sky", subtitle: "JSON Transform", shape: "circle", hasInput: true, hasOutput: true },
  iterator: { icon: Repeat, color: "sky", subtitle: "Iterator", shape: "circle", hasInput: true, hasOutput: true },
  aggregator: { icon: Layers, color: "sky", subtitle: "Aggregator", shape: "circle", hasInput: true, hasOutput: true },
  text_parser: { icon: FileText, color: "sky", subtitle: "Text Parser", shape: "circle", hasInput: true, hasOutput: true },
  filter: { icon: Filter, color: "sky", subtitle: "Filter", shape: "circle", hasInput: true, hasOutput: true },
  sort: { icon: ArrowUpDown, color: "sky", subtitle: "Sort", shape: "circle", hasInput: true, hasOutput: true },

  // ── Output (circle, teal) ─────────────────────────────
  text_response: { icon: MessageCircle, color: "teal", subtitle: "Text", shape: "circle", hasInput: true, hasOutput: true },
  whatsapp_template: { icon: MessageSquare, color: "teal", subtitle: "WA Template", shape: "circle", hasInput: true, hasOutput: true },
  image_response: { icon: Image, color: "teal", subtitle: "Image", shape: "circle", hasInput: true, hasOutput: true },

  // ── CRM / SalesCube (circle, orange, badge) ────────────
  salescube_create_lead: { icon: Users, color: "orange", subtitle: "Create Lead", shape: "circle", badge: "SalesCube", hasInput: true, hasOutput: true },
  salescube_update_lead: { icon: Users, color: "orange", subtitle: "Update Lead", shape: "circle", badge: "SalesCube", hasInput: true, hasOutput: true },

  // ── FlowCube Modules (circle, coral/emerald, badge) ────
  chatcube_send: { icon: MessageCircle, color: "emerald", subtitle: "Send Message", shape: "circle", badge: "ChatCube", hasInput: true, hasOutput: true },
  whatsapp_send: { icon: Phone, color: "emerald", subtitle: "Send WA", shape: "circle", badge: "ChatCube", hasInput: true, hasOutput: true },
  socialcube_post: { icon: Share2, color: "coral", subtitle: "Post", shape: "circle", badge: "SocialCube", hasInput: true, hasOutput: true },
  funnelcube_track: { icon: BarChart3, color: "coral", subtitle: "Track Event", shape: "circle", badge: "FunnelCube", hasInput: true, hasOutput: true },
  pagecube_submissions: { icon: FileText, color: "coral", subtitle: "Form Data", shape: "circle", badge: "PageCube", hasInput: true, hasOutput: true },
  sub_workflow: { icon: Workflow, color: "coral", subtitle: "Sub-Workflow", shape: "circle", badge: "FlowCube", hasInput: true, hasOutput: true },

  // ── Analytics / Traffic (circle, indigo) ───────────────
  google_organic: { icon: Search, color: "indigo", subtitle: "Google Organic", shape: "circle", hasInput: true, hasOutput: true },
  google_ads: { icon: DollarSign, color: "indigo", subtitle: "Google Ads", shape: "circle", hasInput: true, hasOutput: true },
  facebook_ads: { icon: Target, color: "indigo", subtitle: "Facebook Ads", shape: "circle", hasInput: true, hasOutput: true },
  meta_ads: { icon: Target, color: "indigo", subtitle: "Meta Ads", shape: "circle", hasInput: true, hasOutput: true },
  direct: { icon: Globe, color: "indigo", subtitle: "Direct", shape: "circle", hasInput: true, hasOutput: true },
  referral: { icon: Share2, color: "indigo", subtitle: "Referral", shape: "circle", hasInput: true, hasOutput: true },
  social: { icon: Share2, color: "indigo", subtitle: "Social", shape: "circle", hasInput: true, hasOutput: true },

  // ── Pages (circle, indigo) ────────────────────────────
  landing_page: { icon: Layout, color: "indigo", subtitle: "Landing Page", shape: "circle", hasInput: true, hasOutput: true },
  sales_page: { icon: Layout, color: "indigo", subtitle: "Sales Page", shape: "circle", hasInput: true, hasOutput: true },
  checkout: { icon: CreditCard, color: "indigo", subtitle: "Checkout", shape: "circle", hasInput: true, hasOutput: true },
  thank_you: { icon: Gift, color: "indigo", subtitle: "Thank You", shape: "circle", hasInput: true, hasOutput: true },
  upsell: { icon: TrendingDown, color: "indigo", subtitle: "Upsell", shape: "circle", hasInput: true, hasOutput: true },
  downsell: { icon: TrendingDown, color: "indigo", subtitle: "Downsell", shape: "circle", hasInput: true, hasOutput: true },

  // ── Actions (circle, indigo) ──────────────────────────
  button_click: { icon: MousePointer, color: "indigo", subtitle: "Button Click", shape: "circle", hasInput: true, hasOutput: true },
  form_submit: { icon: FormInput, color: "indigo", subtitle: "Form Submit", shape: "circle", hasInput: true, hasOutput: true },
  purchase: { icon: ShoppingCart, color: "indigo", subtitle: "Purchase", shape: "circle", hasInput: true, hasOutput: true },
  custom_event: { icon: Zap, color: "indigo", subtitle: "Custom Event", shape: "circle", hasInput: true, hasOutput: true },
  scroll: { icon: ScrollText, color: "indigo", subtitle: "Scroll", shape: "circle", hasInput: true, hasOutput: true },
  video_play: { icon: Video, color: "indigo", subtitle: "Video Play", shape: "circle", hasInput: true, hasOutput: true },

  // ── Telegram (hexagon/circle, cyan) ───────────────────
  telegram_trigger: { icon: Send, color: "cyan", subtitle: "TG Trigger", shape: "hexagon", hasInput: false, hasOutput: true },
  telegram_message_trigger: { icon: Send, color: "cyan", subtitle: "TG Message", shape: "hexagon", hasInput: false, hasOutput: true },
  telegram_command_trigger: { icon: Send, color: "cyan", subtitle: "TG Command", shape: "hexagon", hasInput: false, hasOutput: true },
  telegram_callback_trigger: { icon: Send, color: "cyan", subtitle: "TG Callback", shape: "hexagon", hasInput: false, hasOutput: true },
  telegram_send: { icon: Send, color: "cyan", subtitle: "TG Send", shape: "circle", hasInput: true, hasOutput: true },
  telegram_send_message: { icon: Send, color: "cyan", subtitle: "TG Message", shape: "circle", hasInput: true, hasOutput: true },
  telegram_buttons: { icon: Keyboard, color: "cyan", subtitle: "TG Buttons", shape: "circle", hasInput: true, hasOutput: true },
  telegram_keyboard: { icon: Keyboard, color: "cyan", subtitle: "TG Keyboard", shape: "circle", hasInput: true, hasOutput: true },
  telegram_media: { icon: Image, color: "cyan", subtitle: "TG Media", shape: "circle", hasInput: true, hasOutput: true },
  telegram_photo: { icon: Image, color: "cyan", subtitle: "TG Photo", shape: "circle", hasInput: true, hasOutput: true },
  telegram_video: { icon: Video, color: "cyan", subtitle: "TG Video", shape: "circle", hasInput: true, hasOutput: true },
  telegram_document: { icon: FileText, color: "cyan", subtitle: "TG Document", shape: "circle", hasInput: true, hasOutput: true },
  telegram_callback: { icon: MousePointer, color: "cyan", subtitle: "TG Callback", shape: "circle", hasInput: true, hasOutput: true },
  telegram_callback_handler: { icon: MousePointer, color: "cyan", subtitle: "TG Handler", shape: "circle", hasInput: true, hasOutput: true },

  // ── Error (circle, red) ───────────────────────────────
  error_handler: { icon: AlertTriangle, color: "red", subtitle: "Error Handler", shape: "circle", hasInput: true, hasOutput: true },
};

export const DEFAULT_VISUAL: NodeVisualDef = {
  icon: Zap,
  color: "blue",
  subtitle: "Action",
  shape: "circle",
  hasInput: true,
  hasOutput: true,
};

export function getNodeVisual(type: string): NodeVisualDef {
  return NODE_VISUAL_CONFIG[type] || DEFAULT_VISUAL;
}
