export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'manager';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user' | 'manager';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'manager';
  isActive?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'manager';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
