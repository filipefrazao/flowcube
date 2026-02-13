import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
};

const rp = axios.create({ baseURL: API_BASE_URL + "/reports" });

rp.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

rp.interceptors.response.use(
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
export interface ReportParameter {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "select";
  default?: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  chart_type: "bar" | "line" | "pie" | "table" | "area";
  query_template: string;
  parameters: ReportParameter[];
  created_at: string;
  updated_at: string;
}

export interface ReportResult {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
  executed_at: string;
  execution_id?: string;
}

// API
export const reportsApi = {
  list: async (): Promise<{ results: ReportDefinition[] }> => {
    const r = await rp.get("/definitions/");
    return r.data;
  },
  get: async (slug: string): Promise<ReportDefinition> => {
    const r = await rp.get(`/definitions/${slug}/`);
    return r.data;
  },
  execute: async (slug: string, params?: Record<string, any>): Promise<ReportResult> => {
    const r = await rp.post(`/execute/${slug}/`, params || {});
    return r.data;
  },
  exportCsv: async (executionId: string): Promise<Blob> => {
    const r = await rp.get(`/export/${executionId}/`, { params: { format: "csv" }, responseType: "blob" });
    return r.data;
  },
  exportXlsx: async (executionId: string): Promise<Blob> => {
    const r = await rp.get(`/export/${executionId}/`, { params: { format: "xlsx" }, responseType: "blob" });
    return r.data;
  },
};

export default reportsApi;
