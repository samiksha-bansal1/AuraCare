import axios from 'axios';

// Create axios instance with base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_BASE_URL, // backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('auracare_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token: string | undefined = parsed?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // ignore JSON parse errors
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auracare_auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  // 🔹 Patient login
  loginPatient: async (credentials: { patientId: string; name: string }) => {
    // Backend expects unified login at /auth/login with { type: 'patient', id, name }
    const response = await api.post('/auth/login', {
      type: 'patient',
      id: credentials.patientId,
      name: credentials.name,
    });
    return response.data;
  },

  // 🔹 Nurse/Staff login
  loginNurse: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', {
      type: 'nurse',
      email: credentials.email,
      password: credentials.password
    });
    return response.data;
  },

  // 🔹 Family login
  loginFamily: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', {
      type: 'family',
      email: credentials.email,
      password: credentials.password
    });
    return response.data;
  },

  // 🔹 Admin login
  loginAdmin: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', {
      type: 'admin',
      email: credentials.email,
      password: credentials.password
    });
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Admin API functions
export const adminAPI = {
  // Get all patients
  getPatients: async () => {
    const response = await api.get('/patients');
    return response.data;
  },

  // Get all staff members
  getStaff: async () => {
    const response = await api.get('/staff');
    return response.data;
  },

  // Get all family members
  getFamilyMembers: async () => {
    const response = await api.get('/family');
    return response.data;
  },

  // Add new patient
  addPatient: async (patientData: {
    patientId: string;
    name: string;
    age: number;
    condition: string;
    roomNumber: string;
  }) => {
    const response = await api.post('/auth/patient/register', patientData);
    return response.data;
  },

  // Add new staff member
  addStaff: async (staffData: {
    staffId: string;
    name: string;
    email: string;
    password: string;
    role: 'doctor' | 'nurse' | 'admin';
    department: string;
  }) => {
    const response = await api.post('/auth/staff/register', staffData);
    return response.data;
  },

  // Add new family member
  addFamilyMember: async (familyData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    relationship: string;
    patientId: string;
    accessLevel: 'full' | 'limited';
  }) => {
    const response = await api.post('/auth/family/register', familyData);
    return response.data;
  },

  // Approve family member
  approveFamilyMember: async (familyId: string) => {
    const response = await api.put(`/family/${familyId}/approve`);
    return response.data;
  },

  // Deactivate patient
  deactivatePatient: async (patientId: string) => {
    const response = await api.put(`/patients/${patientId}/deactivate`);
    return response.data;
  },

  // Deactivate staff member
  deactivateStaff: async (staffId: string) => {
    const response = await api.put(`/staff/${staffId}/deactivate`);
    return response.data;
  },

  // Deactivate family member
  deactivateFamilyMember: async (familyId: string) => {
    const response = await api.put(`/family/${familyId}/deactivate`);
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
