import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Workflow } from '@/types/workflow.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ============================================================================
// API Client Setup
// ============================================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Types
// ============================================================================

// Export Workflow from types
export type { Workflow };

// Chat Types
export interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

export interface ChatStats {
  total_sessions: number;
  total_messages: number;
  avg_messages_per_session: number;
  active_sessions_today: number;
}

// Execution Types
export interface ExecutionStats {  total_executions: number;  successful_executions: number;  failed_executions: number;  avg_execution_time_ms: number;  executions_last_24h: number;  daily_counts?: Array<{ date: string; count: number }>;}

export interface Execution {
  id: number;
  workflow_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
}

// Credential Types
export interface Credential {
  id: number;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CredentialCreateRequest {
  name: string;
  type: string;
  credentials: Record<string, any>;
}

// ============================================================================
// Chat API
// ============================================================================

export const chatApi = {
  /**
   * Get all chat sessions
   */
  getSessions: async (): Promise<ChatSession[]> => {
    const response = await apiClient.get('/chat/sessions/');
    return response.data;
  },

  /**
   * Get a specific chat session with messages
   */
  getSession: async (sessionId: number): Promise<ChatSessionDetail> => {
    const response = await apiClient.get(`/chat/sessions/${sessionId}/`);
    return response.data;
  },

  /**
   * Create a new chat session
   */
  createSession: async (title: string): Promise<ChatSession> => {
    const response = await apiClient.post('/chat/sessions/', { title });
    return response.data;
  },

  /**
   * Send a message in a chat session
   */
  sendMessage: async (sessionId: number, content: string): Promise<ChatMessage> => {
    const response = await apiClient.post(`/chat/sessions/${sessionId}/messages/`, {
      content,
    });
    return response.data;
  },

  /**
   * Get chat statistics
   */
  getStats: async (): Promise<ChatStats> => {
    const response = await apiClient.get('/chat/stats/');
    return response.data;
  },

  /**
   * Delete a chat session
   */
  deleteSession: async (sessionId: number): Promise<void> => {
    await apiClient.delete(`/chat/sessions/${sessionId}/`);
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
   * Get all executions
   */
  getExecutions: async (workflowId?: number): Promise<Execution[]> => {
    const params = workflowId ? { workflow_id: workflowId } : {};
    const response = await apiClient.get('/executions/', { params });
    return response.data;
  },

  /**
   * Get a specific execution
   */
  getExecution: async (executionId: number): Promise<Execution> => {
    const response = await apiClient.get(`/executions/${executionId}/`);
    return response.data;
  },
};

// ============================================================================
// Workflow API
// ============================================================================

export const workflowApi = {
  /**
   * Get all workflows
   */
  getWorkflows: async (): Promise<Workflow[]> => {
    const response = await apiClient.get('/workflows/');
    return response.data;
  },

  /**
   * Get a specific workflow
   */
  getWorkflow: async (workflowId: string): Promise<Workflow> => {
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
};

// ============================================================================
// Credential API
// ============================================================================

export const credentialApi = {
  /**
   * Get all credentials
   */
  getCredentials: async (): Promise<Credential[]> => {
    const response = await apiClient.get('/credentials/');
    return response.data;
  },

  /**
   * Get a specific credential
   */
  getCredential: async (credentialId: number): Promise<Credential> => {
    const response = await apiClient.get(`/credentials/${credentialId}/`);
    return response.data;
  },

  /**
   * Create a new credential
   */
  createCredential: async (data: CredentialCreateRequest): Promise<Credential> => {
    const response = await apiClient.post('/credentials/', data);
    return response.data;
  },

  /**
   * Update a credential
   */
  updateCredential: async (
    credentialId: number,
    data: Partial<CredentialCreateRequest>
  ): Promise<Credential> => {
    const response = await apiClient.patch(`/credentials/${credentialId}/`, data);
    return response.data;
  },

  /**
   * Delete a credential
   */
  deleteCredential: async (credentialId: number): Promise<void> => {
    await apiClient.delete(`/credentials/${credentialId}/`);
  },
};

// ============================================================================
// Auth API
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login/', data);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    localStorage.removeItem('authToken');
    await apiClient.post('/auth/logout/');
  },

  /**
   * Get current user
   */
  me: async () => {
    const response = await apiClient.get('/auth/me/');
    return response.data;
  },
};

// ============================================================================
// Settings API
// ============================================================================

export interface UserSettings {
  id: number;
  theme: 'light' | 'dark' | 'auto';
  notifications_enabled: boolean;
  email_notifications: boolean;
  language: string;
}

export const settingsApi = {
  /**
   * Get user settings
   */
  getSettings: async (): Promise<UserSettings> => {
    const response = await apiClient.get('/settings/');
    return response.data;
  },

  /**
   * Update user settings
   */
  updateSettings: async (data: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await apiClient.patch('/settings/', data);
    return response.data;
  },
};

// Export the axios instance for custom requests
export default apiClient;
