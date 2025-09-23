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
  address?: {
    streetAddress: string;
    city: string;
    postalCode: string;
    country: string;
    state?: string;
    addressType?: 'SHIPPING' | 'BILLING';
  };
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
  address?: {
    streetAddress: string;
    city: string;
    postalCode: string;
    country: string;
    state?: string;
    addressType?: 'SHIPPING' | 'BILLING';
  };
}

export interface UpdateUserRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'CLIENT' | 'MANAGER' | 'ADMIN';
  isActive?: boolean;
  phone?: string;
}

// User Address types (for CLIENT users only)
export interface UserAddress {
  id: number;
  userId: number;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  state?: string;
  addressType: 'SHIPPING' | 'BILLING';
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAddressRequest {
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  state?: string;
  addressType?: 'SHIPPING' | 'BILLING';
  isDefault?: boolean;
}

export interface UpdateAddressRequest {
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  state?: string;
  addressType?: 'SHIPPING' | 'BILLING';
  isDefault?: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isClient: () => boolean;
  canManageUsers: () => boolean;
  canManageOrders: () => boolean;
  canCreateClients: () => boolean;
}

