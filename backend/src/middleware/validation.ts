/**
 * Validation Middleware
 * Generic middleware for request validation using Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Type definition for validation target
 */
export type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

/**
 * Validation options
 */
export interface ValidationOptions {
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

/**
 * Default validation options
 */
const defaultOptions: ValidationOptions = {
  allowUnknown: false,
  stripUnknown: true,
  abortEarly: false
};

/**
 * Generic validation middleware factory
 * Creates middleware for validating different parts of the request
 * 
 * @param schema - Joi validation schema
 * @param target - Part of request to validate (body, query, params, headers)
 * @param options - Validation options
 * @returns Express middleware function
 */
export function validate(
  schema: Joi.Schema,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
) {
  const validationOptions = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Get the data to validate based on target
    let dataToValidate: any;
    switch (target) {
      case 'body':
        dataToValidate = req.body;
        break;
      case 'query':
        dataToValidate = req.query;
        break;
      case 'params':
        dataToValidate = req.params;
        break;
      case 'headers':
        dataToValidate = req.headers;
        break;
      default:
        dataToValidate = req.body;
    }

    // Validate the data
    const { error, value } = schema.validate(dataToValidate, validationOptions);

    if (error) {
      // Format validation errors
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
        timestamp: new Date().toISOString()
      });
    }

    // Replace the original data with validated/sanitized data
    switch (target) {
      case 'body':
        req.body = value;
        break;
      case 'query':
        req.query = value;
        break;
      case 'params':
        req.params = value;
        break;
      case 'headers':
        req.headers = value;
        break;
    }

    next();
  };
}

/**
 * Middleware for validating request body
 */
export function validateBody(schema: Joi.Schema, options?: ValidationOptions) {
  return validate(schema, 'body', options);
}

/**
 * Middleware for validating query parameters
 */
export function validateQuery(schema: Joi.Schema, options?: ValidationOptions) {
  return validate(schema, 'query', options);
}

/**
 * Middleware for validating route parameters
 */
export function validateParams(schema: Joi.Schema, options?: ValidationOptions) {
  return validate(schema, 'params', options);
}

/**
 * Middleware for validating headers
 */
export function validateHeaders(schema: Joi.Schema, options?: ValidationOptions) {
  return validate(schema, 'headers', options);
}

/**
 * Schema for validating integer IDs (auto increment)
 */
export const idSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.integer': 'ID must be a valid integer',
      'number.positive': 'ID must be positive',
      'any.required': 'ID is required'
    })
});

/**
 * Middleware for validating ID parameters
 */
export function validateId() {
  return validateParams(idSchema);
}

/**
 * Sanitization middleware
 * Removes potentially dangerous characters from input
 */
export function sanitizeInput() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Recursive function to sanitize objects
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // Remove HTML tags and trim whitespace
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitize(obj[key]);
          }
        }
        return sanitized;
      }

      return obj;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitize(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitize(req.query);
    }

    next();
  };
}

/**
 * Rate limiting validation
 * Validates rate limiting headers and provides feedback
 */
export function validateRateLimit() {
  return (req: Request, res: Response, next: NextFunction) => {
    const remaining = parseInt(res.get('X-RateLimit-Remaining') || '0');
    const limit = parseInt(res.get('X-RateLimit-Limit') || '0');
    const resetTime = parseInt(res.get('X-RateLimit-Reset') || '0');

    // Add rate limit info to response headers for client awareness
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Reset', resetTime);

    // Log if approaching rate limit
    if (remaining < limit * 0.1) {
      console.warn(`Rate limit warning for IP ${req.ip}: ${remaining}/${limit} requests remaining`);
    }

    next();
  };
}

/**
 * Content-Type validation middleware
 * Ensures JSON content type for POST/PUT/PATCH requests
 */
export function validateContentType() {
  return (req: Request, res: Response, next: NextFunction) => {
    const methods = ['POST', 'PUT', 'PATCH'];
    
    if (methods.includes(req.method)) {
      const contentType = req.get('Content-Type');
      
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json',
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  };
}

/**
 * Request size validation middleware
 * Validates request body size and rejects oversized requests
 */
export function validateRequestSize(maxSizeKB: number = 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = maxSizeKB * 1024;

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        message: `Request too large. Maximum size allowed: ${maxSizeKB}KB`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * Combined validation middleware for common scenarios
 * Combines sanitization, content-type validation, and rate limiting
 */
export function validateRequest(schema?: Joi.Schema, target: ValidationTarget = 'body') {
  const middlewares = [
    sanitizeInput(),
    validateContentType(),
    validateRateLimit()
  ];

  if (schema) {
    middlewares.push(validate(schema, target));
  }

  return middlewares;
}

/**
 * Error handling for validation middleware
 * Catches and formats any validation errors that slip through
 */
export function handleValidationErrors() {
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large',
        timestamp: new Date().toISOString()
      });
    }

    if (error.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        message: 'Request entity too large',
        timestamp: new Date().toISOString()
      });
    }

    next(error);
  };
}
