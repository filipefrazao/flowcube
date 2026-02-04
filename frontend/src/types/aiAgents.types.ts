/**
 * FlowCube - AI Agents Types
 * Complete TypeScript definitions for AI Agent Builder
 */

// ============ Enums ============

export enum LLMProviderType {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  DEEPSEEK = "deepseek",
  GROQ = "groq",
  OLLAMA = "ollama",
  TOGETHER = "together",
  RUNPOD = "runpod",
  CUSTOM = "custom",
}

export enum AgentStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  ERROR = "error",
  ARCHIVED = "archived",
}

export enum ConversationStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
  TIMEOUT = "timeout",
  CANCELLED = "cancelled",
}

export enum MessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
  TOOL = "tool",
  FUNCTION = "function",
}

export enum MessageStatus {
  PENDING = "pending",
  STREAMING = "streaming",
  COMPLETED = "completed",
  ERROR = "error",
  CANCELLED = "cancelled",
}

export enum ToolType {
  FUNCTION = "function",
  HTTP = "http",
  CODE = "code",
  RETRIEVAL = "retrieval",
  BROWSER = "browser",
  DATABASE = "database",
  CUSTOM = "custom",
}

export enum ToolStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
}

export enum KnowledgeBaseType {
  VECTOR = "vector",
  KEYWORD = "keyword",
  HYBRID = "hybrid",
}

export enum DocumentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  INDEXED = "indexed",
  FAILED = "failed",
}

export enum DocumentType {
  PDF = "pdf",
  TXT = "txt",
  MARKDOWN = "markdown",
  HTML = "html",
  CSV = "csv",
  JSON = "json",
  DOCX = "docx",
  URL = "url",
}

export enum StreamEventType {
  CONTENT_START = "content_start",
  CONTENT_DELTA = "content_delta",
  CONTENT_END = "content_end",
  TOOL_CALL_START = "tool_call_start",
  TOOL_CALL_DELTA = "tool_call_delta",
  TOOL_CALL_END = "tool_call_end",
  TOOL_RESULT = "tool_result",
  ERROR = "error",
  DONE = "done",
  METADATA = "metadata",
  THINKING_START = "thinking_start",
  THINKING_DELTA = "thinking_delta",
  THINKING_END = "thinking_end",
}

export enum ToolExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCESS = "success",
  ERROR = "error",
  TIMEOUT = "timeout",
}

// ============ LLM Provider Types ============

export interface LLMProviderConfig {
  api_key?: string;
  base_url?: string;
  organization_id?: string;
  project_id?: string;
  region?: string;
  custom_headers?: Record<string, string>;
  timeout_ms?: number;
  max_retries?: number;
}

export interface OpenAIConfig extends LLMProviderConfig {
  api_key: string;
  organization_id?: string;
  project_id?: string;
}

export interface AnthropicConfig extends LLMProviderConfig {
  api_key: string;
  anthropic_version?: string;
}

export interface DeepSeekConfig extends LLMProviderConfig {
  api_key: string;
  base_url?: string;
}

export interface GroqConfig extends LLMProviderConfig {
  api_key: string;
}

export interface OllamaConfig extends LLMProviderConfig {
  base_url: string;
  model_name?: string;
}

export interface TogetherConfig extends LLMProviderConfig {
  api_key: string;
}

export interface RunPodConfig extends LLMProviderConfig {
  api_key: string;
  endpoint_id: string;
  base_url?: string;
}

export interface CustomLLMConfig extends LLMProviderConfig {
  base_url: string;
  api_key?: string;
  auth_type?: "bearer" | "api_key" | "basic" | "none";
  auth_header?: string;
}

export type ProviderConfigMap = {
  [LLMProviderType.OPENAI]: OpenAIConfig;
  [LLMProviderType.ANTHROPIC]: AnthropicConfig;
  [LLMProviderType.DEEPSEEK]: DeepSeekConfig;
  [LLMProviderType.GROQ]: GroqConfig;
  [LLMProviderType.OLLAMA]: OllamaConfig;
  [LLMProviderType.TOGETHER]: TogetherConfig;
  [LLMProviderType.RUNPOD]: RunPodConfig;
  [LLMProviderType.CUSTOM]: CustomLLMConfig;
};

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProviderType;
  context_window: number;
  max_output_tokens: number;
  input_cost_per_1k?: number;
  output_cost_per_1k?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
  supports_streaming?: boolean;
  supports_json_mode?: boolean;
  supports_thinking?: boolean;
  is_reasoning_model?: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  type: LLMProviderType;
  config: ProviderConfigMap[LLMProviderType];
  is_default: boolean;
  is_verified: boolean;
  available_models: LLMModel[];
  rate_limits?: {
    requests_per_minute?: number;
    tokens_per_minute?: number;
    requests_per_day?: number;
  };
  usage_today?: {
    requests: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  };
  created_at: string;
  updated_at: string;
}

