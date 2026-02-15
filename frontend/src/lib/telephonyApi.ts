import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
};

const telephonyClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL.replace(/\/api\/v1\/?$/, "/api/v1/telephony"),
  headers: { "Content-Type": "application/json" },
});

telephonyClient.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

telephonyClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
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

export interface Extension {
  id: number;
  user: number;
  user_name: string;
  extension_number: string;
  sip_password?: string;
  webrtc_enabled: boolean;
  status: "AVAILABLE" | "UNAVAILABLE" | "ON_CALL" | "RINGING" | "DND";
  created_at: string;
  updated_at: string;
}

export interface CallRecord {
  id: string;
  pabx_call_id: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  status: "RINGING" | "ANSWERED" | "NO_ANSWER" | "BUSY" | "FAILED" | "COMPLETED";
  caller_number: string;
  callee_number: string;
  lead: number | null;
  lead_name: string | null;
  contact: number | null;
  contact_name: string | null;
  agent: number | null;
  agent_name: string | null;
  start_time: string;
  answer_time: string | null;
  end_time: string | null;
  duration_seconds: number;
  recording_s3_key: string | null;
  transcription: string | null;
  transcription_status: "pending" | "processing" | "completed" | "failed" | "skipped";
  disposition: string;
  notes: string;
}

export interface CallRecordList {
  id: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  status: string;
  caller_number: string;
  callee_number: string;
  lead: number | null;
  lead_name: string | null;
  agent: number | null;
  agent_name: string | null;
  start_time: string;
  duration_seconds: number;
  disposition: string;
  transcription_status: string;
}

export interface VoicemailMessage {
  id: string;
  extension: number;
  extension_number: string;
  caller_number: string;
  duration: number;
  audio_s3_key: string;
  transcription: string;
  is_read: boolean;
  created_at: string;
}

export interface IVROption {
  id: number;
  ivr_menu: number;
  digit: string;
  label: string;
  destination_type: "EXTENSION" | "QUEUE" | "IVR_MENU" | "VOICEMAIL" | "EXTERNAL" | "HANGUP";
  destination_id: string;
}

export interface IVRMenu {
  id: number;
  name: string;
  greeting_audio_s3_key: string;
  timeout_seconds: number;
  timeout_destination: string;
  invalid_destination: string;
  max_retries: number;
  options: IVROption[];
}

export interface QueueMember {
  id: number;
  queue: number;
  extension: number;
  extension_number: string;
  user_name: string;
  priority: number;
}

export interface CallQueue {
  id: number;
  name: string;
  strategy: "ringall" | "leastrecent" | "fewestcalls" | "random" | "rrmemory";
  timeout: number;
  max_wait_time: number;
  music_on_hold: string;
  members: QueueMember[];
}

export interface CallStats {
  id: number;
  date: string;
  agent: number;
  agent_name: string;
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  outbound_calls: number;
  avg_duration: number;
  total_talk_time: number;
}

