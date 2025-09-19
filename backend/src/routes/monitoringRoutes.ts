/**
 * Monitoring API Routes
 * API endpoints for system monitoring, metrics, and health checks
 */

import express, { Request, Response } from 'express';
import client from 'prom-client';
import { logger } from '../config/logger';
import { verifyToken } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { SystemMonitoringService } from '../services/systemMonitoringService';
import { AlertService } from '../services/alertService';
import { MonitoringScheduler } from '../services/monitoringScheduler';
import { formatBytes, formatPercentage, formatUptime } from '../config/monitoring';

const router = express.Router();
router.use(handleValidationErrors());

// Global monitoring services (will be injected by server)
let systemMonitoring: SystemMonitoringService;
let alertService: AlertService;
let monitoringScheduler: MonitoringScheduler;

/**
 * Set monitoring services (called by server initialization)
 */
export function setMonitoringServices(
  sysMonitoring: SystemMonitoringService,
  alerts: AlertService,
  scheduler: MonitoringScheduler
): void {
  systemMonitoring = sysMonitoring;
  alertService = alerts;
  monitoringScheduler = scheduler;
}

/**
 * GET /api/monitoring/health
 * System health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    if (!systemMonitoring) {
      return res.status(503).json({
        success: false,
        message: 'Monitoring system not initialized',
        data: {
          status: 'unavailable',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const healthChecks = await systemMonitoring.performHealthChecks();
    const schedulerStatus = monitoringScheduler.getMonitoringStatus();

    const overallStatus = healthChecks.every(check => check.status === 'healthy') &&
                         schedulerStatus.status === 'healthy' ? 'healthy' : 'degraded';

    const unhealthyChecks = healthChecks.filter(check => check.status === 'unhealthy');
    const degradedChecks = healthChecks.filter(check => check.status === 'degraded');

    // Get system metrics for uptime and other info
    const metricsSummary = systemMonitoring.getMetricsSummary();

    // Fallback to process uptime if system metrics aren't available yet
    const uptime = metricsSummary?.system?.uptime || formatUptime(process.uptime());

    res.json({
      success: true,
      message: 'Health check completed',
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        summary: {
          healthy: healthChecks.filter(check => check.status === 'healthy').length,
          degraded: degradedChecks.length,
          unhealthy: unhealthyChecks.length,
          uptime: uptime,
          memoryUsage: metricsSummary?.system?.memory ? parseFloat(metricsSummary.system.memory.replace('%', '')) : 0,
          diskUsage: metricsSummary?.system?.disk ? parseFloat(metricsSummary.system.disk.replace('%', '')) : 0
        },
        components: healthChecks.map(check => ({
          component: check.component,
          status: check.status,
          message: check.message,
          responseTime: check.responseTime
        })),
        monitoring: {
          scheduler: schedulerStatus.status,
          activeJobs: schedulerStatus.activeJobs,
          errorJobs: schedulerStatus.errorJobs
        }
      }
    });
    
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      data: {
        status: 'error',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/monitoring/metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (error: any) {
    logger.error('Failed to collect metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to collect metrics',
      error: error.message
    });
  }
});

/**
 * GET /api/monitoring/system
 * System metrics endpoint (Admin/Manager only)
 */