export interface LLMProviderCreateRequest {
  name: string;
  type: LLMProviderType;
  config: ProviderConfigMap[LLMProviderType];
  is_default?: boolean;
}

export interface LLMProviderUpdateRequest {
  name?: string;
  config?: Partial<ProviderConfigMap[LLMProviderType]>;
  is_default?: boolean;
}

// ============ Agent Tool Types ============

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface HttpToolConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body_template?: string;
  query_params?: Record<string, string>;
  timeout_ms?: number;
  response_path?: string;
}

export interface CodeToolConfig {
  language: "javascript" | "python";
  code: string;
  timeout_ms?: number;
  sandbox?: boolean;
}

export interface RetrievalToolConfig {
  knowledge_base_id: string;
  top_k?: number;
  similarity_threshold?: number;
  rerank?: boolean;
}

export interface DatabaseToolConfig {
  connection_id: string;
  query_template: string;
  read_only?: boolean;
}

export interface BrowserToolConfig {
  allowed_domains?: string[];
  timeout_ms?: number;
  screenshot?: boolean;
  extract_text?: boolean;
}

export type ToolConfig =
  | HttpToolConfig
  | CodeToolConfig
  | RetrievalToolConfig
  | DatabaseToolConfig
  | BrowserToolConfig;

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  definition: ToolDefinition;
  config: ToolConfig;
  status: ToolStatus;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
  // Stats
  execution_count?: number;
  avg_execution_time_ms?: number;
  error_rate?: number;
  last_executed_at?: string;
}

export interface AgentToolCreateRequest {
  name: string;
  description: string;
  type: ToolType;
  definition: ToolDefinition;
  config: ToolConfig;
}

export interface AgentToolUpdateRequest {
  name?: string;
  description?: string;
  definition?: ToolDefinition;
  config?: Partial<ToolConfig>;
  status?: ToolStatus;
}

export interface ToolExecution {
  id: string;
  tool_id: string;
  tool_name: string;
  conversation_id: string;
  message_id: string;
  call_id: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: ToolExecutionStatus;
  duration_ms?: number;
  started_at: string;
  completed_at?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string | Record<string, unknown>;
}

export interface ToolCallResult {
  tool_call_id: string;
  name: string;
  content: string;
  is_error?: boolean;
}

// ============ Knowledge Base Types ============

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  type: KnowledgeBaseType;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  is_active: boolean;
  document_count: number;
  total_chunks: number;
  total_tokens: number;
  storage_size_bytes: number;
  created_at: string;
  updated_at: string;
  last_indexed_at?: string;
}

