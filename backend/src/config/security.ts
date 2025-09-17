// Security configuration

import { CorsOptions } from "cors";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import helmet, { HelmetOptions } from "helmet";

export const corsOptions: CorsOptions = {
  origin: "*", // specificare domini autorizzati
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
};

export const rateLimitMiddleware: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti per finestra temporale
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // più permissivo in sviluppo
  message: "Too many requests, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks and static assets
  skip: (req) => {
    return req.path === '/health' ||
           req.path === '/api/health' ||
           req.path.startsWith('/static/') ||
           req.path.startsWith('/uploads/');
  }
});

export const helmetConfig: HelmetOptions = {
  contentSecurityPolicy: false,
};

