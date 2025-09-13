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
  max: 100, // numero massimo di richieste
  message: "Too many requests, please try again later.",
});

export const helmetConfig: HelmetOptions = {
  contentSecurityPolicy: false,
};

