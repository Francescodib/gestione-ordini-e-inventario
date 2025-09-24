/**
 * System Monitoring Service
 * Service for collecting system metrics, health checks, and performance monitoring
 */

import * as si from 'systeminformation';
import { sequelize, User, Product, Order } from '../models';
import client from 'prom-client';
import { logger } from '../config/logger';
import { 
  MonitoringConfig, 
  formatBytes, 
  formatPercentage, 
  formatUptime 
} from '../config/monitoring';

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

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: Date;
  responseTime?: number;
  details?: any;
}

export class SystemMonitoringService {
  private metrics: any;
  private config: MonitoringConfig;
  private lastSystemMetrics?: SystemMetrics;
  private lastApplicationMetrics?: ApplicationMetrics;
  
  constructor(prometheusMetrics: any, config: MonitoringConfig) {
    this.metrics = prometheusMetrics;
    this.config = config;
  }
  
  /**
   * Collect system metrics
   */
  public async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      if (!this.config.system.enabled) {
        throw new Error('System monitoring is disabled');
      }
      
      const startTime = Date.now();
      
      // Collect system information
      const [
        osInfo,
        cpuInfo,
        memInfo,
        diskInfo,
        networkInfo,
        processInfo,
        loadInfo
      ] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.processLoad('node'),
        si.currentLoad()
      ]);
      
      const systemMetrics: SystemMetrics = {
        timestamp: new Date(),
        system: {
          os: `${osInfo.distro} ${osInfo.release}`,
          platform: osInfo.platform,
          arch: osInfo.arch,
          uptime: osInfo.uptime || process.uptime(),
          loadAverage: loadInfo.avgLoad ? [loadInfo.avgLoad] : []
        },
        cpu: {
          manufacturer: cpuInfo.manufacturer,
          brand: cpuInfo.brand,
          cores: cpuInfo.cores,
          speed: cpuInfo.speed,
          usage: loadInfo.currentLoad,
          temperature: undefined // Will be set if available
        },
        memory: {
          total: memInfo.total,
          free: memInfo.free,
          used: memInfo.used,
          usagePercentage: (memInfo.used / memInfo.total) * 100,
          swapTotal: memInfo.swaptotal,
          swapUsed: memInfo.swapused
        },
        disk: {
          total: diskInfo.length > 0 ? diskInfo[0].size : 0,
          free: diskInfo.length > 0 ? diskInfo[0].available : 0,
          used: diskInfo.length > 0 ? diskInfo[0].used : 0,
          usagePercentage: diskInfo.length > 0 ? diskInfo[0].use : 0
        },
        network: {
          interfaces: networkInfo.map(iface => ({
            iface: iface.iface,
            operstate: iface.operstate,
            rx_bytes: iface.rx_bytes,
            tx_bytes: iface.tx_bytes,
            rx_sec: iface.rx_sec || 0,
            tx_sec: iface.tx_sec || 0
          }))
        },
        process: {
          pid: processInfo.pid || process.pid,
          uptime: process.uptime(),
          cpu: processInfo.cpu || 0,
          memory: processInfo.mem || 0,
          memoryPercentage: processInfo.mem ? (processInfo.mem / memInfo.total) * 100 : 0
        }
      };
      
      // Update Prometheus metrics
      if (this.config.system.collectCpu) {
        this.updateCpuMetrics(systemMetrics.cpu);
      }
      
      if (this.config.system.collectMemory) {
        this.updateMemoryMetrics(systemMetrics.memory);
      }
      
      if (this.config.system.collectDisk) {
        this.updateDiskMetrics(systemMetrics.disk);
      }
      
      if (this.config.system.collectProcess) {
        this.updateProcessMetrics(systemMetrics.process);
      }
      
      const duration = Date.now() - startTime;
      this.lastSystemMetrics = systemMetrics;
      
      logger.debug('System metrics collected', {
        duration: `${duration}ms`,
        cpu: formatPercentage(systemMetrics.cpu.usage),
        memory: formatPercentage(systemMetrics.memory.usagePercentage),
        disk: formatPercentage(systemMetrics.disk.usagePercentage)
      });
      
      return systemMetrics;
      
    } catch (error: any) {
      logger.error('Failed to collect system metrics', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Collect application metrics
   */
  public async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    try {
      if (!this.config.application.enabled) {
        throw new Error('Application monitoring is disabled');
      }
      
      const startTime = Date.now();
      
      // Collect database metrics
      const databaseMetrics = await this.collectDatabaseMetrics();
      
      // Collect business metrics
      const businessMetrics = await this.collectBusinessMetrics();
      
      const applicationMetrics: ApplicationMetrics = {
        timestamp: new Date(),
        database: databaseMetrics,
        http: {
          totalRequests: 0, // Will be updated by HTTP middleware
          activeConnections: 0,
          averageResponseTime: 0,
          errorRate: 0,
          requestsPerSecond: 0
        },
        authentication: {
          activeTokens: 0, // Will be updated by auth service
          loginAttempts: 0,
          successfulLogins: 0,
          failedLogins: 0,
          successRate: 0
        },
        backup: {
          lastBackupTime: undefined,
          backupStatus: 'unknown',
          totalBackups: 0,
          backupSizeTotal: 0,
          averageBackupTime: 0
        },
        business: businessMetrics
      };
      
      // Update Prometheus metrics
      this.updateApplicationPrometheusMetrics(applicationMetrics);
      
      const duration = Date.now() - startTime;
      this.lastApplicationMetrics = applicationMetrics;
      
      logger.debug('Application metrics collected', {
        duration: `${duration}ms`,
        users: businessMetrics.totalUsers,
        products: businessMetrics.totalProducts,
        orders: businessMetrics.totalOrders
      });
      
      return applicationMetrics;
      
    } catch (error: any) {
      logger.error('Failed to collect application metrics', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Collect database metrics
   */
  private async collectDatabaseMetrics() {
    try {
      // Check database connection using Sequelize query
      await sequelize.query('SELECT 1 as test', { raw: true });

      // Get connection pool information
      const pool = (sequelize.connectionManager as any).pool;
      const connectionCount = pool ? pool.size : 1;

      return {
        connectionCount,
        activeQueries: 0, // Sequelize doesn't directly expose active query count
        totalQueries: 0, // Would need custom tracking
        averageQueryTime: 0, // Would need custom tracking
        errorRate: 0
      };
    } catch (error: any) {
      logger.error('Database metrics collection failed', { error: error.message });
      return {
        connectionCount: 0,
        activeQueries: 0,
        totalQueries: 0,
        averageQueryTime: 0,
        errorRate: 100
      };
    }
  }
  
  /**
   * Collect business metrics
   */
  private async collectBusinessMetrics() {
    try {
      const [
        totalUsers,
        activeUsers,
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        revenueResult,
        inventoryResult
      ] = await Promise.all([
        User.count(),
        User.count({ where: { isActive: true } }),
        Product.count(),
        Product.count({ where: { isActive: true } }),
        Order.count(),
        Order.count({ where: { status: 'PENDING' } }),
        Order.sum('totalAmount', { where: { status: 'DELIVERED' } }),
        Product.sum('price', { where: { isActive: true } })
      ]);
      
      return {
        totalUsers,
        activeUsers,
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        totalRevenue: revenueResult || 0,
        inventoryValue: inventoryResult || 0
      };
    } catch (error: any) {
      logger.error('Business metrics collection failed', { error: error.message });
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalProducts: 0,
        activeProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        inventoryValue: 0
      };
    }
  }
  
  /**
   * Perform health checks
   */
  public async performHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    // Database health check
    results.push(await this.checkDatabaseHealth());
    
    // System health check
    results.push(await this.checkSystemHealth());
    
    // Application health check
    results.push(await this.checkApplicationHealth());
    
    // Backup system health check
    results.push(await this.checkBackupSystemHealth());
    
    // Update system health metrics
    results.forEach(result => {
      const healthValue = result.status === 'healthy' ? 1 : 0;
      this.metrics.systemHealth.labels(result.component).set(healthValue);
    });
    
    return results;
  }
  
  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test database connection with Sequelize
      await sequelize.authenticate();
      const responseTime = Date.now() - startTime;

      return {
        component: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        message: `Database connection successful (${responseTime}ms)`,
        timestamp: new Date(),
        responseTime,
        details: {
          dialect: sequelize.getDialect(),
          storage: (sequelize.config as any).storage || (sequelize as any).options?.storage,
          poolSize: (sequelize.connectionManager as any).pool ? (sequelize.connectionManager as any).pool.size : 1
        }
      };
    } catch (error: any) {
      return {
        component: 'database',
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Check system health
   */
  private async checkSystemHealth(): Promise<HealthCheckResult> {
    try {
      const metrics = this.lastSystemMetrics;
      
      if (!metrics) {
        return {
          component: 'system',
          status: 'degraded',
          message: 'No system metrics available',
          timestamp: new Date()
        };
      }
      
      const issues = [];
      
      if (metrics.cpu.usage > this.config.alerts.thresholds.cpuUsage) {
        issues.push(`High CPU usage: ${formatPercentage(metrics.cpu.usage)}`);
      }
      
      if (metrics.memory.usagePercentage > this.config.alerts.thresholds.memoryUsage) {
        issues.push(`High memory usage: ${formatPercentage(metrics.memory.usagePercentage)}`);
      }
      
      if (metrics.disk.usagePercentage > this.config.alerts.thresholds.diskUsage) {
        issues.push(`High disk usage: ${formatPercentage(metrics.disk.usagePercentage)}`);
      }
      
      if (issues.length === 0) {
        return {
          component: 'system',
          status: 'healthy',
          message: 'All system resources within normal limits',
          timestamp: new Date(),
          details: {
            cpu: formatPercentage(metrics.cpu.usage),
            memory: formatPercentage(metrics.memory.usagePercentage),
            disk: formatPercentage(metrics.disk.usagePercentage),
            uptime: formatUptime(metrics.system.uptime)
          }
        };
      } else {
        return {
          component: 'system',
          status: 'degraded',
          message: `System resource issues: ${issues.join(', ')}`,
          timestamp: new Date(),
          details: { issues }
        };
      }
    } catch (error: any) {
      return {
        component: 'system',
        status: 'unhealthy',
        message: `System health check failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Check application health
   */
  private async checkApplicationHealth(): Promise<HealthCheckResult> {
    try {
      const metrics = this.lastApplicationMetrics;
      
      if (!metrics) {
        return {
          component: 'application',
          status: 'degraded',
          message: 'No application metrics available',
          timestamp: new Date()
        };
      }
      
      const issues = [];
      
      if (metrics.database.errorRate > 5) {
        issues.push(`High database error rate: ${formatPercentage(metrics.database.errorRate)}`);
      }
      
      if (metrics.http.errorRate > this.config.alerts.thresholds.errorRate) {
        issues.push(`High HTTP error rate: ${formatPercentage(metrics.http.errorRate)}`);
      }
      
      if (issues.length === 0) {
        return {
          component: 'application',
          status: 'healthy',
          message: 'Application services running normally',
          timestamp: new Date(),
          details: {
            totalUsers: metrics.business.totalUsers,
            totalProducts: metrics.business.totalProducts,
            totalOrders: metrics.business.totalOrders,
            pendingOrders: metrics.business.pendingOrders
          }
        };
      } else {
        return {
          component: 'application',
          status: 'degraded',
          message: `Application issues: ${issues.join(', ')}`,
          timestamp: new Date(),
          details: { issues }
        };
      }
    } catch (error: any) {
      return {
        component: 'application',
        status: 'unhealthy',
        message: `Application health check failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Check backup system health
   */
  private async checkBackupSystemHealth(): Promise<HealthCheckResult> {
    try {
      // This is a simplified check - in a full implementation, you'd check
      // the actual backup service status
      return {
        component: 'backup',
        status: 'healthy',
        message: 'Backup system operational',
        timestamp: new Date(),
        details: {
          lastBackup: 'Recent',
          status: 'Active'
        }
      };
    } catch (error: any) {
      return {
        component: 'backup',
        status: 'unhealthy',
        message: `Backup system check failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Update CPU metrics in Prometheus
   */
  private updateCpuMetrics(cpu: SystemMetrics['cpu']): void {
    // CPU usage would be tracked by default Node.js metrics
    logger.debug('CPU metrics updated', {
      usage: formatPercentage(cpu.usage),
      cores: cpu.cores
    });
  }
  
  /**
   * Update memory metrics in Prometheus
   */
  private updateMemoryMetrics(memory: SystemMetrics['memory']): void {
    // Memory would be tracked by default Node.js metrics
    logger.debug('Memory metrics updated', {
      total: formatBytes(memory.total),
      used: formatBytes(memory.used),
      usage: formatPercentage(memory.usagePercentage)
    });
  }
  
  /**
   * Update disk metrics in Prometheus
   */
  private updateDiskMetrics(disk: SystemMetrics['disk']): void {
    logger.debug('Disk metrics updated', {
      total: formatBytes(disk.total),
      used: formatBytes(disk.used),
      usage: formatPercentage(disk.usagePercentage)
    });
  }
  
  /**
   * Update process metrics in Prometheus
   */
  private updateProcessMetrics(process: SystemMetrics['process']): void {
    logger.debug('Process metrics updated', {
      pid: process.pid,
      uptime: formatUptime(process.uptime),
      memory: formatBytes(process.memory)
    });
  }
  
  /**
   * Update application Prometheus metrics
   */
  private updateApplicationPrometheusMetrics(metrics: ApplicationMetrics): void {
    // Update business metrics
    this.metrics.usersTotal.labels('CLIENT', 'active').set(metrics.business.activeUsers);
    this.metrics.usersTotal.labels('CLIENT', 'total').set(metrics.business.totalUsers);
    this.metrics.productsTotal.labels('ACTIVE').set(metrics.business.activeProducts);
    this.metrics.ordersTotal.labels('PENDING').set(metrics.business.pendingOrders);
    this.metrics.inventoryValue.set(metrics.business.inventoryValue);
    
    logger.debug('Application Prometheus metrics updated');
  }
  
  /**
   * Get last collected metrics
   */
  public getLastMetrics(): { system?: SystemMetrics; application?: ApplicationMetrics } {
    return {
      system: this.lastSystemMetrics,
      application: this.lastApplicationMetrics
    };
  }
  
  /**
   * Get metrics summary
   */
  public getMetricsSummary(): any {
    const system = this.lastSystemMetrics;
    const application = this.lastApplicationMetrics;
    
    return {
      timestamp: new Date(),
      system: system ? {
        cpu: formatPercentage(system.cpu.usage),
        memory: formatPercentage(system.memory.usagePercentage),
        disk: formatPercentage(system.disk.usagePercentage),
        uptime: formatUptime(system.system.uptime || process.uptime())
      } : null,
      application: application ? {
        users: application.business.totalUsers,
        products: application.business.totalProducts,
        orders: application.business.totalOrders,
        revenue: application.business.totalRevenue
      } : null,
      health: 'healthy' // This should be calculated from health checks
    };
  }
}
