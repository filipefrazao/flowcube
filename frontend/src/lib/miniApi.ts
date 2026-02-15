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

export interface Pole {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  manager: string | null;
  manager_name: string | null;
  status: "ativo" | "inativo";
  notes: string;
  classes_count: number;
  customers_count: number;
  locations_count: number;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  phone?: string;
  manager: string;
  pole: string | null;
  pole_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cnpj: string;
  tipo_pessoa: "fisica" | "juridica";
  company: string;
  position: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  photo_url: string;
  birth_date: string | null;
  notes: string;
  status: "ativo" | "inativo" | "prospect";
  user: string | null;
  lead: string | null;
  pole: string | null;
  pole_name: string | null;
  owner: string | null;
  owner_name: string | null;
  enrollments_count: number;
  created_at: string;
  updated_at: string;
}

export interface MiniClass {
  id: string;
  name: string;
  description: string;
  product: string | null;
  product_name: string | null;
  location: string;
  location_name?: string;
  pole: string | null;
  pole_name: string | null;
  instructor: string;
  start_date: string;
  end_date: string;
  capacity: number;
  students_count?: number;
  enrollments_count?: number;
  status: "proxima" | "em_andamento" | "finalizada" | "cancelada";
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  enrollment_date: string;
  student_class: string;
  class_name?: string;
  location: string;
  location_name?: string;
  customer: string | null;
  customer_name: string | null;
  status: "active" | "inactive" | "graduated";
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student: string;
  student_name: string | null;
  course_class: string;
  class_name: string | null;
  customer: string | null;
  customer_name: string | null;
  status: "pendente" | "confirmado" | "ausente" | "sem_contato" | "transferido";
  notes: string;
  enrolled_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  enrollment: string;
  date: string;
  present: boolean;
  notes: string;
  recorded_by: string | null;
  student_name: string | null;
  class_name: string | null;
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

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// API
export const miniApi = {
  // Poles
  listPoles: async (params?: Record<string, any>): Promise<PaginatedResponse<Pole>> => {
    const r = await mc.get("/poles/", { params });
    return r.data;
  },
  getPole: async (id: string): Promise<Pole> => {
    const r = await mc.get(`/poles/${id}/`);
    return r.data;
  },
  createPole: async (data: Partial<Pole>): Promise<Pole> => {
    const r = await mc.post("/poles/", data);
    return r.data;
  },
  updatePole: async (id: string, data: Partial<Pole>): Promise<Pole> => {
    const r = await mc.patch(`/poles/${id}/`, data);
    return r.data;
  },
  deletePole: async (id: string): Promise<void> => {
    await mc.delete(`/poles/${id}/`);
  },

  // Locations
  listLocations: async (params?: Record<string, any>): Promise<PaginatedResponse<Location>> => {
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

  // Customers
  listCustomers: async (params?: Record<string, any>): Promise<PaginatedResponse<Customer>> => {
    const r = await mc.get("/customers/", { params });
    return r.data;
  },
  getCustomer: async (id: string): Promise<Customer> => {
    const r = await mc.get(`/customers/${id}/`);
    return r.data;
  },
  createCustomer: async (data: Partial<Customer>): Promise<Customer> => {
    const r = await mc.post("/customers/", data);
    return r.data;
  },
  updateCustomer: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    const r = await mc.patch(`/customers/${id}/`, data);
    return r.data;
  },
  deleteCustomer: async (id: string): Promise<void> => {
    await mc.delete(`/customers/${id}/`);
  },
  getCustomerEnrollments: async (id: string): Promise<Enrollment[]> => {
    const r = await mc.get(`/customers/${id}/enrollments/`);
    return r.data;
  },
  getCustomerNotes: async (id: string): Promise<{ notes: string }> => {
    const r = await mc.get(`/customers/${id}/notes_list/`);
    return r.data;
  },
  addCustomerNote: async (id: string, text: string): Promise<{ notes: string }> => {
    const r = await mc.post(`/customers/${id}/add_note/`, { text });
    return r.data;
  },

  // Classes
  listClasses: async (params?: Record<string, any>): Promise<PaginatedResponse<MiniClass>> => {
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
  getClassEnrollments: async (id: string): Promise<Enrollment[]> => {
    const r = await mc.get(`/classes/${id}/enrollments/`);
    return r.data;
  },

  // Enrollments
  listEnrollments: async (params?: Record<string, any>): Promise<PaginatedResponse<Enrollment>> => {
    const r = await mc.get("/enrollments/", { params });
    return r.data;
  },
  getEnrollment: async (id: string): Promise<Enrollment> => {
    const r = await mc.get(`/enrollments/${id}/`);
    return r.data;
  },
  createEnrollment: async (data: Partial<Enrollment>): Promise<Enrollment> => {
    const r = await mc.post("/enrollments/", data);
    return r.data;
  },
  updateEnrollment: async (id: string, data: Partial<Enrollment>): Promise<Enrollment> => {
    const r = await mc.patch(`/enrollments/${id}/`, data);
    return r.data;
  },
  deleteEnrollment: async (id: string): Promise<void> => {
    await mc.delete(`/enrollments/${id}/`);
  },

  // Attendances
  listAttendances: async (params?: Record<string, any>): Promise<PaginatedResponse<Attendance>> => {
    const r = await mc.get("/attendances/", { params });
    return r.data;
  },
  createAttendance: async (data: Partial<Attendance>): Promise<Attendance> => {
    const r = await mc.post("/attendances/", data);
    return r.data;
  },
  updateAttendance: async (id: string, data: Partial<Attendance>): Promise<Attendance> => {
    const r = await mc.patch(`/attendances/${id}/`, data);
    return r.data;
  },
  bulkCreateAttendance: async (records: Array<{enrollment: string; date: string; present: boolean; notes?: string}>): Promise<any> => {
    const r = await mc.post("/attendances/bulk_create/", { records });
    return r.data;
  },

  // Students
  listStudents: async (params?: Record<string, any>): Promise<PaginatedResponse<Student>> => {
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
  listFlows: async (params?: Record<string, any>): Promise<PaginatedResponse<Flow>> => {
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
  listBlocks: async (params?: Record<string, any>): Promise<PaginatedResponse<Block>> => {
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
