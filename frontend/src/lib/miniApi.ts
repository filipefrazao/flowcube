import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },
};

const mc = axios.create({ baseURL: API_BASE_URL + "/minicube" });

mc.interceptors.request.use((config) => {
  const token = safeLocalStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

mc.interceptors.response.use(
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
export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  manager: string;
  zip_code?: string;
  phone?: string;
  active: boolean;
  created_at: string;
}

export interface MiniClass {
  id: string;
  name: string;
  description: string;
  location: string;
  location_name?: string;
  instructor: string;
  start_date: string;
  end_date: string;
  capacity: number;
  students_count?: number;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  student_class: string;
  class_name?: string;
  location: string;
  location_name?: string;
  status: "active" | "inactive" | "graduated";
  enrollment_date: string;
  created_at: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  education_class?: string;
  class_name?: string;
  blocks?: any[];
  zip_code?: string;
  phone?: string;
  active: boolean;
  created_at: string;
}

export interface Block {
  id: string;
  flow: string;
  flow_name?: string;
  title: string;
  type: "video" | "text" | "quiz" | "task";
  content: string;
  order: number;
  duration_minutes?: number;
  created_at: string;
}

// API
export const miniApi = {
  // Locations
  listLocations: async (params?: Record<string, any>): Promise<{ results: Location[]; count: number }> => {
    const r = await mc.get("/locations/", { params });
    return r.data;
  },
  getLocation: async (id: string): Promise<Location> => {
    const r = await mc.get(`/locations/${id}/`);
    return r.data;
  },
  createLocation: async (data: Partial<Location>): Promise<Location> => {
    const r = await mc.post("/locations/", data);
    return r.data;
  },
  updateLocation: async (id: string, data: Partial<Location>): Promise<Location> => {
    const r = await mc.patch(`/locations/${id}/`, data);
    return r.data;
  },
  deleteLocation: async (id: string): Promise<void> => {
    await mc.delete(`/locations/${id}/`);
  },

  // Classes
  listClasses: async (params?: Record<string, any>): Promise<{ results: MiniClass[]; count: number }> => {
    const r = await mc.get("/classes/", { params });
    return r.data;
  },
  getClass: async (id: string): Promise<MiniClass> => {
    const r = await mc.get(`/classes/${id}/`);
    return r.data;
  },
  createClass: async (data: Partial<MiniClass>): Promise<MiniClass> => {
    const r = await mc.post("/classes/", data);
    return r.data;
  },
  updateClass: async (id: string, data: Partial<MiniClass>): Promise<MiniClass> => {
    const r = await mc.patch(`/classes/${id}/`, data);
    return r.data;
  },
  deleteClass: async (id: string): Promise<void> => {
    await mc.delete(`/classes/${id}/`);
  },

  // Students
  listStudents: async (params?: Record<string, any>): Promise<{ results: Student[]; count: number }> => {
    const r = await mc.get("/students/", { params });
    return r.data;
  },
  getStudent: async (id: string): Promise<Student> => {
    const r = await mc.get(`/students/${id}/`);
    return r.data;
  },
  createStudent: async (data: Partial<Student>): Promise<Student> => {
    const r = await mc.post("/students/", data);
    return r.data;
  },
  updateStudent: async (id: string, data: Partial<Student>): Promise<Student> => {
    const r = await mc.patch(`/students/${id}/`, data);
    return r.data;
  },
  deleteStudent: async (id: string): Promise<void> => {
    await mc.delete(`/students/${id}/`);
  },

  // Flows
  listFlows: async (params?: Record<string, any>): Promise<{ results: Flow[]; count: number }> => {
    const r = await mc.get("/flows/", { params });
    return r.data;
  },
  getFlow: async (id: string): Promise<Flow> => {
    const r = await mc.get(`/flows/${id}/`);
    return r.data;
  },
  createFlow: async (data: Partial<Flow>): Promise<Flow> => {
    const r = await mc.post("/flows/", data);
    return r.data;
  },
  updateFlow: async (id: string, data: Partial<Flow>): Promise<Flow> => {
    const r = await mc.patch(`/flows/${id}/`, data);
    return r.data;
  },
  deleteFlow: async (id: string): Promise<void> => {
    await mc.delete(`/flows/${id}/`);
  },

  // Blocks
  listBlocks: async (params?: Record<string, any>): Promise<{ results: Block[]; count: number }> => {
    const r = await mc.get("/blocks/", { params });
    return r.data;
  },
  getBlock: async (id: string): Promise<Block> => {
    const r = await mc.get(`/blocks/${id}/`);
    return r.data;
  },
  createBlock: async (data: Partial<Block>): Promise<Block> => {
    const r = await mc.post("/blocks/", data);
    return r.data;
  },
  updateBlock: async (id: string, data: Partial<Block>): Promise<Block> => {
    const r = await mc.patch(`/blocks/${id}/`, data);
    return r.data;
  },
  deleteBlock: async (id: string): Promise<void> => {
    await mc.delete(`/blocks/${id}/`);
  },
};

export default miniApi;
