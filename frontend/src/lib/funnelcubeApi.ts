import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
};

const fc = axios.create({ baseURL: API_BASE_URL + '/funnelcube' });

fc.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

fc.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Types
export interface FunnelProject {
  id: string;
  name: string;
  domain: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  client_id: string | null;
  client_secret: string | null;
}

export interface FunnelOverview {
  visitors: number;
  sessions: number;
  pageviews: number;
  events: number;
  bounce_rate: number;
  avg_duration: number;
  revenue: number;
}

export interface ChartSeries {
  name: string;
  data: { timestamp: string; value: number }[];
}

export interface FunnelStep {
  name: string;
  count: number;
  conversion: number;
  drop_off: number | null;
}

export interface FunnelResult {
  steps: FunnelStep[];
  completion_rate: number;
  most_dropped_at: string | null;
}

export interface RetentionResult {
  cohorts: string[];
  sizes: number[];
  data: (number | null)[][];
  total_cohorts: number;
}

export interface ConversionResult {
  conversion_rate: number;
  conversions: number;
  total_visitors: number;
  confidence_interval: { lower: number; upper: number };
  breakdown?: Record<string, any>;
}

export interface FlowNode {
  id: string;
  label: string;
  value: number;
}

export interface FlowLink {
  source: string;
  target: string;
  value: number;
}

export interface FlowResult {
  nodes: FlowNode[];
  links: FlowLink[];
  total_transitions: number;
}

export interface TopItem {
  path?: string;
  name?: string;
  referrer_name?: string;
  referrer_type?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device?: string;
  count: number;
}

// API
export const funnelcubeApi = {
  // Projects
  listProjects: async (): Promise<FunnelProject[]> => {
    const r = await fc.get('/projects/');
    return r.data.results || r.data || [];
  },

  getProject: async (id: string): Promise<FunnelProject> => {
    const r = await fc.get(`/projects/${id}/`);
    return r.data;
  },

  createProject: async (data: { name: string; domain?: string; timezone?: string }): Promise<FunnelProject> => {
    const r = await fc.post('/projects/', data);
    return r.data;
  },

  // Overview
  getOverview: async (projectId: string, days = 7): Promise<FunnelOverview> => {
    const r = await fc.get(`/projects/${projectId}/overview/?days=${days}`);
    return r.data;
  },

  // Charts
  getChart: async (projectId: string, params: {
    events: string;
    interval?: string;
    days?: number;
    metric?: string;
  }): Promise<{ series: ChartSeries[] }> => {
    const r = await fc.get(`/projects/${projectId}/chart/`, { params });
    return r.data;
  },

  // Top lists
  getTopPages: async (projectId: string, days = 7): Promise<TopItem[]> => {
    const r = await fc.get(`/projects/${projectId}/top-pages/?days=${days}`);
    return r.data;
  },

  getTopSources: async (projectId: string, days = 7): Promise<TopItem[]> => {
    const r = await fc.get(`/projects/${projectId}/top-sources/?days=${days}`);
    return r.data;
  },

  getTopGeo: async (projectId: string, days = 7): Promise<TopItem[]> => {
    const r = await fc.get(`/projects/${projectId}/top-geo/?days=${days}`);
    return r.data;
  },

  getDevices: async (projectId: string, days = 7): Promise<{
    browsers: TopItem[];
    os: TopItem[];
    devices: TopItem[];
  }> => {
    const r = await fc.get(`/projects/${projectId}/devices/?days=${days}`);
    return r.data;
  },

  getEventsList: async (projectId: string, days = 7): Promise<TopItem[]> => {
    const r = await fc.get(`/projects/${projectId}/events-list/?days=${days}`);
    return r.data;
  },

  // Advanced analytics
  getFunnel: async (projectId: string, steps: string[], windowHours = 24): Promise<FunnelResult> => {
    const r = await fc.post(`/projects/${projectId}/funnel/`, {
      steps,
      window_hours: windowHours,
    });
    return r.data;
  },

  getRetention: async (projectId: string, params?: {
    event?: string;
    days?: number;
    interval?: string;
  }): Promise<RetentionResult> => {
    const r = await fc.get(`/projects/${projectId}/retention/`, { params });
    return r.data;
  },

  getConversion: async (projectId: string, event: string, params?: {
    days?: number;
    breakdown?: string;
  }): Promise<ConversionResult> => {
    const r = await fc.get(`/projects/${projectId}/conversion/`, {
      params: { event, ...params },
    });
    return r.data;
  },

  getFlow: async (projectId: string, params?: {
    days?: number;
    max_steps?: number;
    min_frequency?: number;
  }): Promise<FlowResult> => {
    const r = await fc.get(`/projects/${projectId}/flow/`, { params });
    return r.data;
  },
};
