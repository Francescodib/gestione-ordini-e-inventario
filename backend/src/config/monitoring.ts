/**
 * Monitoring Configuration
 * Configuration for system monitoring, metrics collection, and health checks
 */

import client from 'prom-client';
import { logger } from './logger';

export interface MonitoringConfig {
  // Metrics collection
  metrics: {
    enabled: boolean;
    interval: number; // Collection interval in seconds
    prefix: string;   // Metrics prefix
    labels: Record<string, string>; // Default labels
  };
  
  // Health checks
  healthChecks: {
    enabled: boolean;
    interval: number; // Health check interval in seconds
    timeout: number;  // Health check timeout in milliseconds
    endpoints: string[]; // Internal endpoints to check
  };
  
  // System monitoring
  system: {
    enabled: boolean;
    collectCpu: boolean;
    collectMemory: boolean;
    collectDisk: boolean;
    collectNetwork: boolean;
    collectProcess: boolean;
  };
  
  // Application monitoring
  application: {
    enabled: boolean;
    collectHttp: boolean;
    collectDatabase: boolean;
    collectBackup: boolean;
    collectAuth: boolean;
    collectErrors: boolean;
  };
  
  // Alerts
  alerts: {
    enabled: boolean;
    thresholds: {
      cpuUsage: number;      // CPU usage percentage
      memoryUsage: number;   // Memory usage percentage
      diskUsage: number;     // Disk usage percentage
      responseTime: number;  // Response time in milliseconds
      errorRate: number;     // Error rate percentage
    };
    cooldown: number; // Alert cooldown in minutes
  };
  
  // Retention
  retention: {
    metrics: number;    // Metrics retention in days
    logs: number;       // Logs retention in days
    alerts: number;     // Alerts retention in days
  };
}

/**
 * Default monitoring configuration
 */
export const defaultMonitoringConfig: MonitoringConfig = {
  metrics: {
    enabled: true,
    interval: 15, // Collect every 15 seconds
    prefix: 'quickstock_',
    labels: {
      service: 'inventory-management',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    }
  },
  
  healthChecks: {
    enabled: true,
    interval: 30, // Check every 30 seconds
    timeout: 5000, // 5 second timeout
    endpoints: [
      '/health',
      '/api/backup/health',
      '/api/files/health'
    ]
  },
  
  system: {
    enabled: true,
    collectCpu: true,
    collectMemory: true,
    collectDisk: true,
    collectNetwork: true,
    collectProcess: true
  },
  
  application: {
    enabled: true,
    collectHttp: true,
    collectDatabase: true,
    collectBackup: true,
    collectAuth: true,
    collectErrors: true
  },
  
  alerts: {
    enabled: true,
    thresholds: {
      cpuUsage: 80,      // Alert if CPU > 80%
      memoryUsage: 85,   // Alert if Memory > 85%
      diskUsage: 90,     // Alert if Disk > 90%
      responseTime: 5000, // Alert if response > 5s
      errorRate: 5       // Alert if error rate > 5%
    },
    cooldown: 15 // 15 minutes between same alert type
  },
  
  retention: {
    metrics: 30,  // Keep metrics for 30 days
    logs: 14,     // Keep logs for 14 days
    alerts: 90    // Keep alerts for 90 days
  }
};

/**
 * Load monitoring configuration from environment
 */
export function loadMonitoringConfig(): MonitoringConfig {
  const config = { ...defaultMonitoringConfig };
  
  // Override with environment variables
  if (process.env.MONITORING_ENABLED === 'false') {
    config.metrics.enabled = false;
    config.healthChecks.enabled = false;
    config.system.enabled = false;
    config.application.enabled = false;
  }
  
  if (process.env.MONITORING_METRICS_INTERVAL) {
    config.metrics.interval = parseInt(process.env.MONITORING_METRICS_INTERVAL);
  }
  
  if (process.env.MONITORING_HEALTH_INTERVAL) {
    config.healthChecks.interval = parseInt(process.env.MONITORING_HEALTH_INTERVAL);
  }
  
  if (process.env.MONITORING_CPU_THRESHOLD) {
    config.alerts.thresholds.cpuUsage = parseFloat(process.env.MONITORING_CPU_THRESHOLD);
  }
  
  if (process.env.MONITORING_MEMORY_THRESHOLD) {
    config.alerts.thresholds.memoryUsage = parseFloat(process.env.MONITORING_MEMORY_THRESHOLD);
  }
  
  // Validate configuration
  validateMonitoringConfig(config);
  
  return config;
}

/**
 * Validate monitoring configuration
 */
