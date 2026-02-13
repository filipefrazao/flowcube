import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
};

const ai = axios.create({ baseURL: API_BASE_URL + "/ai" });

ai.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

ai.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Types
export interface AIAgent {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  knowledge_bases_count?: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  description: string;
  agent: number;
  agent_name?: string;
  documents_count?: number;
  chunks_count?: number;
  created_at: string;
}

export interface KnowledgeDocument {
  id: number;
  knowledge_base: number;
  title: string;
  file_name: string;
  file_size: number;
  doc_type: string;
  chunks_count?: number;
  status: "pending" | "processing" | "ready" | "error";
  created_at: string;
}

export interface ChatTestMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTestResponse {
  response: string;
  sources?: { document: string; chunk: string; score: number }[];
}

// API
export const aiApi = {
  // Agents
  listAgents: async (): Promise<{ results: AIAgent[] }> => {
    const r = await ai.get("/agents/");
    return r.data;
  },
  getAgent: async (id: number): Promise<AIAgent> => {
    const r = await ai.get(`/agents/${id}/`);
    return r.data;
  },
  createAgent: async (data: Partial<AIAgent>): Promise<AIAgent> => {
    const r = await ai.post("/agents/", data);
    return r.data;
  },
  updateAgent: async (id: number, data: Partial<AIAgent>): Promise<AIAgent> => {
    const r = await ai.patch(`/agents/${id}/`, data);
    return r.data;
  },
  deleteAgent: async (id: number): Promise<void> => {
    await ai.delete(`/agents/${id}/`);
  },
  testChat: async (id: number, message: string, history?: ChatTestMessage[]): Promise<ChatTestResponse> => {
    const r = await ai.post(`/agents/${id}/chat/`, { message, history });
    return r.data;
  },

  // Knowledge Bases
  listKnowledgeBases: async (agentId?: number): Promise<{ results: KnowledgeBase[] }> => {
    const params = agentId ? { agent: agentId } : {};
    const r = await ai.get("/knowledge-bases/", { params });
    return r.data;
  },
  getKnowledgeBase: async (id: number): Promise<KnowledgeBase> => {
    const r = await ai.get(`/knowledge-bases/${id}/`);
    return r.data;
  },
  createKnowledgeBase: async (data: Partial<KnowledgeBase>): Promise<KnowledgeBase> => {
    const r = await ai.post("/knowledge-bases/", data);
    return r.data;
  },
  deleteKnowledgeBase: async (id: number): Promise<void> => {
    await ai.delete(`/knowledge-bases/${id}/`);
  },

  // Documents
  listDocuments: async (kbId: number): Promise<{ results: KnowledgeDocument[] }> => {
    const r = await ai.get(`/knowledge-bases/${kbId}/documents/`);
    return r.data;
  },
  uploadDocument: async (kbId: number, file: File): Promise<KnowledgeDocument> => {
    const formData = new FormData();
    formData.append("file", file);
    const r = await ai.post(`/knowledge-bases/${kbId}/documents/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },
  deleteDocument: async (kbId: number, docId: number): Promise<void> => {
    await ai.delete(`/knowledge-bases/${kbId}/documents/${docId}/`);
  },
  testQuery: async (kbId: number, query: string): Promise<ChatTestResponse> => {
    const r = await ai.post(`/knowledge-bases/${kbId}/query/`, { query });
    return r.data;
  },
};

export default aiApi;
