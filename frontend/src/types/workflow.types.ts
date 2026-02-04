/**
 * FlowCube TypeScript Types
 * Sincronizado com backend Pydantic schemas
 */

// ============ Block Types ============

export type BlockType =
  // Triggers
  | "webhook"
  | "whatsapp_trigger"
  | "schedule"
  // Inputs
  | "text_input"
  | "email_input"
  | "phone_input"
  | "choice"
  // AI Models
  | "openai"
  | "claude"
  | "deepseek"
  // Logic
  | "condition"
  | "set_variable"
  | "wait"
  // Outputs
  | "text_response"
  | "image_response"
  | "whatsapp_template";

// ============ Block Content Types ============

export interface WebhookContent {
  url?: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
}

export interface WhatsAppTriggerContent {
  instance_id?: string;
  keywords: string[];
}

export interface ScheduleContent {
  cron?: string;
  timezone: string;
}

export interface TextInputContent {
  prompt: string;
  placeholder: string;
  variable_name: string;
  validation?: string;
}

export interface EmailInputContent {
  prompt: string;
  variable_name: string;
}

export interface PhoneInputContent {
  prompt: string;
  variable_name: string;
  country_code: string;
}

export interface ChoiceContent {
  prompt: string;
  options: Array<{ label: string; value: string }>;
  variable_name: string;
}

export interface OpenAIContent {
  model: string;
  system_prompt: string;
  user_prompt: string;
  temperature: number;
  max_tokens: number;
  output_variable: string;
}

export interface ClaudeContent {
  model: string;
  system_prompt: string;
  user_prompt: string;
  temperature: number;
  max_tokens: number;
  output_variable: string;
}

export interface DeepSeekContent {
  model: string;
  system_prompt: string;
  user_prompt: string;
  temperature: number;
  output_variable: string;
}

export interface ConditionContent {
  expression: string;
  true_label: string;
  false_label: string;
}

export interface SetVariableContent {
  variable_name: string;
  value: unknown;
  expression?: string;
}

export interface WaitContent {
  duration_seconds: number;
  duration_type: "seconds" | "minutes" | "hours";
}

export interface TextResponseContent {
  message: string;
  typing_delay: number;
}

export interface ImageResponseContent {
  image_url: string;
  caption?: string;
}

export interface WhatsAppTemplateContent {
  template_name: string;
  template_language: string;
  components: Array<Record<string, unknown>>;
}

export type BlockContent =
  | WebhookContent
  | WhatsAppTriggerContent
  | ScheduleContent
  | TextInputContent
  | EmailInputContent
  | PhoneInputContent
  | ChoiceContent
  | OpenAIContent
  | ClaudeContent
  | DeepSeekContent
  | ConditionContent
  | SetVariableContent
  | WaitContent
  | TextResponseContent
  | ImageResponseContent
  | WhatsAppTemplateContent;

// ============ Main Types ============

