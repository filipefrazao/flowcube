import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
};

const sc = axios.create({ baseURL: API_BASE_URL + "/socialcube" });

sc.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

sc.interceptors.response.use(
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
export interface SocialAccount {
  id: number;
  platform: string;
  username: string;
  display_name: string;
  profile_image_url: string;
  is_active: boolean;
  connected_at: string;
  token_expires_at?: string;
  metadata?: Record<string, any>;
}

export interface PostMedia {
  id: number;
  file: string;
  media_type: string;
  alt_text: string;
  order: number;
  created_at: string;
}

export interface PostPlatform {
  id: number;
  account: number;
  account_username: string;
  account_platform: string;
  platform_post_id?: string;
  status: string;
  error_message?: string;
  published_at?: string;
}

export interface ScheduledPost {
  id: number;
  title: string;
  caption: string;
  hashtags: string[];
  status: string;
  post_type: string;
  scheduled_at?: string;
  created_at: string;
  updated_at?: string;
  first_comment?: string;
  location_name?: string;
  platforms: PostPlatform[];
  media_items?: PostMedia[];
  media_count?: number;
  user_name?: string;
}

export interface Competitor {
  id: number;
  platform: string;
  username: string;
  display_name: string;
  profile_image_url: string;
  is_active: boolean;
  created_at: string;
  latest_snapshot?: {
    followers: number;
    engagement_rate: number;
    avg_likes: number;
    avg_comments: number;
    date: string;
  };
}

export interface SmartLinkPage {
  id: number;
  slug: string;
  title: string;
  bio: string;
  avatar_url: string;
  theme: Record<string, any>;
  is_active: boolean;
  total_views: number;
  created_at: string;
  buttons: SmartLinkButton[];
  public_url: string;
}

export interface SmartLinkButton {
  id: number;
  label: string;
  url: string;
  icon: string;
  order: number;
  is_active: boolean;
  clicks: number;
}

export interface AnalyticsOverview {
  total_followers: number;
  total_impressions: number;
  total_reach: number;
  days: number;
  platforms: {
    account_id: number;
    platform: string;
    username: string;
    followers: number;
    engagement_rate: number;
    history: any[];
  }[];
}

// Accounts
export const getAccounts = () => sc.get<SocialAccount[]>("/accounts/");
export const getOAuthUrl = (platform: string) => sc.get<{ url: string }>(`/accounts/oauth_url/?platform=${platform}`);
export const connectAccount = (code: string, state: string) => sc.post<SocialAccount>("/accounts/connect/", { code, state });
export const disconnectAccount = (id: number) => sc.post(`/accounts/${id}/disconnect/`);
export const refreshAccount = (id: number) => sc.post(`/accounts/${id}/refresh/`);

// Posts
export const getPosts = (params?: Record<string, string>) => sc.get<{ results: ScheduledPost[]; count: number }>("/posts/", { params });
export const getPost = (id: number) => sc.get<ScheduledPost>(`/posts/${id}/`);
export const createPost = (data: any) => sc.post<ScheduledPost>("/posts/", data);
export const updatePost = (id: number, data: any) => sc.patch<ScheduledPost>(`/posts/${id}/`, data);
export const deletePost = (id: number) => sc.delete(`/posts/${id}/`);
export const publishNow = (id: number) => sc.post(`/posts/${id}/publish_now/`);
export const duplicatePost = (id: number) => sc.post<ScheduledPost>(`/posts/${id}/duplicate/`);
export const getDrafts = () => sc.get<{ results: ScheduledPost[] }>("/posts/drafts/");

// Calendar
export const getCalendar = (year: number, month: number) => sc.get(`/calendar/?year=${year}&month=${month}`);

// Media
export const uploadMedia = (file: File, altText?: string) => {
  const fd = new FormData();
  fd.append("file", file);
  if (altText) fd.append("alt_text", altText);
  return sc.post<PostMedia>("/media/upload/", fd, { headers: { "Content-Type": "multipart/form-data" } });
};

// Analytics
export const getAnalyticsOverview = (days?: number) => sc.get<AnalyticsOverview>(`/analytics/overview/?days=${days || 30}`);
export const getPostInsights = (accountId?: number, days?: number) =>
  sc.get(`/analytics/posts/?account_id=${accountId || ""}&days=${days || 30}`);
export const getBestTimes = (accountId: number) => sc.get(`/analytics/best-times/?account_id=${accountId}`);
export const pullAnalytics = (accountId: number) => sc.post("/analytics/pull/", { account_id: accountId });

// Competitors
export const getCompetitors = () => sc.get<{ results: Competitor[] }>("/competitors/");
export const createCompetitor = (data: any) => sc.post<Competitor>("/competitors/", data);
export const deleteCompetitor = (id: number) => sc.delete(`/competitors/${id}/`);
export const getCompetitorHistory = (id: number, days?: number) => sc.get(`/competitors/${id}/history/?days=${days || 30}`);
export const trackCompetitorNow = (id: number) => sc.post(`/competitors/${id}/track_now/`);

// SmartLinks
export const getSmartLinks = () => sc.get<{ results: SmartLinkPage[] }>("/smartlinks/");
export const getSmartLink = (id: number) => sc.get<SmartLinkPage>(`/smartlinks/${id}/`);
export const createSmartLink = (data: any) => sc.post<SmartLinkPage>("/smartlinks/", data);
export const updateSmartLink = (id: number, data: any) => sc.patch<SmartLinkPage>(`/smartlinks/${id}/`, data);
export const deleteSmartLink = (id: number) => sc.delete(`/smartlinks/${id}/`);

// SmartLink Buttons
export const getSmartLinkButtons = (pageId: number) => sc.get<SmartLinkButton[]>(`/smartlinks/${pageId}/buttons/`);
export const createSmartLinkButton = (pageId: number, data: any) => sc.post<SmartLinkButton>(`/smartlinks/${pageId}/buttons/`, data);
export const updateSmartLinkButton = (pageId: number, buttonId: number, data: any) =>
  sc.patch<SmartLinkButton>(`/smartlinks/${pageId}/buttons/${buttonId}/`, data);
export const deleteSmartLinkButton = (pageId: number, buttonId: number) =>
  sc.delete(`/smartlinks/${pageId}/buttons/${buttonId}/`);

// Approvals
export const getApprovals = (status?: string) => sc.get(`/approvals/${status ? `?status=${status}` : ""}`);
export const approvePost = (id: number, comment?: string) => sc.post(`/approvals/${id}/approve/`, { comment });
export const rejectPost = (id: number, comment: string) => sc.post(`/approvals/${id}/reject/`, { comment });

// AI Content
export const generateCaption = (topic: string, platform?: string, tone?: string) =>
  sc.post<{ caption: string }>("/ai/generate-caption/", { topic, platform, tone });
export const suggestHashtags = (caption: string, platform?: string, count?: number) =>
  sc.post<{ hashtags: string[] }>("/ai/suggest-hashtags/", { caption, platform, count });
export const improveCaption = (caption: string, platform?: string) =>
  sc.post<{ improved_caption: string }>("/ai/improve-caption/", { caption, platform });
export const generateAltText = (description: string) =>
  sc.post<{ alt_text: string }>("/ai/alt-text/", { description });

export default sc;
