/**
 * Health Check Routes
 * Basic health and database status endpoints
 */

import express, { Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * GET /health
 * Basic health check endpoint for frontend database service
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const isDbHealthy = await checkDatabaseHealth();

    const healthStatus = {
      status: isDbHealthy ? 'OK' : 'ERROR',
      database: isDbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    if (!isDbHealthy) {
      logger.warn('Health check failed - database disconnected');
      return res.status(503).json(healthStatus);
    }

    res.json(healthStatus);
  } catch (error: any) {
    logger.error('Health check error:', error);

    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
});

/**
 * GET /status
 * Detailed system status (alias for /health)
 */
router.get('/status', async (req: Request, res: Response) => {
  // Forward to main health endpoint
  try {
    const isDbHealthy = await checkDatabaseHealth();

    const healthStatus = {
      status: isDbHealthy ? 'OK' : 'ERROR',
      database: isDbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    if (!isDbHealthy) {
      logger.warn('Status check failed - database disconnected');
      return res.status(503).json(healthStatus);
    }

    res.json(healthStatus);
  } catch (error: any) {
    logger.error('Status check error:', error);

    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
});

export default router;