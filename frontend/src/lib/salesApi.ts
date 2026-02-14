import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
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
  total_value?: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: string;
  stage_name?: string;
  stage_color?: string;
  pipeline?: string;
  assigned_to: string | null;
  assigned_to_name?: string;
  score: number;
  source: string;
  notes: string;
  value: string;
  lost_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface LeadDetail extends Lead {
  lead_notes: LeadNote[];
  activities: LeadActivityItem[];
  tasks: SalesTask[];
  sales: Sale[];
}

export interface LeadNote {
  id: string;
  lead: string;
  user: string | null;
  user_name: string | null;
  content: string;
  note_type: "note" | "call" | "email" | "meeting" | "task";
  created_at: string;
}

export interface LeadActivityItem {
  id: string;
  lead: string;
  user: string | null;
  user_name: string | null;
  action: string;
  old_value: string;
  new_value: string;
  created_at: string;
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
  updated_at?: string;
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

export interface SaleLineItem {
  id: string;
  sale: string;
  product: string | null;
  product_name?: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface Sale {
  id: string;
  lead: string | null;
  lead_name?: string;
  products?: string[];
  line_items?: SaleLineItem[];
  total_value: string;
  stage: string;
  notes: string;
  closed_at: string | null;
  created_at: string;
}

export interface LeadStats {
  total_leads: number;
  total_sales: number;
  total_revenue: number;
  conversion_rate: number;
  avg_deal_size: number;
  leads_per_stage: Array<{ name: string; color: string; count: number; total_value: number; pipeline: string; pipeline_id: string }>;
  leads_per_day: Array<{ date: string; count: number }>;
  top_assignees: Array<{ name: string; count: number; total_value: number }>;
  leads_per_source: Array<{ source: string; count: number }>;
  pipeline_summary: Array<{ name: string; pipeline_id: string; count: number; total_value: number }>;
  sales_pipeline: Array<{ stage: string; count: number; total: number }>;
}

export interface FinancialOverview {
  year: number;
  total_revenue: number;
  total_expenses: number;
  total_refunds: number;
  net: number;
  monthly_breakdown: Record<string, { revenue: number; expense: number; refund: number }>;
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
  get: (id: string) => apiClient.get<LeadDetail>(`/salescube/leads/${id}/`),
  create: (data: Partial<Lead>) => apiClient.post("/salescube/leads/", data),
  update: (id: string, data: Partial<Lead>) => apiClient.patch(`/salescube/leads/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/leads/${id}/`),
  move: (id: string, stageId: string) => apiClient.post(`/salescube/leads/${id}/move/`, { stage_id: stageId }),
  bulkMove: (leadIds: string[], stageId: string) => apiClient.post("/salescube/leads/bulk-move/", { lead_ids: leadIds, stage_id: stageId }),
  bulkAssign: (leadIds: string[], userId: string | null) => apiClient.post("/salescube/leads/bulk-assign/", { lead_ids: leadIds, user_id: userId }),
  bulkDelete: (leadIds: string[]) => apiClient.post("/salescube/leads/bulk-delete/", { lead_ids: leadIds }),
  getNotes: (id: string) => apiClient.get<LeadNote[]>(`/salescube/leads/${id}/notes/`),
  addNote: (id: string, data: { content: string; note_type: string }) => apiClient.post(`/salescube/leads/${id}/notes/`, data),
  getActivities: (id: string) => apiClient.get<LeadActivityItem[]>(`/salescube/leads/${id}/activities/`),
  getStats: (params?: Record<string, string>) => apiClient.get<LeadStats>("/salescube/leads/stats/", { params }),
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
  addLineItem: (saleId: string, data: Partial<SaleLineItem>) => apiClient.post(`/salescube/sales/${saleId}/line-items/`, data),
  getLineItems: (saleId: string) => apiClient.get<SaleLineItem[]>(`/salescube/sales/${saleId}/line-items-list/`),
};

// ============================================================================
// Financial API
// ============================================================================

export const financialApi = {
  overview: (params?: Record<string, string>) => apiClient.get<FinancialOverview>("/salescube/financial-overview/", { params }),
};

// ============================================================================
// Kanban Types
// ============================================================================

export interface KanbanLeadCard {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  score: number;
  source: string;
  value: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
}

export interface KanbanColumn {
  stage_id: string;
  stage_name: string;
  color: string;
  order: number;
  probability: number;
  count: number;
  total_value: string;
  total_pages: number;
  current_page: number;
  leads: KanbanLeadCard[];
}

export interface KanbanBoard {
  pipeline_id: string;
  pipeline_name: string;
  columns: KanbanColumn[];
}

export interface SaleKPIs {
  summary: {
    total_sales: number;
    total_amount: number;
    average_ticket: number;
    conversion_rate: number;
    loss_rate: number;
  };
  by_stage: Record<string, {
    label: string;
    count: number;
    total_amount: number;
    average_ticket: number;
    percentage: number;
    amount_percentage: number;
  }>;
  top_products: Array<{ name: string; quantity: number; revenue: number }>;
  top_sellers: Array<{ name: string; count: number; total_amount: number }>;
}

// ============================================================================
// Kanban API
// ============================================================================

export const kanbanApi = {
  getBoard: (pipelineId: string, params?: Record<string, string>) =>
    apiClient.get<KanbanBoard>(`/salescube/pipelines/${pipelineId}/kanban/`, { params }),
};

// ============================================================================
// Sales KPI API
// ============================================================================

export const saleKpiApi = {
  getKpis: (params?: Record<string, string>) =>
    apiClient.get<SaleKPIs>("/salescube/sales/kpis/", { params }),
};

// ============================================================================
// Sprint 2 Types
// ============================================================================

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  cpf: string;
  address: string;
  city: string;
  state: string;
  source: string;
  notes: string;
  lead: string | null;
  lead_name?: string;
  tags: string[];
  tag_names?: Array<{ id: string; name: string; color: string }>;
  owner: string | null;
  owner_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  number: string;
  lead: string | null;
  lead_name?: string;
  contact: string | null;
  contact_name?: string;
  sale: string | null;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes: string;
  payment_method: string;
  created_by: string | null;
  created_by_name?: string;
  paid_at: string | null;
  items?: InvoiceItemType[];
  created_at: string;
}

export interface InvoiceItemType {
  id: string;
  invoice: string;
  product: string | null;
  product_name?: string;
  description: string;
  quantity: string;
  unit_price: string;
  subtotal: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  lead: string | null;
  lead_name?: string;
  contact: string | null;
  contact_name?: string;
  status: string;
  priority: string;
  category: string;
  assigned_to: string | null;
  assigned_to_name?: string;
  messages?: TicketMessage[];
  messages_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket: string;
  author: string | null;
  author_name?: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface EmailTemplateType {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  category: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  type: "task" | "ticket";
  status: string;
  priority: string;
  lead_id?: string;
  lead_name?: string;
  assigned_to_name?: string;
}

// ============================================================================
// Sprint 2 API Clients
// ============================================================================

export const contactApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/contacts/", { params }),
  get: (id: string) => apiClient.get(`/salescube/contacts/${id}/`),
  create: (data: Partial<Contact>) => apiClient.post("/salescube/contacts/", data),
  update: (id: string, data: Partial<Contact>) => apiClient.patch(`/salescube/contacts/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/contacts/${id}/`),
  importCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.post("/salescube/contacts/import-csv/", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
  merge: (primaryId: string, mergeIds: string[]) => apiClient.post("/salescube/contacts/merge/", { primary_id: primaryId, merge_ids: mergeIds }),
  export: () => apiClient.get("/salescube/contacts/export/", { responseType: "blob" }),
};

export const invoiceApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/invoices/", { params }),
  get: (id: string) => apiClient.get(`/salescube/invoices/${id}/`),
  create: (data: Partial<Invoice>) => apiClient.post("/salescube/invoices/", data),
  update: (id: string, data: Partial<Invoice>) => apiClient.patch(`/salescube/invoices/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/invoices/${id}/`),
  addItem: (id: string, data: Partial<InvoiceItemType>) => apiClient.post(`/salescube/invoices/${id}/add-item/`, data),
  removeItem: (id: string, itemId: string) => apiClient.delete(`/salescube/invoices/${id}/remove-item/${itemId}/`),
  markPaid: (id: string) => apiClient.post(`/salescube/invoices/${id}/mark-paid/`),
  summary: (params?: Record<string, string>) => apiClient.get("/salescube/invoices/summary/", { params }),
};

export const ticketApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/tickets/", { params }),
  get: (id: string) => apiClient.get(`/salescube/tickets/${id}/`),
  create: (data: Partial<Ticket>) => apiClient.post("/salescube/tickets/", data),
  update: (id: string, data: Partial<Ticket>) => apiClient.patch(`/salescube/tickets/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/tickets/${id}/`),
  addMessage: (id: string, data: { content: string; is_internal?: boolean }) => apiClient.post(`/salescube/tickets/${id}/messages/`, data),
  getMessages: (id: string) => apiClient.get(`/salescube/tickets/${id}/messages/`),
  resolve: (id: string) => apiClient.post(`/salescube/tickets/${id}/resolve/`),
  close: (id: string) => apiClient.post(`/salescube/tickets/${id}/close/`),
  summary: (params?: Record<string, string>) => apiClient.get("/salescube/tickets/summary/", { params }),
};

export const emailTemplateApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/email-templates/", { params }),
  get: (id: string) => apiClient.get(`/salescube/email-templates/${id}/`),
  create: (data: Partial<EmailTemplateType>) => apiClient.post("/salescube/email-templates/", data),
  update: (id: string, data: Partial<EmailTemplateType>) => apiClient.patch(`/salescube/email-templates/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/salescube/email-templates/${id}/`),
  send: (id: string, to: string, variables?: Record<string, string>) => apiClient.post(`/salescube/email-templates/${id}/send/`, { to, variables }),
};

export const calendarApi = {
  getEvents: (params?: Record<string, string>) => apiClient.get<CalendarEvent[]>("/salescube/calendar/", { params }),
};

export const allNotesApi = {
  list: (params?: Record<string, string>) => apiClient.get("/salescube/all-notes/", { params }),
};

// ============================================================================
// Ticket Summary Type
// ============================================================================

export interface TicketSummary {
  total: number;
  open: number;
  in_progress: number;
  waiting: number;
  resolved: number;
  closed: number;
}