export interface Workflow {
  id: string;
  name: string;
  description: string;
  owner_id: number;
  is_published: boolean;
  is_active: boolean;
  block_count?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowDetail extends Workflow {
  groups: Group[];
  blocks: Block[];
  edges: Edge[];
  variables: Variable[];
}

export interface Block {
  id: string;
  name: string;
  workflow_id: string;
  group_id?: string;
  block_type: BlockType;
  content: BlockContent | Record<string, unknown>;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface Edge {
  id: string;
  workflow_id: string;
  source_block: string;
  target_block: string;
  source_handle: string;
  target_handle: string;
  condition?: Record<string, unknown>;
  created_at: string;
}

export interface Variable {
  id: string;
  workflow_id: string;
  name: string;
  value: unknown;
  is_system: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  workflow_id: string;
  title: string;
  position_x: number;
  position_y: number;
  blocks: Block[];
  created_at: string;
}

// ============ API Request/Response Types ============

export interface WorkflowCreateRequest {
  name: string;
  description?: string;
}

export interface WorkflowUpdateRequest {
  name?: string;
  description?: string;
  is_published?: boolean;
  is_active?: boolean;
}

export interface BlockCreateRequest {
  name?: string;
  block_type: BlockType;
  group_id?: string;
  content?: BlockContent | Record<string, unknown>;
  position_x?: number;
  position_y?: number;
}

export interface BlockUpdateRequest {
  name?: string;
  group_id?: string;
  content?: BlockContent | Record<string, unknown>;
  position_x?: number;
  position_y?: number;
}

export interface EdgeCreateRequest {
  source_block: string;
  target_block: string;
  source_handle?: string;
  target_handle?: string;
  condition?: Record<string, unknown>;
}

// ============ Block Category Definitions ============

export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  category: BlockCategory;
  defaultContent: Partial<BlockContent>;
}

export type BlockCategory = "triggers" | "inputs" | "ai" | "logic" | "outputs";

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // Triggers
  {
    type: "webhook",
    label: "Webhook",
    description: "Trigger on HTTP request",
    icon: "Webhook",
    category: "triggers",
    defaultContent: { method: "POST", headers: {} },
  },
  {
    type: "whatsapp_trigger",
    label: "WhatsApp Trigger",
    description: "Trigger on WhatsApp message",
    icon: "MessageSquare",
    category: "triggers",
    defaultContent: { keywords: [] },
  },
  {
    type: "schedule",
    label: "Schedule",
    description: "Trigger on schedule",
    icon: "Clock",
    category: "triggers",
    defaultContent: { timezone: "America/Sao_Paulo" },
  },
  // Inputs
  {
    type: "text_input",
    label: "Text Input",
    description: "Collect text from user",
    icon: "Type",
    category: "inputs",
    defaultContent: { prompt: "", placeholder: "", variable_name: "user_input" },
  },
  {
    type: "email_input",
    label: "Email Input",
    description: "Collect email from user",
    icon: "Mail",
    category: "inputs",
    defaultContent: { prompt: "Digite seu email:", variable_name: "user_email" },
  },
  {
    type: "phone_input",
    label: "Phone Input",
    description: "Collect phone from user",
    icon: "Phone",
    category: "inputs",
    defaultContent: { prompt: "Digite seu telefone:", variable_name: "user_phone", country_code: "+55" },
  },
  {
    type: "choice",
    label: "Choice",
    description: "Present options to user",
    icon: "ListChecks",
    category: "inputs",
    defaultContent: { prompt: "", options: [], variable_name: "user_choice" },
  },
  // AI Models
  {
    type: "openai",
    label: "OpenAI",
    description: "GPT-4o, GPT-4o-mini",
    icon: "Bot",
    category: "ai",
    defaultContent: { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 1000, output_variable: "ai_response" },
  },
  {
    type: "claude",
    label: "Claude",
    description: "Claude 3.5 Sonnet",
    icon: "Brain",
    category: "ai",
    defaultContent: { model: "claude-3-5-sonnet-20241022", temperature: 0.7, max_tokens: 1000, output_variable: "ai_response" },
  },
  {
    type: "deepseek",
    label: "DeepSeek",
    description: "DeepSeek R1 70B",
    icon: "Brain",
    category: "ai",
    defaultContent: { model: "deepseek-r1:70b", temperature: 0.7, output_variable: "ai_response" },
  },
  // Logic
  {
    type: "condition",
    label: "Condition",
    description: "Branch based on condition",
    icon: "GitBranch",
    category: "logic",
    defaultContent: { expression: "", true_label: "Yes", false_label: "No" },
  },
  {
    type: "set_variable",
    label: "Set Variable",
    description: "Set or compute variable",
    icon: "Variable",
    category: "logic",
    defaultContent: { variable_name: "", value: null },
  },
  {
    type: "wait",
    label: "Wait",
    description: "Pause execution",
    icon: "Timer",
    category: "logic",
    defaultContent: { duration_seconds: 1, duration_type: "seconds" },
  },
  // Outputs
  {
    type: "text_response",
    label: "Text Response",
    description: "Send text message",
    icon: "MessageCircle",
    category: "outputs",
    defaultContent: { message: "", typing_delay: 0 },
  },
  {
    type: "image_response",
    label: "Image Response",
    description: "Send image",
    icon: "Image",
    category: "outputs",
    defaultContent: { image_url: "" },
  },
  {
    type: "whatsapp_template",
    label: "WhatsApp Template",
    description: "Send approved template",
    icon: "Send",
    category: "outputs",
    defaultContent: { template_name: "", template_language: "pt_BR", components: [] },
  },
];

// Helper to get block definition
export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((def) => def.type === type);
}

// Helper to get default content for block type
export function getDefaultContent(type: BlockType): Partial<BlockContent> {
  return getBlockDefinition(type)?.defaultContent || {};
}
