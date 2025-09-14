/**
 * Authentication and Authorization Types
 * All types related to users, authentication, and authorization
 */

import { UserRole } from '@prisma/client';
import { AuditFields, PaginationQuery, Statistics } from './common';

/**
 * User interface (complete)
 */
export interface User extends AuditFields {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string;
  lastLogin?: Date;
  
  // Profile information
  profile?: UserProfile;
}

/**
 * User profile information
 */
export interface UserProfile {
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  preferences?: {
    language: string;
    timezone: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  bio?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

/**
 * Public user interface (for API responses)
 */
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
}

/**
 * User response interface (alias for backward compatibility)
 */
export type UserResponse = PublicUser;

/**
 * User registration request
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

/**
 * User login request
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * User login response
 */
export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: PublicUser;
  expiresAt: Date;
  message?: string;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Update user profile request
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  profile?: Partial<UserProfile>;
}

/**
 * Create user request (admin only)
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
}

/**
 * User search and filter options
 */
export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  username?: string;
  email?: string;
  createdFrom?: Date | string;
  createdTo?: Date | string;
  lastLoginFrom?: Date | string;
  lastLoginTo?: Date | string;
}

/**
 * User search query
 */
export interface UserSearchQuery extends PaginationQuery {
  q?: string;
  filters?: UserFilters;
}

/**
 * User statistics
 */
export interface UserStatistics extends Statistics {
  byRole: Record<UserRole, number>;
  verified: number;
  unverified: number;
  recentRegistrations: Array<{
    id: string;
    username: string;
    email: string;
    createdAt: Date;
  }>;
  recentLogins: Array<{
    id: string;
    username: string;
    lastLogin: Date;
  }>;
  mostActive: Array<{
    id: string;
    username: string;
    loginCount: number;
    lastLogin: Date;
  }>;
}

/**
 * JWT token payload
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  type?: 'access' | 'refresh';
}

/**
 * Authentication session
 */
export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * User permissions (for fine-grained access control)
 */
export interface UserPermissions {
  // Product permissions
  products: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    manage_stock: boolean;
  };
  
  // Category permissions
  categories: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    reorder: boolean;
  };
  
  // Order permissions
  orders: {
    view: boolean;
    view_all: boolean;
    create: boolean;
    update: boolean;
    cancel: boolean;
    refund: boolean;
  };
  
  // User permissions
  users: {
    view: boolean;
    view_all: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    manage_roles: boolean;
  };
  
  // System permissions
  system: {
    backup: boolean;
    monitoring: boolean;
    settings: boolean;
    logs: boolean;
  };
}

/**
 * Role-based access control
 */
export interface RolePermissions {
  [UserRole.ADMIN]: UserPermissions;
  [UserRole.MANAGER]: UserPermissions;
  [UserRole.USER]: UserPermissions;
}

/**
 * User activity log
 */
export interface UserActivity extends AuditFields {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  
  // Relations
  user?: Pick<User, 'id' | 'username' | 'email'>;
}

/**
 * User authentication provider (for OAuth)
 */
export interface AuthProvider {
  id: string;
  userId: string;
  provider: 'google' | 'facebook' | 'github' | 'microsoft';
  providerId: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Two-factor authentication
 */
export interface TwoFactorAuth {
  id: string;
  userId: string;
  secret: string;
  backupCodes: string[];
  isEnabled: boolean;
  createdAt: Date;
  enabledAt?: Date;
}

/**
 * Account verification
 */
export interface AccountVerification {
  id: string;
  userId: string;
  type: 'email' | 'phone';
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: {
    email: {
      orders: boolean;
      promotions: boolean;
      system: boolean;
    };
    sms: {
      orders: boolean;
      security: boolean;
    };
    push: {
      orders: boolean;
      promotions: boolean;
      system: boolean;
    };
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    allowDataCollection: boolean;
  };
}

/**
 * User bulk operation request
 */
export interface UserBulkOperation {
  action: 'activate' | 'deactivate' | 'verify' | 'delete' | 'changeRole';
  userIds: string[];
  data?: {
    role?: UserRole;
    isActive?: boolean;
    [key: string]: any;
  };
}

/**
 * User export options
 */
export interface UserExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields?: string[];
  filters?: UserFilters;
  includeProfile?: boolean;
  includeActivity?: boolean;
  includePermissions?: boolean;
}

/**
 * User validation result
 */
export interface UserValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
}

/**
 * Account lockout information
 */
export interface AccountLockout {
  id: string;
  userId: string;
  reason: 'failed_login' | 'suspicious_activity' | 'admin_action';
  lockedAt: Date;
  expiresAt?: Date;
  unlockToken?: string;
  isActive: boolean;
}
