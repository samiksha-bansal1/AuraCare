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
    console.log('🔍 API Request interceptor - stored auth:', !!stored);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token: string | undefined = parsed?.token;
        console.log('🔑 Token found in storage:', !!token);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Authorization header set');
        }
      } catch (e) {
        console.error('❌ Error parsing stored auth:', e);
      }
    } else {
      console.log('⚠️ No auth data in localStorage');
    }
    console.log('🌐 Making request to:', `${config.baseURL || ''}${config.url || ''}`);
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
    email: string;
    age: number;
    condition: string;
    roomNumber: string;
  }) => {
    const response = await api.post('/patients/register', patientData);
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

// Nurse API functions
export const nurseAPI = {
  // Get all patients
  getPatients: async () => {
    const response = await api.get('/patients');
    return response.data;
  },

  // Get patient notes
  getPatientNotes: async (patientId: string) => {
    const response = await api.get(`/patients/${patientId}/notes`);
    return response.data;
  },

  // Create patient note
  createPatientNote: async (patientId: string, noteData: {
    text: string;
    visibility: 'staff' | 'family';
    tags?: string[];
  }) => {
    const response = await api.post(`/patients/${patientId}/notes`, noteData);
    return response.data;
  },

  // Get patient documents/media
  getPatientDocuments: async (patientId: string) => {
    const response = await api.get(`/patients/${patientId}/media`);
    return response.data;
  },

  // Upload document
  uploadDocument: async (patientId: string, formData: FormData) => {
    const response = await api.post(`/patients/${patientId}/media`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get patient vital signs
  getPatientVitals: async (patientId: string) => {
    const response = await api.get(`/patients/${patientId}/vitals`);
    return response.data;
  },
};

// Family API functions
export const familyAPI = {
  // Get patient notes (family-visible only)
  getPatientNotes: async (patientId: string) => {
    const response = await api.get(`/patients/${patientId}/notes`);
    return response.data;
  },

  // Create family note
  createFamilyNote: async (patientId: string, noteData: {
    text: string;
    visibility: 'family';
    tags?: string[];
  }) => {
    const response = await api.post(`/patients/${patientId}/notes`, noteData);
    return response.data;
  },

  // Get patient documents/media
  getPatientDocuments: async (patientId: string) => {
    const response = await api.get(`/patients/${patientId}/media`);
    return response.data;
  },

  // Upload document
  uploadDocument: async (patientId: string, formData: FormData) => {
    const response = await api.post(`/patients/${patientId}/media`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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