export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'MANAGER';
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date | string;
  avatar?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: 'USER' | 'ADMIN' | 'MANAGER';
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  expiresAt?: Date | string;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, firstName: string, lastName: string, email: string, password: string, role?: 'USER' | 'ADMIN' | 'MANAGER') => Promise<void>;
  logout: () => void;
  loading: boolean;
}

