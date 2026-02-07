import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Workflow } from '@/types/workflow.types';

// ============================================================================
// User Preferences Type
// ============================================================================

export interface UserPreferences {
  id?: number;
  theme: 'dark' | 'light' | 'system';
  sidebar_collapsed: boolean;
  default_zoom: number;
  show_minimap: boolean;
  show_node_stats: boolean;
  email_notifications: boolean;
  execution_failure_alerts: boolean;
  weekly_digest: boolean;
  auto_save: boolean;
  auto_save_interval_seconds: number;
  snap_to_grid: boolean;
  grid_size: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
// FlowCube-specific endpoints are under /api/flowcube/
const FLOWCUBE_API_URL = API_BASE_URL.replace(/\/api\/v1$/, "/api/flowcube");

// ============================================================================
// CORREÇÃO 1: Safe localStorage helper (SSR-safe)
// ============================================================================

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};

// ============================================================================
// API Client Setup
// ============================================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// CORREÇÃO 2: Request interceptor com safeLocalStorage
apiClient.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// CORREÇÃO 2: Response interceptor corrigido
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      safeLocalStorage.removeItem('authToken');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// FlowCube API Client (for /api/flowcube/* endpoints)
// ============================================================================

const flowcubeClient: AxiosInstance = axios.create({
  baseURL: FLOWCUBE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Same interceptors for flowcubeClient
flowcubeClient.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

flowcubeClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      safeLocalStorage.removeItem("authToken");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// CORREÇÃO 4: TypeScript Types (tipos que estavam faltando)
// ============================================================================

export interface Execution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  triggered_by: string;
  error_message?: string;
}

export interface ExecutionDetail extends Execution {
  logs: NodeExecutionLog[];
  input_data?: any;
  output_data?: any;
}

export interface NodeExecutionLog {
  id: string;
  node_id: string;
  node_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  input_data?: any;
  output_data?: any;
  error_message?: string;
}

export interface Credential {
  id: string;
  name: string;
  credential_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExecutionStats {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  avg_execution_time_ms: number;
  executions_last_24h: number;
  daily_counts?: Array<{ date: string; count: number }>;
  by_status?: {
    completed: number;
    failed: number;
    pending: number;
    running: number;
  };
  last_30_days?: number;
  avg_duration_ms?: number;
  success_rate?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}


// ============================================================================
// Chat Types (for /conversations page - backed by ChatCube data)
// ============================================================================

export interface ChatSession {
  id: string;
  contact_name: string;
  contact_phone: string;
  status: string;
  message_count: number;
  last_message_at: string | null;
  instance_id?: string;
  instance_name?: string;
}

export interface ChatMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  message_type?: string;
  content: string;
  media_url?: string | null;
  is_ai_generated: boolean;
  ai_model: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  whatsapp_status?: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
  assigned_to: any | null;
}

export interface ChatStats {
  total: number;
  by_status: {
    active: number;
    waiting: number;
    handoff: number;
    completed: number;
  };
  total_messages?: number;
  unread_messages?: number;
}

// ============================================================================
// Chat API (backed by ChatCube conversations - WhatsApp messages)
// ============================================================================

export const chatApi = {
  /**
   * List all conversations (WhatsApp chats grouped by contact)
   */
  getSessions: async (params?: { status?: string; search?: string }): Promise<ChatSession[]> => {
    const response = await apiClient.get('/chatcube/conversations/', { params });
    return response.data;
  },

  /**
   * Alias for getSessions
   */
  listSessions: async (params?: { status?: string; search?: string }): Promise<ChatSession[]> => {
    return chatApi.getSessions(params);
  },

  /**
   * Get a specific conversation with messages
   */
  getSession: async (sessionId: string | number): Promise<ChatSessionDetail> => {
    const response = await apiClient.get(`/chatcube/conversations/${sessionId}/`);
    return response.data;
  },

  /**
   * Send a message in a conversation
   */
  sendMessage: async (sessionId: string | number, content: string): Promise<ChatMessage> => {
    const response = await apiClient.post(`/chatcube/conversations/${sessionId}/messages/`, {
      content,
    });
    return response.data;
  },

  /**
   * Get conversation statistics
   */
  getStats: async (): Promise<ChatStats> => {
    const response = await apiClient.get('/chatcube/conversations/stats/');
    return response.data;
  },

  /**
   * Delete/close a conversation (not implemented yet)
   */
  deleteSession: async (sessionId: string | number): Promise<void> => {
    // TODO: implement conversation close/archive
  },

  /**
   * Create a new conversation (not applicable for WhatsApp - conversations are created when messages arrive)
   */
  createSession: async (title?: string) => {
    return null;
  },
};

// ============================================================================
// Execution API
// ============================================================================

export const executionApi = {
  /**
   * Get execution statistics
   */
  getStats: async (): Promise<ExecutionStats> => {
    const response = await apiClient.get('/executions/stats/');
    return response.data;
  },

  /**
   * List all workflow executions
   */
  list: async (params?: any): Promise<{ results: Execution[] }> => {
    const response = await apiClient.get('/executions/', { params });
    return response.data;
  },

  /**
   * Get execution details
   */
  get: async (executionId: string): Promise<ExecutionDetail> => {
    const response = await apiClient.get(`/executions/${executionId}/`);
    return response.data;
  },

  /**
   * Retry a failed execution
   */
  retry: async (executionId: string): Promise<Execution> => {
    const response = await apiClient.post(`/executions/${executionId}/retry/`);
    return response.data;
  },

  // CORREÇÃO 5: Aliases para compatibilidade com código existente
  listExecutions: async (params?: any) => executionApi.list(params),
  getExecutionDetail: async (id: string) => executionApi.get(id),
};

// ============================================================================
// Workflow API
// ============================================================================

export const workflowApi = {
  /**
   * List all workflows
   */
  list: async (): Promise<Workflow[]> => {
    const response = await apiClient.get('/workflows/');
    // API returns paginated response {count, results}, extract the array
    return response.data.results || response.data || [];
  },

  /**
   * Get a specific workflow
   */
  get: async (workflowId: string): Promise<Workflow> => {
    const response = await apiClient.get(`/workflows/${workflowId}/`);
    return response.data;
  },

  /**
   * Create a new workflow
   */
  createWorkflow: async (data: Partial<Workflow>): Promise<Workflow> => {
    const response = await apiClient.post('/workflows/', data);
    return response.data;
  },

  /**
   * Update a workflow
   */
  updateWorkflow: async (workflowId: string, data: Partial<Workflow>): Promise<Workflow> => {
    const response = await apiClient.patch(`/workflows/${workflowId}/`, data);
    return response.data;
  },

  /**
   * Delete a workflow
   */
  deleteWorkflow: async (workflowId: string): Promise<void> => {
    await apiClient.delete(`/workflows/${workflowId}/`);
  },

  /**
   * Delete a workflow (alias)
   */
  delete: async (workflowId: string): Promise<void> => {
    await apiClient.delete(`/workflows/${workflowId}/`);
  },

  /**
   * Duplicate a workflow
   */
  duplicate: async (workflowId: string): Promise<Workflow> => {
    const response = await apiClient.post(`/workflows/${workflowId}/duplicate/`);
    return response.data;
  },

  /**
   * Publish a workflow
   */
  publish: async (workflowId: string): Promise<Workflow> => {
    const response = await apiClient.post(`/workflows/${workflowId}/publish/`);
    return response.data;
  },

  /**
   * Execute a workflow
   */
  execute: async (workflowId: string, inputData?: any): Promise<any> => {
    const response = await apiClient.post(`/workflows/${workflowId}/execute/`, {
      input_data: inputData,
    });
    return response.data;
  },
};

// ============================================================================
// Credential API
// ============================================================================

export const credentialApi = {
  /**
   * List all credentials
   */
  list: async (): Promise<{ results: Credential[] }> => {
    const response = await flowcubeClient.get('/credentials/');
    return response.data;
  },

  /**
   * Get a specific credential
   */
  get: async (credentialId: string): Promise<Credential> => {
    const response = await flowcubeClient.get(`/credentials/${credentialId}/`);
    return response.data;
  },

  /**
   * Create a new credential
   */
  create: async (data: Partial<Credential>): Promise<Credential> => {
    const response = await flowcubeClient.post('/credentials/', data);
    return response.data;
  },

  /**
   * Update a credential
   */
  update: async (credentialId: string, data: Partial<Credential>): Promise<Credential> => {
    const response = await flowcubeClient.patch(`/credentials/${credentialId}/`, data);
    return response.data;
  },

  /**
   * Delete a credential
   */
  delete: async (credentialId: string): Promise<void> => {
    await flowcubeClient.delete(`/credentials/${credentialId}/`);
  },

  /**
   * Test a credential connection
   */
  test: async (credentialId: string): Promise<{ success: boolean; message: string }> => {
    const response = await flowcubeClient.post(`/credentials/${credentialId}/test/`);
    return response.data;
  },

  // CORREÇÃO 5: Aliases para compatibilidade
  listCredentials: async () => credentialApi.list(),
  testCredential: async (id: string) => credentialApi.test(id),
};

// ============================================================================
// Auth API - CORREÇÃO 7: Login com form-urlencoded para senhas com caracteres especiais
// ============================================================================

export const authApi = {
  /**
   * Login with username and password
   * Note: Uses form-urlencoded to handle passwords with special characters (@, !, etc.)
   * This prevents JSON parsing errors when passwords contain characters like @ or !
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    // Use form-urlencoded for compatibility with special characters in passwords
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    
    const response = await apiClient.post('/auth/token/', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (response.data.token) {
      safeLocalStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  /**
   * Logout (remove token do localStorage)
   */
  logout: async (): Promise<void> => {
    safeLocalStorage.removeItem('authToken');
    // CORREÇÃO 6: Comentado endpoint /auth/logout/ que não existe no backend
    // await apiClient.post('/auth/logout/');
  },

  /**
   * Get current user info
   */
  me: async () => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },
};

// ============================================================================
// Settings API
// ============================================================================

export const settingsApi = {
  /**
   * Get user settings
   */
  get: async () => {
    const response = await flowcubeClient.get('/preferences/me/');
    return response.data;
  },

  /**
   * Update user settings
   */
  update: async (data: any) => {
    const response = await flowcubeClient.patch('/preferences/me/', data);
    return response.data;
  },
};

export default apiClient;
