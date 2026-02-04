/**
 * FlowCube - AI Agent Store
 * Zustand store for AI Agent Builder state management
 */
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  MessageRole,
  MessageStatus,
  ToolExecutionStatus,
} from "@/types/aiAgents.types";
import type {
  LLMProvider,
  LLMProviderCreateRequest,
  LLMProviderUpdateRequest,
  LLMModel,
  AgentTool,
  AgentToolCreateRequest,
  AgentToolUpdateRequest,
  ToolExecution,
  KnowledgeBase,
  KnowledgeBaseCreateRequest,
  KnowledgeBaseUpdateRequest,
  KnowledgeDocument,
  RetrievalResult,
  AgentDefinition,
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentStatus,
  AgentStats,
  AgentConversation,
  ConversationCreateRequest,
  ConversationStatus,
  AgentMessage,
  MessageUsage,
  StreamingState,
  AgentFilters,
  ConversationFilters,
} from "@/types/aiAgents.types";
import { aiAgentsApiClient } from "@/lib/api/aiAgents";

// ============ State Types ============

interface AIAgentState {
  // Provider state
  providers: LLMProvider[];
  selectedProviderId: string | null;
  providersLoading: boolean;
  providersError: string | null;
  availableModels: LLMModel[];

  // Tool state
  tools: AgentTool[];
  selectedToolId: string | null;
  toolsLoading: boolean;
  toolsError: string | null;
  toolExecutions: ToolExecution[];

  // Knowledge base state
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBaseId: string | null;
  knowledgeBasesLoading: boolean;
  knowledgeBasesError: string | null;
  documents: KnowledgeDocument[];
  documentsLoading: boolean;
  uploadProgress: Map<string, number>;

  // Agent state
  agents: AgentDefinition[];
  selectedAgentId: string | null;
  agentsLoading: boolean;
  agentsError: string | null;
  agentFilters: AgentFilters;
  agentStats: AgentStats | null;

  // Conversation state
  conversations: AgentConversation[];
  selectedConversationId: string | null;
  conversationsLoading: boolean;
  conversationsError: string | null;
  conversationFilters: ConversationFilters;
  conversationsPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  // Message state
  messages: AgentMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  hasMoreMessages: boolean;

  // Streaming state
  streaming: StreamingState;
  activeToolCalls: Map<string, {
    id: string;
    name: string;
    arguments: string;
    status: ToolExecutionStatus;
    result?: string;
    error?: string;
  }>;

  // UI state
  showAgentBuilder: boolean;
  showToolEditor: boolean;
  showProviderConfig: boolean;
  showKnowledgeBaseManager: boolean;
  showTestConsole: boolean;
  builderStep: number;
  chatInput: string;
  isTestMode: boolean;
  testSessionId: string | null;

  // Actions - Providers
  fetchProviders: () => Promise<void>;
  createProvider: (data: LLMProviderCreateRequest) => Promise<LLMProvider>;
  updateProvider: (id: string, data: LLMProviderUpdateRequest) => Promise<LLMProvider>;
  deleteProvider: (id: string) => Promise<void>;
  selectProvider: (id: string | null) => void;
  testProviderConnection: (id: string) => Promise<{ success: boolean; message: string }>;
  setProviderAsDefault: (id: string) => Promise<void>;
  fetchModels: (providerId: string) => Promise<void>;

  // Actions - Tools
  fetchTools: (includeBuiltin?: boolean) => Promise<void>;
  createTool: (data: AgentToolCreateRequest) => Promise<AgentTool>;
  updateTool: (id: string, data: AgentToolUpdateRequest) => Promise<AgentTool>;
  deleteTool: (id: string) => Promise<void>;
  selectTool: (id: string | null) => void;
  testTool: (id: string, arguments_: Record<string, unknown>) => Promise<{ success: boolean; result: unknown }>;
  duplicateTool: (id: string, name?: string) => Promise<AgentTool>;