function validateMonitoringConfig(config: MonitoringConfig): void {
  try {
    // Validate intervals
    if (config.metrics.interval < 5) {
      logger.warn('Metrics interval too low, setting to minimum 5 seconds');
      config.metrics.interval = 5;
    }
    
    if (config.healthChecks.interval < 10) {
      logger.warn('Health check interval too low, setting to minimum 10 seconds');
      config.healthChecks.interval = 10;
    }
    
    // Validate thresholds
    Object.entries(config.alerts.thresholds).forEach(([key, value]) => {
      if (key.includes('Usage') && (value < 0 || value > 100)) {
        throw new Error(`Invalid ${key} threshold: ${value}. Must be between 0-100`);
      }
      if (key === 'responseTime' && value < 100) {
        throw new Error(`Invalid responseTime threshold: ${value}. Must be >= 100ms`);
      }
    });
    
    logger.info('Monitoring configuration validated successfully');
    
  } catch (error: any) {
    logger.error('Monitoring configuration validation failed', { error: error.message });
    throw error;
  }
}

/**
 * Initialize Prometheus metrics registry
 */
export function initializeMetricsRegistry(): typeof client {
  // Clear default metrics registry
  client.register.clear();
  
  // Set default labels
  const config = loadMonitoringConfig();
  client.register.setDefaultLabels(config.metrics.labels);
  
  // Collect default Node.js metrics
  if (config.system.enabled) {
    client.collectDefaultMetrics({
      prefix: config.metrics.prefix,
      register: client.register,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });
  }
  
  logger.info('Prometheus metrics registry initialized');
  
  return client;
}

/**
 * Create custom metrics
 */
export function createCustomMetrics(prometheusClient: typeof client) {
  const config = loadMonitoringConfig();
  const prefix = config.metrics.prefix;
  
  const metrics = {
    // HTTP metrics
    httpRequestsTotal: new prometheusClient.Counter({
      name: `${prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    }),
    
    httpRequestDuration: new prometheusClient.Histogram({
      name: `${prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    }),
    
    // Database metrics
    databaseConnectionsTotal: new prometheusClient.Gauge({
      name: `${prefix}database_connections_total`,
      help: 'Total number of database connections'
    }),
    
    databaseQueryDuration: new prometheusClient.Histogram({
      name: `${prefix}database_query_duration_seconds`,
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    }),
    
    databaseErrorsTotal: new prometheusClient.Counter({
      name: `${prefix}database_errors_total`,
      help: 'Total number of database errors',
      labelNames: ['error_type']
    }),
    
    // Authentication metrics
    authAttemptsTotal: new prometheusClient.Counter({
      name: `${prefix}auth_attempts_total`,
      help: 'Total number of authentication attempts',
      labelNames: ['result'] // success, failure
    }),
    
    authTokensActive: new prometheusClient.Gauge({
      name: `${prefix}auth_tokens_active`,
      help: 'Number of active authentication tokens'
    }),
    
    // Backup metrics
    backupJobsTotal: new prometheusClient.Counter({
      name: `${prefix}backup_jobs_total`,
      help: 'Total number of backup jobs',
      labelNames: ['type', 'status'] // database/files, success/failure
    }),
    
    backupSizeBytes: new prometheusClient.Gauge({
      name: `${prefix}backup_size_bytes`,
      help: 'Size of backups in bytes',
      labelNames: ['type']
    }),
    
    backupDuration: new prometheusClient.Histogram({
      name: `${prefix}backup_duration_seconds`,
      help: 'Backup operation duration in seconds',
      labelNames: ['type'],
      buckets: [1, 5, 10, 30, 60, 300, 600]
    }),
    
    // Application metrics
    usersTotal: new prometheusClient.Gauge({
      name: `${prefix}users_total`,
      help: 'Total number of users',
      labelNames: ['role', 'status'] // ADMIN/CLIENT, active/inactive
    }),
    
    productsTotal: new prometheusClient.Gauge({
      name: `${prefix}products_total`,
      help: 'Total number of products',
      labelNames: ['status'] // ACTIVE/INACTIVE
    }),
    
    ordersTotal: new prometheusClient.Gauge({
      name: `${prefix}orders_total`,
      help: 'Total number of orders',
      labelNames: ['status'] // PENDING/PROCESSING/DELIVERED/CANCELLED
    }),
    
    inventoryValue: new prometheusClient.Gauge({
      name: `${prefix}inventory_value_total`,
      help: 'Total inventory value'
    }),
    
    // System health metrics
    systemHealth: new prometheusClient.Gauge({
      name: `${prefix}system_health`,
      help: 'System health status (1 = healthy, 0 = unhealthy)',
      labelNames: ['component'] // database, backup, auth, etc.
    }),
    
    alertsTotal: new prometheusClient.Counter({
      name: `${prefix}alerts_total`,
      help: 'Total number of alerts triggered',
      labelNames: ['severity', 'component']
    })
  };
  
  logger.info('Custom Prometheus metrics created', {
    metricsCount: Object.keys(metrics).length
  });
  
  return metrics;
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100) / 100}%`;
}

/**
 * Calculate uptime in human readable format
 */
export function formatUptime(uptimeSeconds: number): string {
  // Handle invalid or undefined values
  if (typeof uptimeSeconds !== 'number' || isNaN(uptimeSeconds) || uptimeSeconds < 0) {
    return 'N/A';
  }

  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Monitoring configuration instance
 */
export const monitoringConfig = loadMonitoringConfig();