export interface KnowledgeBaseCreateRequest {
  name: string;
  description?: string;
  type?: KnowledgeBaseType;
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface KnowledgeBaseUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface KnowledgeDocument {
  id: string;
  knowledge_base_id: string;
  name: string;
  type: DocumentType;
  source_url?: string;
  file_size_bytes?: number;
  status: DocumentStatus;
  chunk_count: number;
  token_count: number;
  metadata?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
  updated_at: string;
  indexed_at?: string;
}

export interface KnowledgeDocumentCreateRequest {
  name: string;
  type: DocumentType;
  content?: string;
  source_url?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentUploadResponse {
  document_id: string;
  name: string;
  status: DocumentStatus;
  message: string;
}

export interface RetrievalResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievalQuery {
  query: string;
  knowledge_base_ids: string[];
  top_k?: number;
  similarity_threshold?: number;
  filters?: Record<string, unknown>;
  rerank?: boolean;
}

export interface RetrievalResponse {
  results: RetrievalResult[];
  query: string;
  processing_time_ms: number;
}

// ============ Agent Definition Types ============

export interface AgentPersonality {
  tone?: "professional" | "friendly" | "casual" | "formal" | "empathetic";
  language?: string;
  response_style?: "concise" | "detailed" | "conversational";
  custom_traits?: string[];
}

export interface AgentGuardrails {
  max_conversation_turns?: number;
  max_tokens_per_response?: number;
  forbidden_topics?: string[];
  require_tool_confirmation?: boolean;
  pii_redaction?: boolean;
  content_moderation?: boolean;
  allowed_domains?: string[];
}

export interface AgentModelConfig {
  provider_id: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
  json_mode?: boolean;
  seed?: number;
  thinking_mode?: boolean;
  thinking_budget?: number;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  status: AgentStatus;
  // Model configuration
  model_config: AgentModelConfig;
  // System prompt
  system_prompt: string;
  // Personality
  personality?: AgentPersonality;
  // Guardrails
  guardrails?: AgentGuardrails;
  // Tools
  tool_ids: string[];
  tools?: AgentTool[];
  // Knowledge bases
  knowledge_base_ids: string[];
  knowledge_bases?: KnowledgeBase[];
  // Retrieval settings
  retrieval_config?: {
    enabled: boolean;
    auto_retrieve: boolean;
    top_k: number;
    similarity_threshold: number;
    include_metadata: boolean;
  };
  // Fallback
  fallback_response?: string;
  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;
  // Stats
  conversation_count?: number;
  message_count?: number;
  avg_response_time_ms?: number;
  total_tokens_used?: number;
  total_cost_usd?: number;
  // Timestamps
  created_at: string;
  updated_at: string;
  last_active_at?: string;
}

export interface AgentCreateRequest {
  name: string;
  description?: string;
  avatar_url?: string;
  model_config: AgentModelConfig;
  system_prompt: string;
  personality?: AgentPersonality;
  guardrails?: AgentGuardrails;
  tool_ids?: string[];
  knowledge_base_ids?: string[];
  retrieval_config?: AgentDefinition["retrieval_config"];
  fallback_response?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentUpdateRequest {
  name?: string;
  description?: string;
  avatar_url?: string;
  status?: AgentStatus;
  model_config?: Partial<AgentModelConfig>;
  system_prompt?: string;
  personality?: AgentPersonality;
  guardrails?: AgentGuardrails;
  tool_ids?: string[];
  knowledge_base_ids?: string[];
  retrieval_config?: AgentDefinition["retrieval_config"];
  fallback_response?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============ Conversation Types ============

export interface ConversationMetadata {
  source?: string;
  user_id?: string;
  session_id?: string;
  channel?: string;
  workflow_id?: string;
  workflow_execution_id?: string;
  custom?: Record<string, unknown>;
}

export interface AgentConversation {
  id: string;
  agent_id: string;
  agent?: AgentDefinition;
  status: ConversationStatus;
  title?: string;
  metadata?: ConversationMetadata;
  message_count: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  tool_calls_count: number;
  retrievals_count: number;
  avg_response_time_ms?: number;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  ended_at?: string;
}

export interface ConversationCreateRequest {
  agent_id: string;
  title?: string;
  metadata?: ConversationMetadata;
  initial_messages?: MessageCreateRequest[];
}

export interface ConversationUpdateRequest {
  title?: string;
  status?: ConversationStatus;
  metadata?: ConversationMetadata;
}

// ============ Message Types ============

export interface MessageToolCall {
  id: string;
  name: string;
  arguments: string;
  status: ToolExecutionStatus;
  result?: string;
  error?: string;
  duration_ms?: number;
}

export interface MessageRetrieval {
  query: string;
  results: RetrievalResult[];
  processing_time_ms: number;
}

export interface MessageUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  thinking_tokens?: number;
}

export interface AgentMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  // Tool calls (for assistant messages)
  tool_calls?: MessageToolCall[];
  // Tool result (for tool messages)
  tool_call_id?: string;
  tool_name?: string;
  // Retrieval context
  retrieval?: MessageRetrieval;
  // Thinking/reasoning (for reasoning models)
  thinking?: string;
  // Usage stats
  usage?: MessageUsage;
  // Model info
  model?: string;
  finish_reason?: "stop" | "length" | "tool_calls" | "content_filter" | "error";
  // Timing
  latency_ms?: number;
  time_to_first_token_ms?: number;
  // Metadata
  metadata?: Record<string, unknown>;
  // Timestamps
  created_at: string;
  updated_at?: string;
}

export interface MessageCreateRequest {
  role: MessageRole;
  content: string;
  tool_call_id?: string;
  tool_name?: string;
  metadata?: Record<string, unknown>;
}

// ============ Streaming Types ============

export interface StreamEvent {
  type: StreamEventType;
  data: StreamEventData;
}

export interface ContentStartData {
  message_id: string;
  conversation_id: string;
  role: MessageRole;
  model: string;
}

export interface ContentDeltaData {
  message_id: string;
  delta: string;
  accumulated?: string;
}

export interface ContentEndData {
  message_id: string;
  content: string;
  finish_reason: string;
  usage: MessageUsage;
  latency_ms: number;
}

export interface ToolCallStartData {
  message_id: string;
  tool_call_id: string;
  tool_name: string;
}

export interface ToolCallDeltaData {
  message_id: string;
  tool_call_id: string;
  arguments_delta: string;
}

export interface ToolCallEndData {
  message_id: string;
  tool_call_id: string;
  tool_name: string;
  arguments: string;
}

export interface ToolResultData {
  message_id: string;
  tool_call_id: string;
  tool_name: string;
  result: string;
  is_error: boolean;
  duration_ms: number;
}

export interface ThinkingStartData {
  message_id: string;
}

export interface ThinkingDeltaData {
  message_id: string;
  delta: string;
}

export interface ThinkingEndData {
  message_id: string;
  thinking: string;
  thinking_tokens: number;
}

export interface MetadataData {
  conversation_id: string;
  message_id: string;
  model: string;
  provider: string;
  retrieval_results?: RetrievalResult[];
}

export interface ErrorData {
  message_id?: string;
  error: string;
  code?: string;
  recoverable?: boolean;
}

export type StreamEventData =
  | ContentStartData
  | ContentDeltaData
  | ContentEndData
  | ToolCallStartData
  | ToolCallDeltaData
  | ToolCallEndData
  | ToolResultData
  | ThinkingStartData
  | ThinkingDeltaData
  | ThinkingEndData
  | MetadataData
  | ErrorData
  | { done: true };

export interface StreamingState {
  isStreaming: boolean;
  currentMessageId: string | null;
  accumulatedContent: string;
  accumulatedThinking: string;
  activeToolCalls: Map<string, {
    id: string;
    name: string;
    arguments: string;
    status: ToolExecutionStatus;
  }>;
  error: string | null;
}

// ============ Chat Request/Response Types ============

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  agent_id?: string;
  stream?: boolean;
  include_retrieval?: boolean;
  tool_choice?: "auto" | "none" | "required" | { name: string };
  temperature?: number;
  max_tokens?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  conversation_id: string;
  message: AgentMessage;
  tool_calls?: MessageToolCall[];
  retrieval?: MessageRetrieval;
  usage: MessageUsage;
}

// ============ Agent Stats & Analytics Types ============

export interface AgentStats {
  conversation_count: number;
  message_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  avg_response_time_ms: number;
  avg_messages_per_conversation: number;
  tool_usage: Record<string, {
    calls: number;
    errors: number;
    avg_duration_ms: number;
  }>;
  retrieval_stats: {
    total_queries: number;
    avg_results_per_query: number;
    avg_similarity_score: number;
  };
  daily_stats: Array<{
    date: string;
    conversations: number;
    messages: number;
    tokens: number;
    cost_usd: number;
  }>;
}

export interface TokenUsageBreakdown {
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens?: number;
  total_tokens: number;
  cost_usd: number;
  date: string;
}

export interface CostReport {
  period_start: string;
  period_end: string;
  total_cost_usd: number;
  by_provider: Record<string, {
    cost_usd: number;
    tokens: number;
    requests: number;
  }>;
  by_agent: Record<string, {
    cost_usd: number;
    tokens: number;
    conversations: number;
  }>;
  daily_breakdown: Array<{
    date: string;
    cost_usd: number;
    tokens: number;
  }>;
}

// ============ Test Console Types ============

export interface TestInput {
  message: string;
  context?: Record<string, unknown>;
  simulate_user_id?: string;
}

export interface TestResult {
  input: TestInput;
  response: ChatResponse;
  tool_executions: ToolExecution[];
  retrieval_results?: RetrievalResult[];
  timing: {
    total_ms: number;
    llm_ms: number;
    tool_ms: number;
    retrieval_ms: number;
  };
  tokens: MessageUsage;
}

export interface TestSession {
  id: string;
  agent_id: string;
  conversation_id: string;
  test_inputs: TestInput[];
  test_results: TestResult[];
  created_at: string;
}

// ============ Pagination Types ============

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_more: boolean;
}

