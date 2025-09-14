/**
 * Centralized Logging Configuration
 * Winston-based logging system with multiple transports and structured formatting
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Log levels (from highest to lowest priority)
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Custom colors for different log levels
export const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about our custom colors
winston.addColors(LOG_COLORS);

/**
 * Environment-based configuration
 */
const environment = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || (environment === 'development' ? 'debug' : 'info');

/**
 * Log directory configuration
 */
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

/**
 * Custom format for development (colorized console output)
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}` +
      (info.splat !== undefined ? `${info.splat}` : " ") +
      (info.stack !== undefined ? `\n${info.stack}` : " ")
  ),
);

/**
 * Custom format for production (structured JSON)
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'quickstock-api',
      environment,
      ...meta
    });
  })
);

/**
 * Console transport configuration
 */
const consoleTransport = new winston.transports.Console({
  format: environment === 'development' ? developmentFormat : productionFormat
});

/**
 * File transport configurations
 */
const fileTransports = [
  // Error logs - separate file for errors only
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    handleExceptions: true,
    handleRejections: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: productionFormat
  }),
  
  // Combined logs - all levels
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    handleExceptions: true,
    handleRejections: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: productionFormat
  }),
  
  // HTTP access logs
  new DailyRotateFile({
    filename: path.join(logDir, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize: '20m',
    maxFiles: '30d',
    format: productionFormat
  })
];

/**
 * Main Winston logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  levels: LOG_LEVELS,
  format: environment === 'development' ? developmentFormat : productionFormat,
  defaultMeta: { 
    service: 'quickstock-api',
    environment,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    consoleTransport,
    ...(environment !== 'test' ? fileTransports : [])
  ],
  exitOnError: false,
});

/**
 * Database logger for SQL queries and database operations
 */
export const dbLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf((info) => {
      return JSON.stringify({
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
        service: 'quickstock-db',
        environment,
        ...info
      });
    })
  ),
  transports: [
    new winston.transports.Console({
      silent: environment === 'production'
    }),
    ...(environment !== 'test' ? [
      new DailyRotateFile({
        filename: path.join(logDir, 'database-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d'
      })
    ] : [])
  ]
});

/**
 * Security logger for authentication and authorization events
 */
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf((info) => {
      return JSON.stringify({
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
        service: 'quickstock-security',
        environment,
        ...info
      });
    })
  ),
  transports: [
    new winston.transports.Console(),
    ...(environment !== 'test' ? [
      new DailyRotateFile({
        filename: path.join(logDir, 'security-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d'
      })
    ] : [])
  ]
});

/**
 * Performance logger for tracking response times and resource usage
 */
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    ...(environment !== 'test' ? [
      new DailyRotateFile({
        filename: path.join(logDir, 'performance-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d'
      })
    ] : [])
  ]
});

/**
 * Stream interface for Morgan HTTP logging
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Utility functions for structured logging
 */
export const logUtils = {
  /**
   * Log user action with context
   */
  logUserAction: (userId: string, action: string, details?: any) => {
    logger.info('User action', {
      userId,
      action,
      details,
      type: 'user_action'
    });
  },

  /**
   * Log API request with metadata
   */
  logApiRequest: (method: string, url: string, userId?: string, ip?: string, userAgent?: string) => {
    logger.http('API Request', {
      method,
      url,
      userId,
      ip,
      userAgent,
      type: 'api_request'
    });
  },

  /**
   * Log API response with timing
   */
  logApiResponse: (method: string, url: string, statusCode: number, responseTime: number, userId?: string) => {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'API Response', {
      method,
      url,
      statusCode,
      responseTime,
      userId,
      type: 'api_response'
    });
  },

  /**
   * Log security event
   */
  logSecurityEvent: (event: string, userId?: string, ip?: string, details?: any) => {
    securityLogger.warn('Security Event', {
      event,
      userId,
      ip,
      details,
      type: 'security_event'
    });
  },

  /**
   * Log authentication event
   */
  logAuth: (event: 'login' | 'logout' | 'register' | 'password_change', userId: string, ip?: string, success: boolean = true) => {
    const level = success ? 'info' : 'warn';
    securityLogger.log(level, `Authentication: ${event}`, {
      event,
      userId,
      ip,
      success,
      type: 'auth_event'
    });
  },

  /**
   * Log database operation
   */
  logDbOperation: (operation: string, table: string, duration?: number, error?: any) => {
    if (error) {
      dbLogger.error('Database Error', {
        operation,
        table,
        duration,
        error: error.message,
        stack: error.stack,
        type: 'db_error'
      });
    } else {
      dbLogger.debug('Database Operation', {
        operation,
        table,
        duration,
        type: 'db_operation'
      });
    }
  },

  /**
   * Log performance metrics
   */
  logPerformance: (metric: string, value: number, unit: string, context?: any) => {
    performanceLogger.info('Performance Metric', {
      metric,
      value,
      unit,
      context,
      type: 'performance_metric'
    });
  },

  /**
   * Log validation error with details
   */
  logValidationError: (field: string, value: any, message: string, userId?: string) => {
    logger.warn('Validation Error', {
      field,
      value,
      message,
      userId,
      type: 'validation_error'
    });
  },

  /**
   * Log business logic error
   */
  logBusinessError: (operation: string, error: string, context?: any, userId?: string) => {
    logger.error('Business Logic Error', {
      operation,
      error,
      context,
      userId,
      type: 'business_error'
    });
  }
};

/**
 * Error logging with context
 */
export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    type: 'application_error'
  });
};

/**
 * Create logs directory if it doesn't exist
 */
import fs from 'fs';
if (environment !== 'test' && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  logger.info(`Created logs directory: ${logDir}`);
}

// Log the logger initialization
logger.info('Logger initialized', {
  level: logLevel,
  environment,
  logDir: environment !== 'test' ? logDir : 'disabled',
  transports: environment !== 'test' ? ['console', 'file'] : ['console']
});

export default logger;
