import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window \!== "undefined") {
    const token = localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window \!== "undefined") {
        localStorage.removeItem("authToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Types
// ============================================================================

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_at: string;
  stages?: PipelineStage[];
}

export interface PipelineStage {
  id: string;
  pipeline: string;
  name: string;
  order: number;
  color: string;
  probability: number;
  leads_count?: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: string;
  stage_name?: string;
  pipeline?: string;
  assigned_to: string | null;
  assigned_to_name?: string;
  score: number;
  source: string;
  notes: string;
  value: string;
  created_at: string;
  updated_at?: string;
}

export interface SalesTask {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  lead: string | null;
  lead_name?: string;
  assigned_to: string | null;
  assigned_to_name?: string;
  status: string;
  priority: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  sku: string;
  category: string | null;
  category_name?: string;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  type: string;
  children?: Category[];
}

export interface Sale {
  id: string;
  lead: string | null;
  lead_name?: string;
  products?: Array<{ product: string; product_name: string; quantity: number; unit_price: string }>;
  total_value: string;
  stage: string;
  notes: string;
  closed_at: string | null;
  created_at: string;
}

export interface FinancialOverview {
  total_revenue: number;
  total_expenses: number;
  net: number;
  monthly_breakdown: Array<{ month: string; revenue: number; expenses: number }>;
}

// ============================================================================
// Pipeline API
// ============================================================================

export const pipelineApi = {
  list: () => apiClient.get("/salescube/pipelines/"),
  get: (id: string) => apiClient.get(`/salescube/pipelines/${id}/`),
  create: (data: Partial<Pipeline>) => apiClient.post("/salescube/pipelines/", data),
  update: (id: string, data: Partial<Pipeline>) => apiClient.patch(`/salescube/pipelines/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/pipelines/${id}/`),
};

// ============================================================================
// Stage API
// ============================================================================

export const stageApi = {
  list: (pipelineId?: string) => {
    const params = pipelineId ? { pipeline: pipelineId } : {};
    return apiClient.get("/salescube/stages/", { params });
  },
  get: (id: string) => apiClient.get(`/salescube/stages/${id}/`),
  create: (data: Partial<PipelineStage>) => apiClient.post("/salescube/stages/", data),
  update: (id: string, data: Partial<PipelineStage>) => apiClient.patch(`/salescube/stages/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/stages/${id}/`),
};

// ============================================================================
// Lead API
// ============================================================================

export const leadApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/leads/", { params }),
  get: (id: string) => apiClient.get(`/salescube/leads/${id}/`),
  create: (data: Partial<Lead>) => apiClient.post("/salescube/leads/", data),
  update: (id: string, data: Partial<Lead>) => apiClient.patch(`/salescube/leads/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/leads/${id}/`),
  move: (id: string, stageId: string) => apiClient.post(`/salescube/leads/${id}/move/`, { stage: stageId }),
};

// ============================================================================
// Task API
// ============================================================================

export const taskApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/tasks/", { params }),
  get: (id: string) => apiClient.get(`/salescube/tasks/${id}/`),
  create: (data: Partial<SalesTask>) => apiClient.post("/salescube/tasks/", data),
  update: (id: string, data: Partial<SalesTask>) => apiClient.patch(`/salescube/tasks/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/tasks/${id}/`),
};

// ============================================================================
// Product API
// ============================================================================

export const productApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/products/", { params }),
  get: (id: string) => apiClient.get(`/salescube/products/${id}/`),
  create: (data: Partial<Product>) => apiClient.post("/salescube/products/", data),
  update: (id: string, data: Partial<Product>) => apiClient.patch(`/salescube/products/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/products/${id}/`),
};

// ============================================================================
// Category API
// ============================================================================

export const categoryApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/categories/", { params }),
  get: (id: string) => apiClient.get(`/salescube/categories/${id}/`),
  create: (data: Partial<Category>) => apiClient.post("/salescube/categories/", data),
  update: (id: string, data: Partial<Category>) => apiClient.patch(`/salescube/categories/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/categories/${id}/`),
};

// ============================================================================
// Sale API
// ============================================================================

export const saleApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/sales/", { params }),
  get: (id: string) => apiClient.get(`/salescube/sales/${id}/`),
  create: (data: Partial<Sale>) => apiClient.post("/salescube/sales/", data),
  update: (id: string, data: Partial<Sale>) => apiClient.patch(`/salescube/sales/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/sales/${id}/`),
};

// ============================================================================
// Financial API
// ============================================================================

export const financialApi = {
  overview: (params?: Record<string, string>) => apiClient.get("/salescube/financial-overview/", { params }),
};
