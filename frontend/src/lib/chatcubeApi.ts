import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  WhatsAppInstance,
  WhatsAppMessage,
  WhatsAppContact,
  WhatsAppGroup,
  InstanceStats,
  ChatCubeStats,
  CreateInstanceRequest,
} from '@/types/chatcube.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
};

const chatcubeClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL.replace(/\/api\/v1\/?$/, '/api/v1/chatcube'),
  headers: {
    'Content-Type': 'application/json',
  },
});

chatcubeClient.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

chatcubeClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const chatcubeApi = {
  // ---- Instances ----

  listInstances: async (): Promise<{ results: WhatsAppInstance[] }> => {
    const response = await chatcubeClient.get('/instances/');
    return response.data;
  },

  getInstance: async (instanceId: string): Promise<WhatsAppInstance> => {
    const response = await chatcubeClient.get(`/instances/${instanceId}/`);
    return response.data;
  },

  createInstance: async (data: CreateInstanceRequest): Promise<WhatsAppInstance> => {
    const response = await chatcubeClient.post('/instances/', data);
    return response.data;
  },

  deleteInstance: async (instanceId: string): Promise<void> => {
    await chatcubeClient.delete(`/instances/${instanceId}/`);
  },

  // ---- Connection ----

  getQRCode: async (instanceId: string): Promise<Record<string, any>> => {
    const response = await chatcubeClient.get(`/instances/${instanceId}/qr-code/`);
    return response.data;
  },

  getPairingCode: async (instanceId: string, phoneNumber: string): Promise<Record<string, any>> => {
    const response = await chatcubeClient.post(`/instances/${instanceId}/pairing-code/`, {
      phone_number: phoneNumber,
    });
    return response.data;
  },

  disconnect: async (instanceId: string): Promise<void> => {
    await chatcubeClient.post(`/instances/${instanceId}/disconnect/`);
  },

  reconnect: async (instanceId: string): Promise<void> => {
    await chatcubeClient.post(`/instances/${instanceId}/reconnect/`);
  },

  getStatus: async (instanceId: string): Promise<Record<string, any>> => {
    const response = await chatcubeClient.get(`/instances/${instanceId}/status/`);
    return response.data;
  },

  // ---- Messages ----

  sendMessage: async (
    instanceId: string,
    data: { to: string; content: string; message_type?: string }
  ): Promise<WhatsAppMessage> => {
    const response = await chatcubeClient.post(`/instances/${instanceId}/send-message/`, data);
    return response.data;
  },

  getMessages: async (
    instanceId: string,
    params?: { page?: number; limit?: number; remote_jid?: string }
  ): Promise<{ results: WhatsAppMessage[]; count: number }> => {
    const response = await chatcubeClient.get(`/instances/${instanceId}/messages/`, { params });
    return response.data;
  },

  // ---- Contacts & Groups ----

  getContacts: async (
    instanceId: string,
    params?: { page?: number; limit?: number; sync?: boolean }
  ): Promise<{ results: WhatsAppContact[]; count: number }> => {
    const response = await chatcubeClient.get(`/instances/${instanceId}/contacts/`, { params });
    return response.data;
  },

  getGroups: async (
    instanceId: string,
    params?: { page?: number; limit?: number; sync?: boolean }
  ): Promise<{ results: WhatsAppGroup[]; count: number }> => {
    const response = await chatcubeClient.get(`/instances/${instanceId}/groups/`, { params });
    return response.data;
  },

  // ---- Stats ----

  getStats: async (): Promise<ChatCubeStats> => {
    const response = await chatcubeClient.get('/stats/');
    return response.data;
  },

  getInstanceStats: async (instanceId: string): Promise<InstanceStats> => {
    const response = await chatcubeClient.get(`/instances/${instanceId}/stats/`);
    return response.data;
  },
};

export default chatcubeApi;
