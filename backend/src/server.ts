/**
 * Server principale dell'applicazione Express con Sequelize + SQLite
 * Configura il server HTTP, database, middleware e rotte per la gestione ordini e inventario
 */

import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";

// Logging
import { logger, morganStream } from "./config/logger";
import {
  requestIdMiddleware,
  requestLoggingMiddleware,
  responseLoggingMiddleware,
  errorLoggingMiddleware,
  securityLoggingMiddleware,
  userActivityLoggingMiddleware,
  healthCheckLoggingMiddleware
} from "./middleware/logging";

// Database
import { connectDatabase, checkDatabaseHealth, disconnectDatabase, syncModels, getDatabaseInfo } from "./config/database";
import { createDemoUserIfNeeded } from "./scripts/createDemoUser";

// Directory Setup
import { setupRequiredDirectories } from "./utils/directorySetup";

// Routes
import usersRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import orderRoutes from "./routes/orderRoutes";
import searchRoutes from "./routes/searchRoutes";
import fileRoutes from "./routes/fileRoutes";
import backupRoutes from "./routes/backupRoutes";
import monitoringRoutes, { setMonitoringServices } from "./routes/monitoringRoutes";

// Middleware
import { verifyToken } from "./middleware/auth";
import { corsOptions, rateLimitMiddleware, helmetConfig } from "./config/security";

// Backup System
import { BackupScheduler } from "./services/backupScheduler";
import { backupConfig } from "./config/backup";

// Monitoring System
import { 
  initializeMetricsRegistry, 
  createCustomMetrics, 
  monitoringConfig 
} from "./config/monitoring";
import { SystemMonitoringService } from "./services/systemMonitoringService";
import { AlertService } from "./services/alertService";
import { MonitoringScheduler } from "./services/monitoringScheduler";

// Sequelize models are imported from our models directory

// Caricamento delle variabili d'ambiente dal file .env
dotenv.config();

// Inizializzazione dell'applicazione Express
const app = express();

// Configurazione della porta del server
const PORT = process.env.PORT || 3001;

/**
 * Application Initialization
 * Setup directories, database, and initial data
 */
const initializeApplication = async () => {
  try {
    // 1. Setup required directories first
    console.log('🚀 Initializing application...');
    await setupRequiredDirectories();

    // 2. Connect to database
    await connectDatabase();

    // 3. Sync database models (create/update tables)
    await syncModels();

    // 4. Get database info for debugging
    await getDatabaseInfo();

    // 5. Create demo user if needed (first run)
    await createDemoUserIfNeeded();

    logger.info('✅ Application initialization completed successfully');
  } catch (error) {
    logger.error('❌ Application initialization failed:', error);
    console.error('Initialization error details:', error);
    process.exit(1);
  }
};

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================

// Request ID and basic logging setup (must be first)
app.use(requestIdMiddleware());
app.use(healthCheckLoggingMiddleware());

// Security middleware
app.use(cors(corsOptions));
app.use(helmet(helmetConfig));

// HTTP request logging with Morgan + Winston
app.use(morgan('combined', { stream: morganStream }));

// Compression middleware per ridurre la dimensione delle risposte
app.use(compression());

// Rate limiting middleware
app.use(rateLimitMiddleware);

// Custom logging middleware
app.use(requestLoggingMiddleware());
app.use(responseLoggingMiddleware());
app.use(securityLoggingMiddleware());
app.use(userActivityLoggingMiddleware());

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
app.get("/health", async (_req, res) => {
  try {
    // Verifica connessione database Sequelize
    const dbHealthy = await checkDatabaseHealth();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check error:', error);
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
app.get("/", (_req, res) => {
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
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/monitoring", monitoringRoutes);

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
app.use(errorLoggingMiddleware());
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Server Error:', error);

  // Errori di validazione Sequelize
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: 'Unique Constraint Error',
      message: 'A record with this value already exists',
      timestamp: new Date().toISOString()
    });
  }

  // Errori di record non trovato Sequelize
  if (error.name === 'SequelizeEmptyResultError') {
    return res.status(404).json({
      error: 'Record Not Found',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString()
    });
  }

  // Errori di foreign key constraint Sequelize
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Foreign Key Constraint Error',
      message: 'Invalid reference to related record',
      timestamp: new Date().toISOString()
    });
  }

  // Errori di validazione Sequelize
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
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
    // Initialize application (directories + database)
    await initializeApplication();
    
    // Initialize monitoring system
    let systemMonitoring: SystemMonitoringService;
    let alertService: AlertService;
    let monitoringScheduler: MonitoringScheduler;
    
    try {
      // Initialize Prometheus metrics
      const prometheusClient = initializeMetricsRegistry();
      const customMetrics = createCustomMetrics(prometheusClient);
      
      // Initialize monitoring services
      systemMonitoring = new SystemMonitoringService(customMetrics, monitoringConfig);
      alertService = new AlertService(customMetrics, monitoringConfig);
      monitoringScheduler = MonitoringScheduler.getInstance(monitoringConfig, systemMonitoring, alertService);
      
      // Set monitoring services for routes
      setMonitoringServices(systemMonitoring, alertService, monitoringScheduler);
      
      // Start monitoring scheduler
      monitoringScheduler.initialize();
      
      logger.info('Monitoring system initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize monitoring system', { error: error.message });
    }

    // Initialize backup scheduler
    try {
      const backupScheduler = BackupScheduler.getInstance(backupConfig);
      backupScheduler.initialize();
      logger.info('Backup scheduler initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize backup scheduler', { error: error.message });
    }
    
    // Avvia il server HTTP
    const server = app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check available at: http://localhost:${PORT}/health`);
      logger.info(`Backup system available at: http://localhost:${PORT}/api/backup`);
      logger.info(`Monitoring dashboard at: http://localhost:${PORT}/api/monitoring`);
      logger.info(`Prometheus metrics at: http://localhost:${PORT}/api/monitoring/metrics`);
    });

    // Gestione graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.warn(`Received ${signal}. Shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Shutdown monitoring scheduler
          try {
            if (monitoringScheduler) {
              monitoringScheduler.shutdown();
              logger.info('Monitoring scheduler shutdown completed');
            }
          } catch (error: any) {
            logger.error('Error shutting down monitoring scheduler', { error: error.message });
          }
          
          // Shutdown backup scheduler
          try {
            const backupScheduler = BackupScheduler.getInstance();
            backupScheduler.shutdown();
            logger.info('Backup scheduler shutdown completed');
          } catch (error: any) {
            logger.error('Error shutting down backup scheduler', { error: error.message });
          }
          
          // Chiudi connessione database Sequelize
          await disconnectDatabase();
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Forza chiusura dopo 30 secondi
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Event listeners per graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Avvia il server
startServer();