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
  param_type: "text" | "date" | "number" | "select";
  required: boolean;
  default_value?: string;
  choices?: string[];
}

export interface ReportDefinition {
  id: number;
  name: string;
  slug: string;
  description: string;
  chart_type: "bar" | "line" | "pie" | "table" | "area";
  category: string;
  sql_query?: string;
  parameters: ReportParameter[];
  is_active: boolean;
  created_at: string;
}

export interface ReportResult {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
  executed_at: string;
}

// API
export const reportsApi = {
  list: async (): Promise<{ results: ReportDefinition[] }> => {
    const r = await rp.get("/");
    return r.data;
  },
  get: async (slug: string): Promise<ReportDefinition> => {
    const r = await rp.get(`/${slug}/`);
    return r.data;
  },
  execute: async (slug: string, params?: Record<string, any>): Promise<ReportResult> => {
    const r = await rp.post(`/${slug}/execute/`, params || {});
    return r.data;
  },
  exportCsv: async (slug: string, params?: Record<string, any>): Promise<Blob> => {
    const r = await rp.post(`/${slug}/export/`, { ...params, format: "csv" }, { responseType: "blob" });
    return r.data;
  },
  exportXlsx: async (slug: string, params?: Record<string, any>): Promise<Blob> => {
    const r = await rp.post(`/${slug}/export/`, { ...params, format: "xlsx" }, { responseType: "blob" });
    return r.data;
  },
};

export default reportsApi;
