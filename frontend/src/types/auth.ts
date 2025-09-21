export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CLIENT' | 'MANAGER' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date | string;
  avatar?: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
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
  role?: 'CLIENT' | 'MANAGER' | 'ADMIN';
  phone?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  expiresAt?: Date | string;
  message?: string;
}

export interface CreateUserRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'CLIENT' | 'MANAGER' | 'ADMIN';
  phone?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface UpdateUserRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'CLIENT' | 'MANAGER' | 'ADMIN';
  isActive?: boolean;
  phone?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, firstName: string, lastName: string, email: string, password: string, role?: 'CLIENT' | 'MANAGER' | 'ADMIN', addressData?: { phone?: string; streetAddress?: string; city?: string; postalCode?: string; country?: string }) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isClient: () => boolean;
  canManageUsers: () => boolean;
  canManageOrders: () => boolean;
  canCreateClients: () => boolean;
}