export interface AgentFilters {
  status?: AgentStatus;
  search?: string;
  tags?: string[];
  provider_id?: string;
}

export interface ConversationFilters {
  agent_id?: string;
  status?: ConversationStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface MessageFilters {
  role?: MessageRole;
  status?: MessageStatus;
  has_tool_calls?: boolean;
}

// ============ Workflow Node Types ============

export interface AIAgentNodeConfig {
  agent_id: string;
  input_mapping?: Record<string, string>;
  output_mapping?: Record<string, string>;
  continue_on_tool_error?: boolean;
  max_iterations?: number;
  timeout_ms?: number;
}

export interface LLMNodeConfig {
  provider_id: string;
  model: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  json_mode?: boolean;
  tools?: ToolDefinition[];
}

export interface RAGNodeConfig {
  knowledge_base_ids: string[];
  query_template?: string;
  top_k?: number;
  similarity_threshold?: number;
  output_format?: "text" | "json" | "markdown";
}

export interface ToolCallNodeConfig {
  tool_id: string;
  argument_mapping?: Record<string, string>;
  output_variable?: string;
  timeout_ms?: number;
}

export interface AgentConditionNodeConfig {
  agent_id?: string;
  provider_id?: string;
  model?: string;
  decision_prompt: string;
  options: Array<{
    label: string;
    description: string;
    output_id: string;
  }>;
  default_output_id?: string;
}

// ============ Event Types ============

export interface AgentEvent {
  type: "message" | "tool_call" | "tool_result" | "retrieval" | "error" | "state_change";
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ConversationEvent extends AgentEvent {
  conversation_id: string;
  message_id?: string;
}


