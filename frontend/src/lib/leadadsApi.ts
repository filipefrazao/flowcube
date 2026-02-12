import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
};

const la = axios.create({ baseURL: API_BASE_URL + "/socialcube/leadads" });

la.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

la.interceptors.response.use(
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
export interface LeadAdsAppConfig {
  id?: number;
  app_id: string;
  app_secret?: string;
  has_secret: boolean;
  verify_token: string;
  webhook_url: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadAdsConnection {
  id: number;
  social_account: number;
  social_account_username: string;
  social_account_platform: string;
  page_id: string;
  page_name: string;
  is_subscribed: boolean;
  webhook_verified_at?: string;
  forms_count: number;
  created_at: string;
  updated_at: string;
}

export interface LeadAdsForm {
  id: number;
  connection: number;
  connection_page_name: string;
  form_id: string;
  form_name: string;
  form_status: string;
  distribution_mode: string;
  distribution_config: Record<string, any>;
  leads_count: number;
  last_lead_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadEntry {
  id: number;
  form: number;
  form_name: string;
  form_id_str: string;
  leadgen_id: string;
  data: Record<string, any>;
  name: string;
  email: string;
  phone: string;
  distributed: boolean;
  distributed_at?: string;
  distribution_result?: Record<string, any>;
  created_at: string;
}

export interface LeadEntryList {
  id: number;
  form: number;
  form_name: string;
  leadgen_id: string;
  name: string;
  email: string;
  phone: string;
  distributed: boolean;
  created_at: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  account_id: number;
  account_username: string;
  already_connected: boolean;
}

// Config
export const getConfig = () => la.get<LeadAdsAppConfig>("/config/");
export const saveConfig = (data: Partial<LeadAdsAppConfig>) => la.post<LeadAdsAppConfig>("/config/", data);

// Connections
export const getConnections = () => la.get<LeadAdsConnection[]>("/connections/");
export const createConnection = (social_account_id: number, page_id: string) =>
  la.post<LeadAdsConnection>("/connections/", { social_account_id, page_id });
export const deleteConnection = (id: number) => la.delete(`/connections/${id}/`);
export const getConnectionForms = (id: number) => la.get<LeadAdsForm[]>(`/connections/${id}/forms/`);
export const syncForms = (id: number) => la.post<{ synced: number; new: number }>(`/connections/${id}/sync_forms/`);

// Forms
export const updateForm = (id: number, data: Partial<LeadAdsForm>) => la.patch<LeadAdsForm>(`/forms/${id}/`, data);

// Leads
export const getLeads = (params?: Record<string, string>) =>
  la.get<{ results: LeadEntryList[]; count: number }>("/leads/", { params });
export const getLead = (id: number) => la.get<LeadEntry>(`/leads/${id}/`);
export const redistributeLead = (id: number) => la.post(`/leads/${id}/redistribute/`);

// Pages (available for connection)
export const getAvailablePages = () => la.get<FacebookPage[]>("/pages/");

// All forms (across all connections)
export const getAllForms = () => la.get<{ results: LeadAdsForm[]; count: number }>("/forms/");

export default la;
