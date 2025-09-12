import axios from 'axios';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere il token alle richieste
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor per gestire le risposte e gli errori
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token scaduto o non valido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/users/login', credentials);
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/users/register', userData);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/users/me');
    return response.data;
  },

  async refreshToken(token: string): Promise<AuthResponse> {
    const response = await api.post('/users/refresh', { token });
    return response.data;
  },
};

export default api;