export interface DashboardStats {
  summary: {
    total_calls: number | null;
    total_answered: number | null;
    total_missed: number | null;
    total_outbound: number | null;
    total_talk_time: number | null;
    avg_duration: number | null;
  };
  daily: Array<{
    date: string;
    calls: number;
    answered: number;
    missed: number;
  }>;
  agents: Array<{
    agent__username: string;
    agent__first_name: string;
    agent__last_name: string;
    total: number;
    answered: number;
    talk_time: number;
  }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================================================
// API
// ============================================================================

export const telephonyApi = {
  // ---- Extensions ----
  listExtensions: async (params?: { search?: string }): Promise<PaginatedResponse<Extension>> => {
    const response = await telephonyClient.get("/extensions/", { params });
    return response.data;
  },

  getExtension: async (id: number): Promise<Extension> => {
    const response = await telephonyClient.get(`/extensions/${id}/`);
    return response.data;
  },

  createExtension: async (data: Partial<Extension>): Promise<Extension> => {
    const response = await telephonyClient.post("/extensions/", data);
    return response.data;
  },

  updateExtension: async (id: number, data: Partial<Extension>): Promise<Extension> => {
    const response = await telephonyClient.patch(`/extensions/${id}/`, data);
    return response.data;
  },

  deleteExtension: async (id: number): Promise<void> => {
    await telephonyClient.delete(`/extensions/${id}/`);
  },

  // ---- Calls ----
  listCalls: async (params?: {
    direction?: string;
    status?: string;
    agent?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
    ordering?: string;
    page?: number;
  }): Promise<PaginatedResponse<CallRecordList>> => {
    const response = await telephonyClient.get("/calls/", { params });
    return response.data;
  },

  getCall: async (id: string): Promise<CallRecord> => {
    const response = await telephonyClient.get(`/calls/${id}/`);
    return response.data;
  },

  getCallRecording: async (id: string): Promise<{ recording_url: string }> => {
    const response = await telephonyClient.get(`/calls/${id}/recording/`);
    return response.data;
  },

  transcribeCall: async (id: string): Promise<{ message: string }> => {
    const response = await telephonyClient.post(`/calls/${id}/transcribe/`);
    return response.data;
  },

  initiateCall: async (data: { to_number: string; lead_id?: string }): Promise<any> => {
    const response = await telephonyClient.post("/calls/initiate/", data);
    return response.data;
  },

  // ---- Voicemails ----
  listVoicemails: async (params?: {
    extension?: number;
    is_read?: boolean;
  }): Promise<PaginatedResponse<VoicemailMessage>> => {
    const response = await telephonyClient.get("/voicemails/", { params });
    return response.data;
  },

  getVoicemail: async (id: string): Promise<VoicemailMessage> => {
    const response = await telephonyClient.get(`/voicemails/${id}/`);
    return response.data;
  },

  markVoicemailRead: async (id: string): Promise<VoicemailMessage> => {
    const response = await telephonyClient.post(`/voicemails/${id}/mark-read/`);
    return response.data;
  },

  getVoicemailAudio: async (id: string): Promise<{ audio_url: string }> => {
    const response = await telephonyClient.get(`/voicemails/${id}/audio/`);
    return response.data;
  },

  // ---- IVR Menus ----
  listIVRMenus: async (): Promise<PaginatedResponse<IVRMenu>> => {
    const response = await telephonyClient.get("/ivr-menus/");
    return response.data;
  },

  getIVRMenu: async (id: number): Promise<IVRMenu> => {
    const response = await telephonyClient.get(`/ivr-menus/${id}/`);
    return response.data;
  },

  createIVRMenu: async (data: Partial<IVRMenu>): Promise<IVRMenu> => {
    const response = await telephonyClient.post("/ivr-menus/", data);
    return response.data;
  },

  updateIVRMenu: async (id: number, data: Partial<IVRMenu>): Promise<IVRMenu> => {
    const response = await telephonyClient.patch(`/ivr-menus/${id}/`, data);
    return response.data;
  },

  deleteIVRMenu: async (id: number): Promise<void> => {
    await telephonyClient.delete(`/ivr-menus/${id}/`);
  },

  // ---- IVR Options ----
  listIVROptions: async (params?: { ivr_menu?: number }): Promise<PaginatedResponse<IVROption>> => {
    const response = await telephonyClient.get("/ivr-options/", { params });
    return response.data;
  },

  createIVROption: async (data: Partial<IVROption>): Promise<IVROption> => {
    const response = await telephonyClient.post("/ivr-options/", data);
    return response.data;
  },

  updateIVROption: async (id: number, data: Partial<IVROption>): Promise<IVROption> => {
    const response = await telephonyClient.patch(`/ivr-options/${id}/`, data);
    return response.data;
  },

  deleteIVROption: async (id: number): Promise<void> => {
    await telephonyClient.delete(`/ivr-options/${id}/`);
  },

  // ---- Queues ----
  listQueues: async (): Promise<PaginatedResponse<CallQueue>> => {
    const response = await telephonyClient.get("/queues/");
    return response.data;
  },

  getQueue: async (id: number): Promise<CallQueue> => {
    const response = await telephonyClient.get(`/queues/${id}/`);
    return response.data;
  },

  createQueue: async (data: Partial<CallQueue>): Promise<CallQueue> => {
    const response = await telephonyClient.post("/queues/", data);
    return response.data;
  },

  updateQueue: async (id: number, data: Partial<CallQueue>): Promise<CallQueue> => {
    const response = await telephonyClient.patch(`/queues/${id}/`, data);
    return response.data;
  },

  deleteQueue: async (id: number): Promise<void> => {
    await telephonyClient.delete(`/queues/${id}/`);
  },

  // ---- Queue Members ----
  listQueueMembers: async (params?: { queue?: number }): Promise<PaginatedResponse<QueueMember>> => {
    const response = await telephonyClient.get("/queue-members/", { params });
    return response.data;
  },

  addQueueMember: async (data: { queue: number; extension: number; priority?: number }): Promise<QueueMember> => {
    const response = await telephonyClient.post("/queue-members/", data);
    return response.data;
  },

  removeQueueMember: async (id: number): Promise<void> => {
    await telephonyClient.delete(`/queue-members/${id}/`);
  },

  // ---- Stats ----
  listStats: async (params?: {
    agent?: number;
    date_from?: string;
    date_to?: string;
    ordering?: string;
  }): Promise<PaginatedResponse<CallStats>> => {
    const response = await telephonyClient.get("/stats/", { params });
    return response.data;
  },

  getDashboardStats: async (days?: number): Promise<DashboardStats> => {
    const response = await telephonyClient.get("/stats/dashboard/", {
      params: days ? { days } : undefined,
    });
    return response.data;
  },
};

export default telephonyApi;
