import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: jwt.JwtPayload;
    }
  }
}

/**
 * Middleware to verify JWT token for protected routes
 */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ 
      message: "Access token required",
      error: "UNAUTHORIZED" 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      message: "Invalid or expired token",
      error: "UNAUTHORIZED" 
    });
  }
}

/**
 * Middleware to check if user has specific role
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Authentication required",
        error: "UNAUTHORIZED" 
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        error: "FORBIDDEN" 
      });
    }

    next();
  };
}

/**
 * Middleware to check if user is active
 */
export function requireActiveUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ 
      message: "Authentication required",
      error: "UNAUTHORIZED" 
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({ 
      message: "Account is deactivated",
      error: "ACCOUNT_DEACTIVATED" 
    });
  }

  next();
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      req.user = decoded;
    } catch (error) {
      // Ignore invalid tokens in optional auth
    }
  }
  
  next();
}
