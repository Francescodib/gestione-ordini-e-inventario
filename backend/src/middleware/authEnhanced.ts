/**
 * Enhanced Authentication and Authorization Middleware
 * File: src/middleware/authEnhanced.ts
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models';
import { AuditService } from '../services/auditService';

export interface AuthenticatedUser {
  id: number;       // Add id property for compatibility
  userId: number;
  email: string;
  role: UserRole;
  isActive: boolean;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      auditContext?: {
        ipAddress: string;
        userAgent: string;
      };
    }
  }
}

/**
 * Enhanced JWT verification with audit logging
 */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required',
      error: 'UNAUTHORIZED'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthenticatedUser;

    // Add audit context
    req.user = decoded;
    req.auditContext = {
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    };

    next();
  } catch (error) {
    // Log failed authentication attempt
    AuditService.logSecurityEvent({
      action: 'AUTH_FAILED',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { token: token.substring(0, 10) + '...' }
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: 'UNAUTHORIZED'
    });
  }
}

/**
 * Role-based authorization with escalation prevention
 */
export function authorize(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      });
    }

    if (!roles.includes(req.user.role)) {
      // Log authorization failure
      AuditService.logSecurityEvent({
        action: 'AUTHORIZATION_FAILED',
        userId: req.user.userId,
        ipAddress: req.auditContext?.ipAddress,
        details: {
          requiredRoles: roles,
          userRole: req.user.role,
          endpoint: req.path
        }
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'FORBIDDEN'
      });
    }

    next();
  };
}

/**
 * Self-access control: users can only access their own data
 */
export function requireSelfOrRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      });
    }

    const targetUserId = parseInt(req.params.id || req.params.userId);
    const isSelf = req.user.userId === targetUserId;
    const hasRole = allowedRoles.includes(req.user.role);

    if (!isSelf && !hasRole) {
      AuditService.logSecurityEvent({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        userId: req.user.userId,
        ipAddress: req.auditContext?.ipAddress,
        details: {
          targetUserId,
          endpoint: req.path
        }
      });

      return res.status(403).json({
        success: false,
        message: 'Can only access own data or require elevated permissions',
        error: 'FORBIDDEN'
      });
    }

    next();
  };
}

/**
 * User creation authorization with role escalation prevention
 */
export function requireUserCreationAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
  }

  const targetRole = req.body.role || UserRole.CLIENT;
  const currentUserRole = req.user.role;

  // Business rules for user creation
  const canCreate = (current: UserRole, target: UserRole): boolean => {
    switch (current) {
      case UserRole.ADMIN:
        return true; // Can create any role
      case UserRole.MANAGER:
        return target === UserRole.CLIENT; // Can only create clients
      case UserRole.CLIENT:
        return false; // Cannot create any users
      default:
        return false;
    }
  };

  if (!canCreate(currentUserRole, targetRole)) {
    // Log escalation attempt
    AuditService.logSecurityEvent({
      action: 'PRIVILEGE_ESCALATION_ATTEMPT',
      userId: req.user.userId,
      ipAddress: req.auditContext?.ipAddress,
      details: {
        currentRole: currentUserRole,
        attemptedRole: targetRole,
        endpoint: req.path
      }
    });

    const message = currentUserRole === UserRole.MANAGER
      ? 'Managers can only create CLIENT accounts'
      : currentUserRole === UserRole.CLIENT
      ? 'Clients cannot create user accounts'
      : 'Insufficient permissions for user creation';

    return res.status(403).json({
      success: false,
      message,
      error: 'FORBIDDEN'
    });
  }

  next();
}

/**
 * Role modification authorization
 */
export function requireRoleChangeAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
  }

  const newRole = req.body.role;
  if (!newRole) {
    return next(); // No role change requested
  }

  // Only ADMIN can change roles
  if (req.user.role !== UserRole.ADMIN) {
    AuditService.logSecurityEvent({
      action: 'UNAUTHORIZED_ROLE_CHANGE_ATTEMPT',
      userId: req.user.userId,
      ipAddress: req.auditContext?.ipAddress,
      details: {
        targetRole: newRole,
        targetUserId: req.params.id
      }
    });

    return res.status(403).json({
      success: false,
      message: 'Only administrators can change user roles',
      error: 'FORBIDDEN'
    });
  }

  // Prevent self-demotion
  const targetUserId = parseInt(req.params.id);
  if (req.user.userId === targetUserId && newRole !== UserRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Cannot demote your own admin account',
      error: 'FORBIDDEN'
    });
  }

  next();
}

/**
 * Address access control - only CLIENTs can have addresses
 */
export function requireClientForAddress(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'UNAUTHORIZED'
    });
  }

  const targetUserId = parseInt(req.params.id || req.params.userId);
  const isSelf = req.user.userId === targetUserId;
  const isAdmin = req.user.role === UserRole.ADMIN;

  if (!isSelf && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Can only manage own addresses',
      error: 'FORBIDDEN'
    });
  }

  // Check if user is CLIENT (will be verified at service level too)
  if (isSelf && req.user.role !== UserRole.CLIENT) {
    return res.status(403).json({
      success: false,
      message: 'Only client accounts can have addresses',
      error: 'FORBIDDEN'
    });
  }

  next();
}

/**
 * Rate limiting and request validation middleware
 */
export function validateRequest(req: Request, res: Response, next: NextFunction) {
  // Add request start time for performance monitoring
  (req as any).startTime = Date.now();

  // Validate content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type must be application/json',
        error: 'INVALID_CONTENT_TYPE'
      });
    }
  }

  next();
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

// Export commonly used middleware combinations
export const requireAuth = [verifyToken];
export const requireAdmin = [verifyToken, authorize(UserRole.ADMIN)];
export const requireManager = [verifyToken, authorize([UserRole.ADMIN, UserRole.MANAGER])];
export const requireSelfOrAdmin = [verifyToken, requireSelfOrRole([UserRole.ADMIN])];
export const requireSelfOrManager = [verifyToken, requireSelfOrRole([UserRole.ADMIN, UserRole.MANAGER])];