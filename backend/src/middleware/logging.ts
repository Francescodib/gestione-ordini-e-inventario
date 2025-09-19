/**
 * Logging Middleware
 * Custom middleware for comprehensive request/response logging and performance tracking
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, logUtils, performanceLogger } from '../config/logger';


/**
 * Request ID middleware
 * Adds unique request ID to each request for tracing
 */
export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate unique request ID
    req.requestId = req.get('X-Request-ID') || uuidv4();
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.requestId);
    
    // Store start time for performance tracking
    req.startTime = Date.now();
    
    next();
  };
}

/**
 * Request logging middleware
 * Logs detailed request information
 */
export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const { method, url, headers, query, body } = req;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = headers['user-agent'];
    
    // Extract user info from token if available
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    
    // Store user info for later use
    req.userId = userId;
    req.userRole = userRole;
    
    // Log request start
    logger.info('Request started', {
      requestId: req.requestId,
      method,
      url,
      ip,
      userAgent,
      userId,
      userRole,
      query: Object.keys(query).length > 0 ? query : undefined,
      bodySize: JSON.stringify(body || {}).length,
      timestamp: new Date().toISOString(),
      type: 'request_start'
    });
    
    // Log sensitive data carefully
    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = sanitizeLogData(body);
      logger.debug('Request body', {
        requestId: req.requestId,
        body: sanitizedBody,
        type: 'request_body'
      });
    }
    
    next();
  };
}

/**
 * Response logging middleware
 * Logs response information and performance metrics
 */
export function responseLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response data
    res.json = function(data: any) {
      // Calculate response time
      const responseTime = req.startTime ? Date.now() - req.startTime : 0;
      
      // Determine log level based on status code
      const logLevel = res.statusCode >= 500 ? 'error' :
                      res.statusCode >= 400 ? 'warn' : 'info';
      
      // Log response
      logger.log(logLevel, 'Request completed', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        userId: req.userId,
        userRole: req.userRole,
        contentLength: JSON.stringify(data || {}).length,
        timestamp: new Date().toISOString(),
        type: 'request_complete'
      });
      
      // Log performance metrics
      performanceLogger.info('Response Time', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        responseTime,
        statusCode: res.statusCode,
        userId: req.userId,
        type: 'performance_metric'
      });
      
      // Log slow requests (> 1 second)
      if (responseTime > 1000) {
        logger.warn('Slow request detected', {
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          responseTime,
          userId: req.userId,
          type: 'slow_request'
        });
      }
      
      // Log error responses with details
      if (res.statusCode >= 400) {
        const sanitizedData = sanitizeLogData(data);
        logger.warn('Error response', {
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseData: sanitizedData,
          userId: req.userId,
          type: 'error_response'
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Error logging middleware
 * Comprehensive error logging with context
 */
export function errorLoggingMiddleware() {
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    
    // Log error with full context
    logger.error('Request error', {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      userId: req.userId,
      userRole: req.userRole,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      responseTime,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'request_error'
    });
    
    next(error);
  };
}

/**
 * Database operation logging middleware
 * Logs database operations with timing
 */
export function dbLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original console methods for Prisma logging
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    // Override console methods to capture Prisma logs
    console.log = (...args: any[]) => {
      // Check if it's a Prisma query log
      if (args[0] && typeof args[0] === 'string' && args[0].includes('prisma:query')) {
        logUtils.logDbOperation('query', 'prisma', undefined, undefined);
      }
      originalConsoleLog.apply(console, args);
    };
    
    console.error = (...args: any[]) => {
      // Check if it's a Prisma error
      if (args[0] && typeof args[0] === 'string' && args[0].includes('prisma')) {
        logUtils.logDbOperation('error', 'prisma', undefined, args[0]);
      }
      originalConsoleError.apply(console, args);
    };
    
    next();
  };
}

/**
 * Security event logging middleware
 * Logs security-related events
 */
export function securityLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const { method, url, headers } = req;
    const ip = req.ip;
    
    // Log potential security threats
    const suspiciousPatterns = [
      /sql/i, /script/i, /select\s+/i, /union\s+/i, /drop\s+/i,
      /<script/i, /javascript:/i, /onclick/i, /onerror/i
    ];
    
    // Check URL for suspicious patterns
    const urlSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
    
    // Check headers for suspicious content
    const headersSuspicious = Object.values(headers).some(value => 
      typeof value === 'string' && suspiciousPatterns.some(pattern => pattern.test(value))
    );
    
    if (urlSuspicious || headersSuspicious) {
      logUtils.logSecurityEvent('suspicious_request', req.userId, ip, {
        method,
        url,
        headers: sanitizeLogData(headers),
        reason: urlSuspicious ? 'suspicious_url' : 'suspicious_headers'
      });
    }
    
    // Log failed authentication attempts
    if (url.includes('/login') && method === 'POST') {
      const originalJson = res.json;
      res.json = function(data: any) {
        if (res.statusCode === 401 || res.statusCode === 400) {
          logUtils.logSecurityEvent('failed_login', undefined, ip, {
            email: req.body?.email,
            reason: data?.message || 'authentication_failed'
          });
        }
        return originalJson.call(this, data);
      };
    }
    
    next();
  };
}

/**
 * User activity logging middleware
 * Logs user actions for audit trails
 */
export function userActivityLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const { method, url } = req;
    
    // Only log for authenticated users
    if (!req.userId) {
      return next();
    }
    
    // Define actions to log
    const actionsToLog = [
      { pattern: /\/users\/\w+/, methods: ['PUT', 'PATCH'], action: 'user_update' },
      { pattern: /\/users\/\w+/, methods: ['DELETE'], action: 'user_delete' },
      { pattern: /\/products/, methods: ['POST'], action: 'product_create' },
      { pattern: /\/products\/\w+/, methods: ['PUT', 'PATCH'], action: 'product_update' },
      { pattern: /\/products\/\w+/, methods: ['DELETE'], action: 'product_delete' },
      { pattern: /\/orders/, methods: ['POST'], action: 'order_create' },
      { pattern: /\/orders\/\w+/, methods: ['PUT', 'PATCH'], action: 'order_update' },
      { pattern: /\/orders\/\w+\/cancel/, methods: ['POST'], action: 'order_cancel' }
    ];
    
    // Check if current request matches any action to log
    const matchedAction = actionsToLog.find(actionDef => 
      actionDef.pattern.test(url) && actionDef.methods.includes(method)
    );
    
    if (matchedAction) {
      // Store action for logging after response
      res.on('finish', () => {
        if (res.statusCode < 400) {
          logUtils.logUserAction(req.userId!, matchedAction.action, {
            method,
            url,
            statusCode: res.statusCode,
            userRole: req.userRole
          });
        }
      });
    }
    
    next();
  };
}

/**
 * Sanitize sensitive data for logging
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password', 'token', 'authorization', 'cookie', 'secret', 
    'key', 'private', 'confidential', 'ssn', 'creditcard'
  ];
  
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  });
  
  return sanitized;
}

/**
 * Health check logging (lightweight)
 */
export function healthCheckLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip detailed logging for health checks to reduce noise
    if (req.url === '/health' || req.url === '/ping') {
      req.skipLogging = true;
    }
    
    next();
  };
}

/**
 * Install UUID dependency
 */
export async function installUuidDependency() {
  // This function is a placeholder to remind us to install uuid
  // It should be called during setup
  logger.info('UUID dependency should be installed: npm install uuid @types/uuid');
}