  // Actions - Knowledge Bases
  fetchKnowledgeBases: () => Promise<void>;
  createKnowledgeBase: (data: KnowledgeBaseCreateRequest) => Promise<KnowledgeBase>;
  updateKnowledgeBase: (id: string, data: KnowledgeBaseUpdateRequest) => Promise<KnowledgeBase>;
  deleteKnowledgeBase: (id: string) => Promise<void>;
  selectKnowledgeBase: (id: string | null) => void;
  fetchDocuments: (knowledgeBaseId: string) => Promise<void>;
  uploadDocument: (knowledgeBaseId: string, file: File, metadata?: Record<string, unknown>) => Promise<void>;
  uploadDocuments: (knowledgeBaseId: string, files: File[]) => Promise<void>;
  deleteDocument: (knowledgeBaseId: string, documentId: string) => Promise<void>;
  queryKnowledgeBase: (query: string, knowledgeBaseIds: string[], topK?: number) => Promise<RetrievalResult[]>;

  // Actions - Agents
  fetchAgents: (filters?: AgentFilters) => Promise<void>;
  createAgent: (data: AgentCreateRequest) => Promise<AgentDefinition>;
  updateAgent: (id: string, data: AgentUpdateRequest) => Promise<AgentDefinition>;
  deleteAgent: (id: string) => Promise<void>;
  selectAgent: (id: string | null) => void;
  duplicateAgent: (id: string, name?: string) => Promise<AgentDefinition>;
  activateAgent: (id: string) => Promise<void>;
  deactivateAgent: (id: string) => Promise<void>;
  fetchAgentStats: (id: string) => Promise<void>;
  setAgentFilters: (filters: Partial<AgentFilters>) => void;

  // Actions - Conversations
  fetchConversations: (filters?: ConversationFilters, page?: number) => Promise<void>;
  createConversation: (agentId: string, title?: string) => Promise<AgentConversation>;
  selectConversation: (id: string | null) => void;
  endConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setConversationFilters: (filters: Partial<ConversationFilters>) => void;
  setConversationPage: (page: number) => void;

  // Actions - Messages
  fetchMessages: (conversationId: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (content: string, options?: { stream?: boolean }) => Promise<void>;
  sendMessageStream: (content: string) => { abort: () => void };
  setChatInput: (input: string) => void;
  clearMessages: () => void;

  // Actions - Streaming
  startStreaming: (messageId: string, conversationId: string) => void;
  appendStreamContent: (delta: string) => void;
  appendStreamThinking: (delta: string) => void;
  addToolCall: (toolCallId: string, toolName: string) => void;
  updateToolCallArguments: (toolCallId: string, argumentsDelta: string) => void;
  completeToolCall: (toolCallId: string, arguments_: string) => void;
  setToolCallResult: (toolCallId: string, result: string, isError: boolean) => void;
  endStreaming: (message: AgentMessage) => void;
  setStreamingError: (error: string) => void;
  cancelStreaming: () => void;

  // Actions - Test Console
  startTestSession: (agentId: string) => Promise<void>;
  runTest: (message: string, context?: Record<string, unknown>) => Promise<void>;
  clearTestSession: () => Promise<void>;
  setTestMode: (enabled: boolean) => void;

  // Actions - UI
  setShowAgentBuilder: (show: boolean) => void;
  setShowToolEditor: (show: boolean) => void;
  setShowProviderConfig: (show: boolean) => void;
  setShowKnowledgeBaseManager: (show: boolean) => void;
  setShowTestConsole: (show: boolean) => void;
  setBuilderStep: (step: number) => void;

  // Actions - Reset
  reset: () => void;
  resetConversation: () => void;
  resetStreaming: () => void;
}

// ============ Initial State ============

const initialStreamingState: StreamingState = {
  isStreaming: false,
  currentMessageId: null,
  accumulatedContent: "",
  accumulatedThinking: "",
  activeToolCalls: new Map(),
  error: null,
};

const initialState = {
  // Provider state
  providers: [] as LLMProvider[],
  selectedProviderId: null as string | null,
  providersLoading: false,
  providersError: null as string | null,
  availableModels: [] as LLMModel[],

  // Tool state
  tools: [] as AgentTool[],
  selectedToolId: null as string | null,
  toolsLoading: false,
  toolsError: null as string | null,
  toolExecutions: [] as ToolExecution[],

  // Knowledge base state
  knowledgeBases: [] as KnowledgeBase[],
  selectedKnowledgeBaseId: null as string | null,
  knowledgeBasesLoading: false,
  knowledgeBasesError: null as string | null,
  documents: [] as KnowledgeDocument[],
  documentsLoading: false,
  uploadProgress: new Map<string, number>(),

  // Agent state
  agents: [] as AgentDefinition[],
  selectedAgentId: null as string | null,
  agentsLoading: false,
  agentsError: null as string | null,
  agentFilters: {} as AgentFilters,
  agentStats: null as AgentStats | null,

  // Conversation state
  conversations: [] as AgentConversation[],
  selectedConversationId: null as string | null,
  conversationsLoading: false,
  conversationsError: null as string | null,
  conversationFilters: {} as ConversationFilters,
  conversationsPagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },

