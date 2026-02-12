import apiClient from "./api";

export interface Plan {
  id: string;
  tier: string;
  name: string;
  description: string;
  tagline?: string;
  price_monthly: string;
  price_yearly: string;
  yearly_discount_percentage?: string;
  yearly_savings?: string;
  features: string[];
  is_popular: boolean;
  trial_days: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  billing_cycle: "monthly" | "yearly";
  status: string;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  is_active: boolean;
  is_trial: boolean;
  days_until_renewal: number;
  plan: Plan;
}

export interface UsageMetrics {
  id: string;
  month: string;
  workflows_count: number;
  active_workflows_count: number;
  executions_count: number;
  ai_requests_count: number;
  storage_used_mb: number;
  whatsapp_messages_sent: number;
  api_requests_count: number;
  limits_status: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const billingApi = {
  listPlans: async (): Promise<Plan[]> => {
    const res = await apiClient.get("/billing/plans/");
    return res.data.results || res.data;
  },

  getCurrentSubscription: async (): Promise<Subscription> => {
    const res = await apiClient.get("/billing/subscriptions/current/");
    return res.data;
  },

  getCurrentUsage: async (): Promise<UsageMetrics> => {
    const res = await apiClient.get("/billing/usage/current/");
    return res.data;
  },
};
