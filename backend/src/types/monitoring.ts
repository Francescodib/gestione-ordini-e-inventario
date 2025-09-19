/**
 * Monitoring and System Types
 * All types related to monitoring, metrics, alerts, and system observability
 */

import { AuditFields } from './common';

/**
 * System metrics interface
 */
export interface SystemMetrics {
  timestamp: Date;
  system: {
    os: string;
    platform: string;
    arch: string;
    uptime: number;
    loadAverage: number[];
  };
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    speed: number;
    usage: number;
    temperature?: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
    swapTotal: number;
    swapUsed: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
  network: {
    interfaces: Array<{
      iface: string;
      operstate: string;
      rx_bytes: number;
      tx_bytes: number;
      rx_sec: number;
      tx_sec: number;
    }>;
  };
  process: {
    pid: number;
    uptime: number;
    cpu: number;
    memory: number;
    memoryPercentage: number;
  };
}

/**
 * Application metrics interface
 */
export interface ApplicationMetrics {
  timestamp: Date;
  database: {
    connectionCount: number;
    activeQueries: number;
    totalQueries: number;
    averageQueryTime: number;
    errorRate: number;
  };
  http: {
    totalRequests: number;
    activeConnections: number;
    averageResponseTime: number;
    errorRate: number;
    requestsPerSecond: number;
  };
  authentication: {
    activeTokens: number;
    loginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    successRate: number;
  };
  backup: {
    lastBackupTime?: Date;
    backupStatus: string;
    totalBackups: number;
    backupSizeTotal: number;
    averageBackupTime: number;
  };
  business: {
    totalUsers: number;
    activeUsers: number;
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    inventoryValue: number;
  };
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: Date;
  responseTime?: number;
  details?: any;
}

/**
 * Alert interface
 */
export interface Alert extends AuditFields {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  title: string;
  description: string;
  metric?: string;
  value?: number;
  threshold?: number;
  status: 'active' | 'acknowledged' | 'resolved';
  resolvedAt?: Date;
  metadata?: any;
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  component: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: Alert['severity'];
  cooldown: number; // minutes
  enabled: boolean;
  description: string;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  metrics: {
    enabled: boolean;
    interval: number;
    prefix: string;
    labels: Record<string, string>;
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoints: string[];
  };
  system: {
    enabled: boolean;
    collectCpu: boolean;
    collectMemory: boolean;
    collectDisk: boolean;
    collectNetwork: boolean;
    collectProcess: boolean;
  };
  application: {
    enabled: boolean;
    collectHttp: boolean;
    collectDatabase: boolean;
    collectBackup: boolean;
    collectAuth: boolean;
    collectErrors: boolean;
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      responseTime: number;
      errorRate: number;
    };
    cooldown: number;
  };
  retention: {
    metrics: number;
    logs: number;
    alerts: number;
  };
}

/**
 * Monitoring job status
 */
export interface MonitoringJob {
  name: string;
  schedule: string;
  active: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'idle' | 'error';
  duration?: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  errors: {
    count: number;
    rate: number;
    types: Record<string, number>;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    network: {
      inbound: number;
      outbound: number;
    };
  };
}

/**
 * Log entry interface
 */
export interface LogEntry extends AuditFields {
  id: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  message: string;
  service: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  stack?: string;
  tags?: string[];
}

/**
 * Audit log entry
 */
