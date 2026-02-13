import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
};

const st = axios.create({ baseURL: API_BASE_URL + "/settings" });

st.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

st.interceptors.response.use(
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
export interface UserGroup {
  id: number;
  name: string;
  description: string;
  members_count?: number;
  created_at: string;
}

export interface BusinessUnit {
  id: number;
  name: string;
  city: string;
  state: string;
  manager: string;
  is_active: boolean;
  created_at: string;
}

export interface Squad {
  id: number;
  name: string;
  unit: number;
  unit_name?: string;
  leader: string;
  members_count?: number;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  entity_type: string;
  created_at: string;
}

// API
export const settingsExtApi = {
  // Groups
  listGroups: async (): Promise<{ results: UserGroup[] }> => {
    const r = await st.get("/groups/");
    return r.data;
  },
  createGroup: async (data: Partial<UserGroup>): Promise<UserGroup> => {
    const r = await st.post("/groups/", data);
    return r.data;
  },
  updateGroup: async (id: number, data: Partial<UserGroup>): Promise<UserGroup> => {
    const r = await st.patch(`/groups/${id}/`, data);
    return r.data;
  },
  deleteGroup: async (id: number): Promise<void> => {
    await st.delete(`/groups/${id}/`);
  },

  // Units
  listUnits: async (): Promise<{ results: BusinessUnit[] }> => {
    const r = await st.get("/units/");
    return r.data;
  },
  createUnit: async (data: Partial<BusinessUnit>): Promise<BusinessUnit> => {
    const r = await st.post("/units/", data);
    return r.data;
  },
  updateUnit: async (id: number, data: Partial<BusinessUnit>): Promise<BusinessUnit> => {
    const r = await st.patch(`/units/${id}/`, data);
    return r.data;
  },
  deleteUnit: async (id: number): Promise<void> => {
    await st.delete(`/units/${id}/`);
  },

  // Squads
  listSquads: async (): Promise<{ results: Squad[] }> => {
    const r = await st.get("/squads/");
    return r.data;
  },
  createSquad: async (data: Partial<Squad>): Promise<Squad> => {
    const r = await st.post("/squads/", data);
    return r.data;
  },
  updateSquad: async (id: number, data: Partial<Squad>): Promise<Squad> => {
    const r = await st.patch(`/squads/${id}/`, data);
    return r.data;
  },
  deleteSquad: async (id: number): Promise<void> => {
    await st.delete(`/squads/${id}/`);
  },

  // Tags
  listTags: async (params?: { entity_type?: string }): Promise<{ results: Tag[] }> => {
    const r = await st.get("/tags/", { params });
    return r.data;
  },
  createTag: async (data: Partial<Tag>): Promise<Tag> => {
    const r = await st.post("/tags/", data);
    return r.data;
  },
  updateTag: async (id: number, data: Partial<Tag>): Promise<Tag> => {
    const r = await st.patch(`/tags/${id}/`, data);
    return r.data;
  },
  deleteTag: async (id: number): Promise<void> => {
    await st.delete(`/tags/${id}/`);
  },
};

export default settingsExtApi;