  // Message state
  messages: [] as AgentMessage[],
  messagesLoading: false,
  messagesError: null as string | null,
  hasMoreMessages: true,

  // Streaming state
  streaming: initialStreamingState,
  activeToolCalls: new Map(),

  // UI state
  showAgentBuilder: false,
  showToolEditor: false,
  showProviderConfig: false,
  showKnowledgeBaseManager: false,
  showTestConsole: false,
  builderStep: 0,
  chatInput: "",
  isTestMode: false,
  testSessionId: null as string | null,
};

// ============ Store ============

export const useAIAgentStore = create<AIAgentState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ============ Provider Actions ============

        fetchProviders: async () => {
          set((state) => {
            state.providersLoading = true;
            state.providersError = null;
          });
          try {
            const providers = await aiAgentsApiClient.providers.list();
            set((state) => {
              state.providers = providers;
              state.providersLoading = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch providers";
            set((state) => {
              state.providersError = message;
              state.providersLoading = false;
            });
          }
        },

        createProvider: async (data: LLMProviderCreateRequest) => {
          const provider = await aiAgentsApiClient.providers.create(data);
          set((state) => {
            state.providers.push(provider);
          });
          return provider;
        },

        updateProvider: async (id: string, data: LLMProviderUpdateRequest) => {
          const provider = await aiAgentsApiClient.providers.update(id, data);
          set((state) => {
            const index = state.providers.findIndex((p: LLMProvider) => p.id === id);
            if (index !== -1) state.providers[index] = provider;
          });
          return provider;
        },

        deleteProvider: async (id: string) => {
          await aiAgentsApiClient.providers.delete(id);
          set((state) => {
            state.providers = state.providers.filter((p: LLMProvider) => p.id !== id);
            if (state.selectedProviderId === id) {
              state.selectedProviderId = null;
            }
          });
        },

        selectProvider: (id: string | null) => {
          set((state) => {
            state.selectedProviderId = id;
          });
          if (id) get().fetchModels(id);
        },

        testProviderConnection: async (id: string) => {
          const result = await aiAgentsApiClient.providers.testConnection(id);
          return result;
        },

        setProviderAsDefault: async (id: string) => {
          const provider = await aiAgentsApiClient.providers.setDefault(id);
          set((state) => {
            state.providers.forEach((p: LLMProvider) => {
              p.is_default = p.id === id;
            });
            const index = state.providers.findIndex((p: LLMProvider) => p.id === id);
            if (index !== -1) state.providers[index] = provider;
          });
        },

        fetchModels: async (providerId: string) => {
          try {
            const models = await aiAgentsApiClient.providers.listModels(providerId);
            set((state) => {
              state.availableModels = models;
            });
          } catch (error) {
            console.error("Failed to fetch models:", error);
          }
        },

        // ============ Tool Actions ============

        fetchTools: async (includeBuiltin?: boolean) => {
          set((state) => {
            state.toolsLoading = true;
            state.toolsError = null;
          });
          try {
            const tools = await aiAgentsApiClient.tools.list(includeBuiltin);
            set((state) => {
              state.tools = tools;
              state.toolsLoading = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch tools";
            set((state) => {
              state.toolsError = message;
              state.toolsLoading = false;
            });
          }
        },

        createTool: async (data: AgentToolCreateRequest) => {
          const tool = await aiAgentsApiClient.tools.create(data);
          set((state) => {
            state.tools.push(tool);
          });
          return tool;
        },

        updateTool: async (id: string, data: AgentToolUpdateRequest) => {
          const tool = await aiAgentsApiClient.tools.update(id, data);
          set((state) => {
            const index = state.tools.findIndex((t: AgentTool) => t.id === id);
            if (index !== -1) state.tools[index] = tool;
          });
          return tool;
        },

        deleteTool: async (id: string) => {
          await aiAgentsApiClient.tools.delete(id);
          set((state) => {
            state.tools = state.tools.filter((t: AgentTool) => t.id !== id);
            if (state.selectedToolId === id) {
              state.selectedToolId = null;
            }
          });
        },

        selectTool: (id: string | null) => {
          set((state) => {
            state.selectedToolId = id;
          });
        },

        testTool: async (id: string, arguments_: Record<string, unknown>) => {
          const result = await aiAgentsApiClient.tools.test(id, arguments_);
          return result;
        },

        duplicateTool: async (id: string, name?: string) => {
          const tool = await aiAgentsApiClient.tools.duplicate(id, name);
          set((state) => {
            state.tools.push(tool);
          });
          return tool;
        },

        // ============ Knowledge Base Actions ============

        fetchKnowledgeBases: async () => {
          set((state) => {
            state.knowledgeBasesLoading = true;
            state.knowledgeBasesError = null;
          });
          try {
            const knowledgeBases = await aiAgentsApiClient.knowledgeBases.list();
            set((state) => {
              state.knowledgeBases = knowledgeBases;
              state.knowledgeBasesLoading = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch knowledge bases";
            set((state) => {
              state.knowledgeBasesError = message;
              state.knowledgeBasesLoading = false;
            });
          }
        },

        createKnowledgeBase: async (data: KnowledgeBaseCreateRequest) => {
          const kb = await aiAgentsApiClient.knowledgeBases.create(data);
          set((state) => {
            state.knowledgeBases.push(kb);
          });
          return kb;
        },

        updateKnowledgeBase: async (id: string, data: KnowledgeBaseUpdateRequest) => {
          const kb = await aiAgentsApiClient.knowledgeBases.update(id, data);
          set((state) => {
            const index = state.knowledgeBases.findIndex((k: KnowledgeBase) => k.id === id);
            if (index !== -1) state.knowledgeBases[index] = kb;
          });
          return kb;
        },

        deleteKnowledgeBase: async (id: string) => {
          await aiAgentsApiClient.knowledgeBases.delete(id);
          set((state) => {
            state.knowledgeBases = state.knowledgeBases.filter((k: KnowledgeBase) => k.id !== id);
            if (state.selectedKnowledgeBaseId === id) {
              state.selectedKnowledgeBaseId = null;
              state.documents = [];
            }
          });
        },

        selectKnowledgeBase: (id: string | null) => {
          set((state) => {
            state.selectedKnowledgeBaseId = id;
            state.documents = [];
          });
          if (id) get().fetchDocuments(id);
        },

        fetchDocuments: async (knowledgeBaseId: string) => {
          set((state) => {
            state.documentsLoading = true;
          });
          try {
            const response = await aiAgentsApiClient.knowledgeBases.listDocuments(knowledgeBaseId);
            set((state) => {
              state.documents = response.items;
              state.documentsLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.documentsLoading = false;
            });
          }
        },

        uploadDocument: async (knowledgeBaseId: string, file: File, metadata?: Record<string, unknown>) => {
          const fileId = `${file.name}-${Date.now()}`;
          set((state) => {
            state.uploadProgress.set(fileId, 0);
          });
          try {
            const result = await aiAgentsApiClient.knowledgeBases.uploadFile(
              knowledgeBaseId,
              file,
              metadata,
              (progress) => {
                set((state) => {
                  state.uploadProgress.set(fileId, progress);
                });
              }
            );
            set((state) => {
              state.uploadProgress.delete(fileId);
            });
            // Refresh documents
            get().fetchDocuments(knowledgeBaseId);
          } catch (error) {
            set((state) => {
              state.uploadProgress.delete(fileId);
            });
            throw error;
          }
        },

        uploadDocuments: async (knowledgeBaseId: string, files: File[]) => {
          for (const file of files) {
            await get().uploadDocument(knowledgeBaseId, file);
          }
        },

        deleteDocument: async (knowledgeBaseId: string, documentId: string) => {
          await aiAgentsApiClient.knowledgeBases.deleteDocument(knowledgeBaseId, documentId);
          set((state) => {
            state.documents = state.documents.filter((d: KnowledgeDocument) => d.id !== documentId);
          });
        },

        queryKnowledgeBase: async (query: string, knowledgeBaseIds: string[], topK?: number) => {
          const response = await aiAgentsApiClient.knowledgeBases.query({
            query,
            knowledge_base_ids: knowledgeBaseIds,
            top_k: topK,
          });
          return response.results;
        },

        // ============ Agent Actions ============

        fetchAgents: async (filters?: AgentFilters) => {
          set((state) => {
            state.agentsLoading = true;
            state.agentsError = null;
            if (filters) state.agentFilters = filters;
          });
          try {
            const agents = await aiAgentsApiClient.agents.list(filters || get().agentFilters);
            set((state) => {
              state.agents = agents;
              state.agentsLoading = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch agents";
            set((state) => {
              state.agentsError = message;
              state.agentsLoading = false;
            });
          }
        },

        createAgent: async (data: AgentCreateRequest) => {
          const agent = await aiAgentsApiClient.agents.create(data);
          set((state) => {
            state.agents.push(agent);
          });
          return agent;
        },

        updateAgent: async (id: string, data: AgentUpdateRequest) => {
          const agent = await aiAgentsApiClient.agents.update(id, data);
          set((state) => {
            const index = state.agents.findIndex((a: AgentDefinition) => a.id === id);
            if (index !== -1) state.agents[index] = agent;
          });
          return agent;
        },

        deleteAgent: async (id: string) => {
          await aiAgentsApiClient.agents.delete(id);
          set((state) => {
            state.agents = state.agents.filter((a: AgentDefinition) => a.id !== id);
            if (state.selectedAgentId === id) {
              state.selectedAgentId = null;
              state.conversations = [];
              state.messages = [];
            }
          });
        },

        selectAgent: (id: string | null) => {
          set((state) => {
            state.selectedAgentId = id;
            state.selectedConversationId = null;
            state.conversations = [];
            state.messages = [];
          });
          if (id) {
            get().fetchConversations({ agent_id: id });
            get().fetchAgentStats(id);
          }
        },

        duplicateAgent: async (id: string, name?: string) => {
          const agent = await aiAgentsApiClient.agents.duplicate(id, name);
          set((state) => {
            state.agents.push(agent);
          });
          return agent;
        },

        activateAgent: async (id: string) => {
          const agent = await aiAgentsApiClient.agents.activate(id);
          set((state) => {
            const index = state.agents.findIndex((a: AgentDefinition) => a.id === id);
            if (index !== -1) state.agents[index] = agent;
          });
        },

        deactivateAgent: async (id: string) => {
          const agent = await aiAgentsApiClient.agents.deactivate(id);
          set((state) => {
            const index = state.agents.findIndex((a: AgentDefinition) => a.id === id);
            if (index !== -1) state.agents[index] = agent;
          });
        },

        fetchAgentStats: async (id: string) => {
          try {
            const stats = await aiAgentsApiClient.agents.getStats(id);
            set((state) => {
              state.agentStats = stats;
            });
          } catch (error) {
            console.error("Failed to fetch agent stats:", error);
          }
        },

        setAgentFilters: (filters: Partial<AgentFilters>) => {
          set((state) => {
            state.agentFilters = { ...state.agentFilters, ...filters };
          });
          get().fetchAgents();
        },

        // ============ Conversation Actions ============

        fetchConversations: async (filters?: ConversationFilters, page?: number) => {
          set((state) => {
            state.conversationsLoading = true;
            state.conversationsError = null;
            if (filters) state.conversationFilters = filters;
            if (page) state.conversationsPagination.page = page;
          });
          try {
            const { conversationFilters, conversationsPagination } = get();
            const response = await aiAgentsApiClient.conversations.list(
              filters || conversationFilters,
              page || conversationsPagination.page,
              conversationsPagination.pageSize
            );
            set((state) => {
              state.conversations = response.items;
              state.conversationsPagination = {
                ...state.conversationsPagination,
                total: response.total,
                totalPages: response.total_pages,
              };
              state.conversationsLoading = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch conversations";
            set((state) => {
              state.conversationsError = message;
              state.conversationsLoading = false;
            });
          }
        },

        createConversation: async (agentId: string, title?: string) => {
          const conversation = await aiAgentsApiClient.conversations.create({
            agent_id: agentId,
            title,
          });
          set((state) => {
            state.conversations.unshift(conversation);
            state.selectedConversationId = conversation.id;
            state.messages = [];
          });
          return conversation;
        },

        selectConversation: (id: string | null) => {
          set((state) => {
            state.selectedConversationId = id;
            state.messages = [];
            state.hasMoreMessages = true;
          });
          if (id) get().fetchMessages(id);
        },

        endConversation: async (id: string) => {
          const conversation = await aiAgentsApiClient.conversations.end(id);
          set((state) => {
            const index = state.conversations.findIndex((c: AgentConversation) => c.id === id);
            if (index !== -1) state.conversations[index] = conversation;
          });
        },

        deleteConversation: async (id: string) => {
          await aiAgentsApiClient.conversations.delete(id);
          set((state) => {
            state.conversations = state.conversations.filter((c: AgentConversation) => c.id !== id);
            if (state.selectedConversationId === id) {
              state.selectedConversationId = null;
              state.messages = [];
            }
          });
        },

        setConversationFilters: (filters: Partial<ConversationFilters>) => {
          set((state) => {
            state.conversationFilters = { ...state.conversationFilters, ...filters };
          });
          get().fetchConversations();
        },

        setConversationPage: (page: number) => {
          get().fetchConversations(undefined, page);
        },

        // ============ Message Actions ============

        fetchMessages: async (conversationId: string, loadMore?: boolean) => {
          set((state) => {
            state.messagesLoading = true;
            state.messagesError = null;
          });
          try {
            const { messages } = get();
            const page = loadMore ? Math.ceil(messages.length / 50) + 1 : 1;
            const response = await aiAgentsApiClient.conversations.listMessages(
              conversationId,
              undefined,
              page,
              50
            );
            set((state) => {
              state.messages = loadMore
                ? [...state.messages, ...response.items]
                : response.items;
              state.hasMoreMessages = response.has_more;
              state.messagesLoading = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch messages";
            set((state) => {
              state.messagesError = message;
              state.messagesLoading = false;
            });
          }
        },

        sendMessage: async (content: string, options?: { stream?: boolean }) => {
          const { selectedConversationId, selectedAgentId } = get();
          if (!selectedAgentId) throw new Error("No agent selected");

          // Create user message optimistically
          const userMessage: AgentMessage = {
            id: `temp-${Date.now()}`,
            conversation_id: selectedConversationId || "",
            role: MessageRole.USER,
            content,
            status: MessageStatus.COMPLETED,
            created_at: new Date().toISOString(),
          };

          set((state) => {
            state.messages.push(userMessage);
          });

          try {
            if (options?.stream !== false) {
              get().sendMessageStream(content);
            } else {
              const response = await aiAgentsApiClient.chat.send({
                message: content,
                conversation_id: selectedConversationId || undefined,
                agent_id: selectedAgentId,
                stream: false,
              });

              set((state) => {
                // Update conversation ID if new
                if (!state.selectedConversationId) {
                  state.selectedConversationId = response.conversation_id;
                }
                // Add assistant message
                state.messages.push(response.message);
              });
            }
          } catch (error) {
            set((state) => {
              // Remove optimistic user message on error
              state.messages = state.messages.filter((m: AgentMessage) => m.id !== userMessage.id);
            });
            throw error;
          }
        },

        sendMessageStream: (content: string) => {
          const { selectedConversationId, selectedAgentId } = get();
          if (!selectedAgentId) throw new Error("No agent selected");

          const streamController = aiAgentsApiClient.chat.sendStream(
            {
              message: content,
              conversation_id: selectedConversationId || undefined,
              agent_id: selectedAgentId,
              stream: true,
            },
            {
              onStart: (messageId, conversationId) => {
                get().startStreaming(messageId, conversationId);
              },
              onContent: (delta) => {
                get().appendStreamContent(delta);
              },
              onThinking: (delta) => {
                get().appendStreamThinking(delta);
              },
              onToolCallStart: (toolCallId, toolName) => {
                get().addToolCall(toolCallId, toolName);
              },
              onToolCallDelta: (toolCallId, argumentsDelta) => {
                get().updateToolCallArguments(toolCallId, argumentsDelta);
              },
              onToolCallEnd: (toolCallId, _, arguments_) => {
                get().completeToolCall(toolCallId, arguments_);
              },
              onToolResult: (toolCallId, _, result, isError) => {
                get().setToolCallResult(toolCallId, result, isError);
              },
              onComplete: (message) => {
                get().endStreaming(message);
              },
              onError: (error) => {
                get().setStreamingError(error);
              },
            }
          );

          return streamController;
        },

        setChatInput: (input: string) => {
          set((state) => {
            state.chatInput = input;
          });
        },

        clearMessages: () => {
          set((state) => {
            state.messages = [];
            state.hasMoreMessages = true;
          });
        },

        // ============ Streaming Actions ============

        startStreaming: (messageId: string, conversationId: string) => {
          set((state) => {
            state.streaming = {
              isStreaming: true,
              currentMessageId: messageId,
              accumulatedContent: "",
              accumulatedThinking: "",
              activeToolCalls: new Map(),
              error: null,
            };
            if (!state.selectedConversationId) {
              state.selectedConversationId = conversationId;
            }
            // Add placeholder assistant message
            state.messages.push({
              id: messageId,
              conversation_id: conversationId,
              role: MessageRole.ASSISTANT,
              content: "",
              status: MessageStatus.STREAMING,
              created_at: new Date().toISOString(),
            });
          });
        },

        appendStreamContent: (delta: string) => {
          set((state) => {
            state.streaming.accumulatedContent += delta;
            // Update the message content
            const messageIndex = state.messages.findIndex(
              (m: AgentMessage) => m.id === state.streaming.currentMessageId
            );
            if (messageIndex !== -1) {
              state.messages[messageIndex].content = state.streaming.accumulatedContent;
            }
          });
        },

        appendStreamThinking: (delta: string) => {
          set((state) => {
            state.streaming.accumulatedThinking += delta;
            // Update the message thinking
            const messageIndex = state.messages.findIndex(
              (m: AgentMessage) => m.id === state.streaming.currentMessageId
            );
            if (messageIndex !== -1) {
              state.messages[messageIndex].thinking = state.streaming.accumulatedThinking;
            }
          });
        },

        addToolCall: (toolCallId: string, toolName: string) => {
          set((state) => {
            state.activeToolCalls.set(toolCallId, {
              id: toolCallId,
              name: toolName,
              arguments: "",
              status: ToolExecutionStatus.PENDING,
            });
          });
        },

        updateToolCallArguments: (toolCallId: string, argumentsDelta: string) => {
          set((state) => {
            const toolCall = state.activeToolCalls.get(toolCallId);
            if (toolCall) {
              toolCall.arguments += argumentsDelta;
              state.activeToolCalls.set(toolCallId, toolCall);
            }
          });
        },

        completeToolCall: (toolCallId: string, arguments_: string) => {
          set((state) => {
            const toolCall = state.activeToolCalls.get(toolCallId);
            if (toolCall) {
              toolCall.arguments = arguments_;
              toolCall.status = ToolExecutionStatus.RUNNING;
              state.activeToolCalls.set(toolCallId, toolCall);
            }
          });
        },

        setToolCallResult: (toolCallId: string, result: string, isError: boolean) => {
          set((state) => {
            const toolCall = state.activeToolCalls.get(toolCallId);
            if (toolCall) {
              toolCall.result = result;
              toolCall.status = isError ? ToolExecutionStatus.ERROR : ToolExecutionStatus.SUCCESS;
              if (isError) toolCall.error = result;
              state.activeToolCalls.set(toolCallId, toolCall);
            }
          });
        },

        endStreaming: (message: AgentMessage) => {
          set((state) => {
            // Update the message with final content
            const messageIndex = state.messages.findIndex(
              (m: AgentMessage) => m.id === state.streaming.currentMessageId
            );
            if (messageIndex !== -1) {
              state.messages[messageIndex] = {
                ...message,
                tool_calls: Array.from(state.activeToolCalls.values()).map((tc) => {
                  const toolExec = tc as ToolExecution;
                  return {
                    id: toolExec.call_id || toolExec.id,
                    name: toolExec.tool_name,
                    arguments: toolExec.arguments,
                    status: toolExec.status,
                    result: toolExec.result,
                    error: toolExec.error,
                  };
                }),
              };
            }
            // Reset streaming state
            state.streaming = initialStreamingState;
            state.activeToolCalls.clear();
          });
        },

        setStreamingError: (error: string) => {
          set((state) => {
            state.streaming.error = error;
            state.streaming.isStreaming = false;
            // Update message status
            const messageIndex = state.messages.findIndex(
              (m: AgentMessage) => m.id === state.streaming.currentMessageId
            );
            if (messageIndex !== -1) {
              state.messages[messageIndex].status = MessageStatus.ERROR;
            }
          });
        },

        cancelStreaming: () => {
          set((state) => {
            state.streaming = initialStreamingState;
            state.activeToolCalls.clear();
            // Remove incomplete message
            state.messages = state.messages.filter(
              (m: AgentMessage) => m.status !== MessageStatus.STREAMING
            );
          });
        },

        // ============ Test Console Actions ============

        startTestSession: async (agentId: string) => {
          const session = await aiAgentsApiClient.test.createSession(agentId);
          set((state) => {
            state.testSessionId = session.id;
            state.selectedConversationId = session.conversation_id;
            state.messages = [];
            state.isTestMode = true;
          });
        },

        runTest: async (message: string, context?: Record<string, unknown>) => {
          const { testSessionId } = get();
          if (!testSessionId) throw new Error("No test session");

          await get().sendMessage(message, { stream: true });
        },

        clearTestSession: async () => {
          const { testSessionId } = get();
          if (testSessionId) {
            await aiAgentsApiClient.test.clearSession(testSessionId);
          }
          set((state) => {
            state.testSessionId = null;
            state.isTestMode = false;
            state.messages = [];
          });
        },

        setTestMode: (enabled: boolean) => {
          set((state) => {
            state.isTestMode = enabled;
          });
        },

        // ============ UI Actions ============

        setShowAgentBuilder: (show: boolean) => {
          set((state) => {
            state.showAgentBuilder = show;
            if (!show) state.builderStep = 0;
          });
        },

        setShowToolEditor: (show: boolean) => {
          set((state) => {
            state.showToolEditor = show;
          });
        },

        setShowProviderConfig: (show: boolean) => {
          set((state) => {
            state.showProviderConfig = show;
          });
        },

        setShowKnowledgeBaseManager: (show: boolean) => {
          set((state) => {
            state.showKnowledgeBaseManager = show;
          });
        },

        setShowTestConsole: (show: boolean) => {
          set((state) => {
            state.showTestConsole = show;
          });
        },

        setBuilderStep: (step: number) => {
          set((state) => {
            state.builderStep = step;
          });
        },

        // ============ Reset Actions ============

        reset: () => {
          set(() => ({ ...initialState }));
        },

        resetConversation: () => {
          set((state) => {
            state.selectedConversationId = null;
            state.messages = [];
            state.hasMoreMessages = true;
            state.streaming = initialStreamingState;
            state.activeToolCalls.clear();
          });
        },

        resetStreaming: () => {
          set((state) => {
            state.streaming = initialStreamingState;
            state.activeToolCalls.clear();
          });
        },
      })),
      {
        name: "flowcube-ai-agent-store",
        partialize: (state) => ({
          selectedAgentId: state.selectedAgentId,
          selectedProviderId: state.selectedProviderId,
          agentFilters: state.agentFilters,
        }),
      }
    ),
    { name: "AIAgentStore" }
  )
);

export default useAIAgentStore;