export interface AuditLogEntry extends AuditFields {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Security event
 */
export interface SecurityEvent extends AuditFields {
  id: string;
  type: 'login_failed' | 'login_success' | 'logout' | 'password_change' | 'account_locked' | 'suspicious_activity' | 'data_access' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, any>;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  riskScore: number;
}

/**
 * Error tracking
 */
export interface ErrorEvent extends AuditFields {
  id: string;
  name: string;
  message: string;
  stack?: string;
  component: string;
  method?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  environment: string;
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  resolvedAt?: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * API usage metrics
 */
export interface ApiUsageMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  lastAccessed: Date;
  popularityScore: number;
}

/**
 * Database metrics
 */
export interface DatabaseMetrics {
  timestamp: Date;
  connections: {
    active: number;
    idle: number;
    total: number;
    maxUsed: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
    slowQueries: number;
  };
  tables: Array<{
    name: string;
    rows: number;
    size: number;
    indexes: number;
  }>;
  locks: {
    waiting: number;
    acquired: number;
  };
}

/**
 * Cache metrics
 */
export interface CacheMetrics {
  timestamp: Date;
  redis?: {
    connected: boolean;
    usedMemory: number;
    totalMemory: number;
    hitRate: number;
    missRate: number;
    keysCount: number;
    expiredKeys: number;
  };
  memory?: {
    size: number;
    hitRate: number;
    missRate: number;
    evictions: number;
  };
}

/**
 * Real-time metrics
 */
export interface RealTimeMetrics {
  timestamp: Date;
  activeUsers: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorsPerSecond: number;
  avgResponseTime: number;
  queueLength: number;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * SLA (Service Level Agreement) metrics
 */
export interface SLAMetrics {
  period: {
    from: Date;
    to: Date;
  };
  availability: {
    target: number; // percentage
    actual: number; // percentage
    uptime: number; // seconds
    downtime: number; // seconds
    incidents: number;
  };
  performance: {
    responseTimeTarget: number; // ms
    responseTimeActual: number; // ms
    throughputTarget: number; // requests/hour
    throughputActual: number; // requests/hour
  };
  reliability: {
    errorRateTarget: number; // percentage
    errorRateActual: number; // percentage
    mtbf: number; // mean time between failures (hours)
    mttr: number; // mean time to recovery (minutes)
  };
}

/**
 * Monitoring dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  layout: Array<{
    id: string;
    type: 'metric' | 'chart' | 'table' | 'alert' | 'log';
    title: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    config: {
      metric?: string;
      timeRange?: string;
      refreshInterval?: number;
      filters?: Record<string, any>;
      chartType?: 'line' | 'bar' | 'pie' | 'gauge' | 'number';
    };
  }>;
  timeRange: {
    default: string;
    options: string[];
  };
  refreshInterval: number;
  sharing: {
    public: boolean;
    token?: string;
    expiry?: Date;
  };
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams' | 'pagerduty';
  name: string;
  enabled: boolean;
  config: {
    email?: {
      to: string[];
      subject?: string;
      template?: string;
    };
    webhook?: {
      url: string;
      method: 'POST' | 'PUT';
      headers?: Record<string, string>;
      payload?: Record<string, any>;
    };
    slack?: {
      webhook: string;
      channel?: string;
      username?: string;
    };
  };
  rules: {
    severities: Alert['severity'][];
    components: string[];
    timeWindows?: Array<{
      days: string[];
      startTime: string;
      endTime: string;
    }>;
  };
}

/**
 * Incident management
 */
export interface Incident extends AuditFields {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
  assignedTo?: string;
  component: string;
  impactedServices: string[];
  startedAt: Date;
  resolvedAt?: Date;
  rootCause?: string;
  resolution?: string;
  
  // Timeline
  timeline: Array<{
    timestamp: Date;
    type: 'status_change' | 'comment' | 'action';
    user: string;
    message: string;
    visibility: 'internal' | 'public';
  }>;
  
  // Related alerts
  alerts: string[];
  
  // Communication
  statusPage?: {
    published: boolean;
    message?: string;
    affectedComponents: string[];
  };
}

/**
 * Capacity planning metrics
 */
export interface CapacityMetrics {
  timestamp: Date;
  resource: string;
  current: {
    usage: number;
    capacity: number;
    utilization: number; // percentage
  };
  projected: {
    utilizationIn30Days: number;
    capacityNeededIn30Days: number;
    utilizationIn90Days: number;
    capacityNeededIn90Days: number;
  };
  recommendations: Array<{
    type: 'scale_up' | 'scale_down' | 'optimize' | 'monitor';
    message: string;
    urgency: 'low' | 'medium' | 'high';
    estimatedCost?: number;
  }>;
}