router.get('/system',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin or Manager access required'
        });
      }
      
      if (!systemMonitoring) {
        return res.status(503).json({
          success: false,
          message: 'System monitoring not available'
        });
      }
      
      const systemMetrics = await systemMonitoring.collectSystemMetrics();
      
      // Format metrics for display
      const formattedMetrics = {
        timestamp: systemMetrics.timestamp,
        system: {
          ...systemMetrics.system,
          uptime: formatUptime(systemMetrics.system.uptime)
        },
        cpu: {
          ...systemMetrics.cpu,
          usage: formatPercentage(systemMetrics.cpu.usage)
        },
        memory: {
          total: formatBytes(systemMetrics.memory.total),
          free: formatBytes(systemMetrics.memory.free),
          used: formatBytes(systemMetrics.memory.used),
          usagePercentage: formatPercentage(systemMetrics.memory.usagePercentage),
          swapTotal: formatBytes(systemMetrics.memory.swapTotal),
          swapUsed: formatBytes(systemMetrics.memory.swapUsed)
        },
        disk: {
          total: formatBytes(systemMetrics.disk.total),
          free: formatBytes(systemMetrics.disk.free),
          used: formatBytes(systemMetrics.disk.used),
          usagePercentage: formatPercentage(systemMetrics.disk.usagePercentage)
        },
        process: {
          ...systemMetrics.process,
          uptime: formatUptime(systemMetrics.process.uptime),
          memory: formatBytes(systemMetrics.process.memory),
          memoryPercentage: formatPercentage(systemMetrics.process.memoryPercentage)
        }
      };
      
      res.json({
        success: true,
        data: formattedMetrics
      });
      
    } catch (error: any) {
      logger.error('Failed to get system metrics', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get system metrics',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/monitoring/application
 * Application metrics endpoint (Admin/Manager only)
 */
router.get('/application',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin or Manager access required'
        });
      }
      
      if (!systemMonitoring) {
        return res.status(503).json({
          success: false,
          message: 'Application monitoring not available'
        });
      }
      
      const applicationMetrics = await systemMonitoring.collectApplicationMetrics();
      
      res.json({
        success: true,
        data: applicationMetrics
      });
      
    } catch (error: any) {
      logger.error('Failed to get application metrics', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get application metrics',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/monitoring/dashboard
 * Monitoring dashboard data (Admin/Manager only)
 */
router.get('/dashboard',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin or Manager access required'
        });
      }
      
      if (!systemMonitoring || !alertService || !monitoringScheduler) {
        return res.status(503).json({
          success: false,
          message: 'Monitoring services not available'
        });
      }
      
      // Get latest metrics and status
      const [
        healthChecks,
        metricsSummary,
        activeAlerts,
        schedulerStatus,
        alertStats
      ] = await Promise.all([
        systemMonitoring.performHealthChecks(),
        systemMonitoring.getMetricsSummary(),
        Promise.resolve(alertService.getActiveAlerts()),
        Promise.resolve(monitoringScheduler.getMonitoringStatus()),
        Promise.resolve(alertService.getAlertStatistics())
      ]);
      
      const dashboard = {
        timestamp: new Date().toISOString(),
        
        // Overall status
        status: {
          overall: healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded',
          components: healthChecks.length,
          healthy: healthChecks.filter(check => check.status === 'healthy').length,
          degraded: healthChecks.filter(check => check.status === 'degraded').length,
          unhealthy: healthChecks.filter(check => check.status === 'unhealthy').length
        },
        
        // System overview
        system: metricsSummary.system || {
          cpu: 'N/A',
          memory: 'N/A',
          disk: 'N/A',
          uptime: 'N/A'
        },
        
        // Application overview
        application: metricsSummary.application || {
          users: 0,
          products: 0,
          orders: 0,
          revenue: 0
        },
        
        // Alerts summary
        alerts: {
          active: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length,
          high: activeAlerts.filter(a => a.severity === 'high').length,
          medium: activeAlerts.filter(a => a.severity === 'medium').length,
          low: activeAlerts.filter(a => a.severity === 'low').length,
          statistics: alertStats
        },
        
        // Monitoring status
        monitoring: {
          scheduler: schedulerStatus.status,
          jobs: schedulerStatus.totalJobs,
          activeJobs: schedulerStatus.activeJobs,
          errorJobs: schedulerStatus.errorJobs,
          configuration: schedulerStatus.configuration
        },
        
        // Recent health checks
        healthChecks: healthChecks.map(check => ({
          component: check.component,
          status: check.status,
          message: check.message,
          responseTime: check.responseTime,
          timestamp: check.timestamp
        }))
      };
      
      res.json({
        success: true,
        data: dashboard
      });
      
    } catch (error: any) {
      logger.error('Failed to get dashboard data', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard data',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/monitoring/alerts
 * Get alerts (Admin only)
 */
router.get('/alerts',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check admin permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required'
        });
      }
      
      if (!alertService) {
        return res.status(503).json({
          success: false,
          message: 'Alert service not available'
        });
      }
      
      const { status, severity, component, limit = 100 } = req.query;
      
      let alerts;
      
      if (status === 'active') {
        alerts = alertService.getActiveAlerts();
      } else if (severity) {
        alerts = alertService.getAlertsBySeverity(severity as any);
      } else if (component) {
        alerts = alertService.getAlertsByComponent(component as string);
      } else {
        alerts = alertService.getAlertHistory(Number(limit));
      }
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
      
    } catch (error: any) {
      logger.error('Failed to get alerts', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get alerts',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/monitoring/alerts/:alertId/acknowledge
 * Acknowledge an alert (Admin only)
 */
router.post('/alerts/:alertId/acknowledge',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check admin permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required'
        });
      }
      
      if (!alertService) {
        return res.status(503).json({
          success: false,
          message: 'Alert service not available'
        });
      }
      
      const { alertId } = req.params;
      const acknowledged = alertService.acknowledgeAlert(alertId);
      
      if (acknowledged) {
        logger.info('Alert acknowledged', { alertId, userId: req.user?.id });
        
        res.json({
          success: true,
          message: 'Alert acknowledged successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }
      
    } catch (error: any) {
      logger.error('Failed to acknowledge alert', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alert',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/monitoring/alerts/:alertId/resolve
 * Resolve an alert (Admin only)
 */
router.post('/alerts/:alertId/resolve',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check admin permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required'
        });
      }
      
      if (!alertService) {
        return res.status(503).json({
          success: false,
          message: 'Alert service not available'
        });
      }
      
      const { alertId } = req.params;
      const resolved = alertService.resolveAlert(alertId);
      
      if (resolved) {
        logger.info('Alert resolved', { alertId, userId: req.user?.id });
        
        res.json({
          success: true,
          message: 'Alert resolved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Alert not found'
        });
      }
      
    } catch (error: any) {
      logger.error('Failed to resolve alert', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to resolve alert',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/monitoring/alerts/test
 * Create test alert (Admin only)
 */
router.post('/alerts/test',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check admin permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required'
        });
      }
      
      if (!alertService) {
        return res.status(503).json({
          success: false,
          message: 'Alert service not available'
        });
      }
      
      const testAlert = alertService.createTestAlert();
      
      logger.info('Test alert created', { alertId: testAlert.id, userId: req.user?.id });
      
      res.status(201).json({
        success: true,
        message: 'Test alert created successfully',
        data: testAlert
      });
      
    } catch (error: any) {
      logger.error('Failed to create test alert', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to create test alert',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/monitoring/jobs
 * Get monitoring jobs status (Admin only)
 */
router.get('/jobs',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check admin permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required'
        });
      }
      
      if (!monitoringScheduler) {
        return res.status(503).json({
          success: false,
          message: 'Monitoring scheduler not available'
        });
      }
      
      const jobs = monitoringScheduler.getAllJobsStatus();
      
      res.json({
        success: true,
        data: jobs
      });
      
    } catch (error: any) {
      logger.error('Failed to get monitoring jobs', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get monitoring jobs',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/monitoring/jobs/:jobName/trigger
 * Manually trigger a monitoring job (Admin only)
 */
router.post('/jobs/:jobName/trigger',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check admin permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required'
        });
      }
      
      if (!monitoringScheduler) {
        return res.status(503).json({
          success: false,
          message: 'Monitoring scheduler not available'
        });
      }
      
      const { jobName } = req.params;
      
      logger.info('Manual monitoring job trigger requested', { 
        userId: req.user?.id,
        jobName
      });
      
      const result = await monitoringScheduler.triggerJob(jobName);
      
      if (result.success) {
        res.json({
          success: true,
          message: `Monitoring job ${jobName} triggered successfully`
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to trigger monitoring job ${jobName}`,
          error: result.error
        });
      }
      
    } catch (error: any) {
      logger.error('Manual monitoring job trigger failed', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to trigger monitoring job',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/monitoring/stats
 * Get monitoring statistics (Admin only)
 */
router.get('/stats',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check admin permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required'
        });
      }
      
      if (!systemMonitoring || !alertService || !monitoringScheduler) {
        return res.status(503).json({
          success: false,
          message: 'Monitoring services not available'
        });
      }
      
      const [
        metricsSummary,
        alertStats,
        schedulerStatus
      ] = await Promise.all([
        Promise.resolve(systemMonitoring.getMetricsSummary()),
        Promise.resolve(alertService.getAlertStatistics()),
        Promise.resolve(monitoringScheduler.getMonitoringStatus())
      ]);
      
      const stats = {
        timestamp: new Date().toISOString(),
        
        system: metricsSummary.system,
        application: metricsSummary.application,
        
        alerts: alertStats,
        
        monitoring: {
          status: schedulerStatus.status,
          uptime: process.uptime(),
          jobs: {
            total: schedulerStatus.totalJobs,
            active: schedulerStatus.activeJobs,
            error: schedulerStatus.errorJobs
          },
          configuration: schedulerStatus.configuration
        }
      };
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error: any) {
      logger.error('Failed to get monitoring statistics', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get monitoring statistics',
        error: error.message
      });
    }
  }
);

export default router;
