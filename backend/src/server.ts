/**
 * Server principale dell'applicazione Express con MongoDB
 * Configura il server HTTP, database, middleware e rotte per la gestione ordini e inventario
 */

import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";

// Database
import { connectDatabase } from "./config/database";

// Routes
import usersRoutes from "./routes/userRoutes";

// Middleware
import { verifyToken } from "./middleware/auth";
import { corsOptions, rateLimitMiddleware, helmetConfig } from "./config/security";

// Models (importa tutti i modelli per registrarli)
import "./models/User";
import "./models/Category";
import "./models/Product";
import "./models/Order";

// Caricamento delle variabili d'ambiente dal file .env
dotenv.config();

// Inizializzazione dell'applicazione Express
const app = express();

// Configurazione della porta del server
const PORT = process.env.PORT || 3000;

/**
 * Database Connection
 * Connessione al database MongoDB prima di avviare il server
 */
const initializeDatabase = async () => {
  try {
    await connectDatabase();
    console.log('📦 All models registered successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================

// Security middleware
app.use(cors(corsOptions));
app.use(helmet(helmetConfig));

// Logging middleware (solo in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan("dev"));
}

// Compression middleware per ridurre la dimensione delle risposte
app.use(compression());

// Rate limiting middleware
app.use(rateLimitMiddleware);

// Request logging middleware (da rimuovere in produzione)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// ROUTES CONFIGURATION
// ==========================================

/**
 * Health check endpoint
 * Verifica lo stato del server e del database
 */
app.get("/health", async (req, res) => {
  try {
    // Verifica connessione database
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Service temporarily unavailable'
    });
  }
});

/**
 * ROTTA PUBBLICA - Homepage del server
 */
app.get("/", (req, res) => {
  res.json({
    message: "QuickStock Solutions API",
    version: "1.0.0",
    documentation: "/api/docs",
    status: "active"
  });
});

/**
 * ROTTE API - Gestione delle risorse
 */
app.use("/api/users", usersRoutes);

/**
 * ROTTA PROTETTA - Esempio di endpoint che richiede autenticazione
 */
app.get("/protected", verifyToken, (req, res) => {
  res.json({ 
    message: "Access granted to protected route",
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

/**
 * Middleware 404 - Gestione delle rotte non trovate
 */
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

/**
 * Middleware di gestione errori globale
 */
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server Error:', error);

  // Errori di validazione Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err: any) => err.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }

  // Errori di duplicazione (unique constraint)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      error: 'Duplicate Field Error',
      message: `${field} already exists`,
      timestamp: new Date().toISOString()
    });
  }

  // Errori di casting (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'Invalid resource ID format',
      timestamp: new Date().toISOString()
    });
  }

  // JWT Errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Authentication token is invalid',
      timestamp: new Date().toISOString()
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Authentication token has expired',
      timestamp: new Date().toISOString()
    });
  }

  // Errore generico del server
  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong on the server' 
      : error.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ==========================================
// SERVER STARTUP
// ==========================================

/**
 * Avvio del server
 * Prima inizializza il database, poi avvia il server HTTP
 */
const startServer = async () => {
  try {
    // Inizializza il database
    await initializeDatabase();
    
    // Avvia il server HTTP
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
    });

    // Gestione graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);
      
      server.close(async () => {
        console.log('🛑 HTTP server closed');
        
        try {
          // Chiudi connessione database
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          console.log('📦 Database connection closed');
          
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Forza chiusura dopo 30 secondi
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Event listeners per graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Avvia il server
startServer();