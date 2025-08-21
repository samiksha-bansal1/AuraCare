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

  // 🔹 Nurse login
  loginNurse: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/staff/login', credentials);
    return response.data;
  },

  // 🔹 Family login
  loginFamily: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/family/login', credentials);
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
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
