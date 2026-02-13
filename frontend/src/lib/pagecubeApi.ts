import apiClient from "./api";

// ============================================================================
// Types
// ============================================================================

export interface Page {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  template?: number | null;
  content: any;
  puck_data?: any;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  favicon_url?: string;
  custom_scripts?: string;
  custom_domain?: string;
  views_count?: number;
  submissions_count?: number;
  forms?: any[];
  domain?: any;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PageTemplate {
  id: number;
  name: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  content: any;
  created_at: string;
}

export interface FormSchema {
  id: number;
  name: string;
  page: number;
  schema: any;
  ui_schema?: any;
  conditional_logic?: any[];
  success_message?: string;
  redirect_url?: string;
  distribution_mode?: string;
  distribution_config?: any;
  submissions_count?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: number;
  page: number;
  page_title?: string;
  data: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CustomDomain {
  id: number;
  page: number;
  domain: string;
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
}

// ============================================================================
// API
// ============================================================================

export const pagecubeApi = {
  // Pages
  listPages: async (): Promise<Page[]> => {
    const response = await apiClient.get("/pagecube/pages/");
    return response.data.results || response.data || [];
  },

  getPage: async (id: number): Promise<Page> => {
    const response = await apiClient.get(`/pagecube/pages/${id}/`);
    return response.data;
  },

  createPage: async (data: Partial<Page>): Promise<Page> => {
    const response = await apiClient.post("/pagecube/pages/", data);
    return response.data;
  },

  updatePage: async (id: number, data: Partial<Page>): Promise<Page> => {
    const response = await apiClient.patch(`/pagecube/pages/${id}/`, data);
    return response.data;
  },

  deletePage: async (id: number): Promise<void> => {
    await apiClient.delete(`/pagecube/pages/${id}/`);
  },

  // Templates
  listTemplates: async (): Promise<PageTemplate[]> => {
    const response = await apiClient.get("/pagecube/templates/");
    return response.data.results || response.data || [];
  },

  // Forms
  listForms: async (): Promise<FormSchema[]> => {
    const response = await apiClient.get("/pagecube/forms/");
    return response.data.results || response.data || [];
  },

  getForm: async (id: number): Promise<FormSchema> => {
    const response = await apiClient.get(`/pagecube/forms/${id}/`);
    return response.data;
  },

  createForm: async (data: Partial<FormSchema>): Promise<FormSchema> => {
    const response = await apiClient.post("/pagecube/forms/", data);
    return response.data;
  },

  updateForm: async (id: number, data: Partial<FormSchema>): Promise<FormSchema> => {
    const response = await apiClient.patch(`/pagecube/forms/${id}/`, data);
    return response.data;
  },

  deleteForm: async (id: number): Promise<void> => {
    await apiClient.delete(`/pagecube/forms/${id}/`);
  },

  // Submissions
  listSubmissions: async (params?: { page?: number }): Promise<FormSubmission[]> => {
    const response = await apiClient.get("/pagecube/submissions/", { params });
    return response.data.results || response.data || [];
  },

  // Custom Domains
  listDomains: async (): Promise<CustomDomain[]> => {
    const response = await apiClient.get("/pagecube/domains/");
    return response.data.results || response.data || [];
  },

  createDomain: async (data: Partial<CustomDomain>): Promise<CustomDomain> => {
    const response = await apiClient.post("/pagecube/domains/", data);
    return response.data;
  },

  deleteDomain: async (id: number): Promise<void> => {
    await apiClient.delete(`/pagecube/domains/${id}/`);
  },
};
