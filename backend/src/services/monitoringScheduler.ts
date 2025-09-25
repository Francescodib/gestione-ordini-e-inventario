/**
 * Monitoring Scheduler Service
 * Service for scheduling automated monitoring tasks and metrics collection
 */

import * as cron from 'node-cron';
import { logger } from '../config/logger';
import { MonitoringConfig } from '../config/monitoring';
import { SystemMonitoringService } from './systemMonitoringService';
import { AlertService } from './alertService';

export interface MonitoringJob {
  name: string;
  schedule: string;
  active: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'idle' | 'error';
  task: cron.ScheduledTask;
  duration?: number;
}

export class MonitoringScheduler {
  private static instance: MonitoringScheduler;
  private jobs: Map<string, MonitoringJob> = new Map();
  private config: MonitoringConfig;
  private systemMonitoring: SystemMonitoringService;
  private alertService: AlertService;
  
  private constructor(
    config: MonitoringConfig, 
    systemMonitoring: SystemMonitoringService,
    alertService: AlertService
  ) {
    this.config = config;
    this.systemMonitoring = systemMonitoring;
    this.alertService = alertService;
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(
    config?: MonitoringConfig,
    systemMonitoring?: SystemMonitoringService,
    alertService?: AlertService
  ): MonitoringScheduler {
    if (!MonitoringScheduler.instance) {
      if (!config || !systemMonitoring || !alertService) {
        throw new Error('MonitoringScheduler requires config, systemMonitoring, and alertService for initialization');
      }
      MonitoringScheduler.instance = new MonitoringScheduler(config, systemMonitoring, alertService);
    }
    return MonitoringScheduler.instance;
  }
  
  /**
   * Initialize and start all monitoring jobs
   */
  public initialize(): void {
    logger.info('Initializing monitoring scheduler', {
      metricsEnabled: this.config.metrics.enabled,
      healthChecksEnabled: this.config.healthChecks.enabled,
      alertsEnabled: this.config.alerts.enabled
    });
    
    try {
      // Schedule metrics collection
      if (this.config.metrics.enabled) {
        this.scheduleMetricsCollection();
      }
      
      // Schedule health checks
      if (this.config.healthChecks.enabled) {
        this.scheduleHealthChecks();
      }
      
      // Schedule alert evaluation
      if (this.config.alerts.enabled) {
        this.scheduleAlertEvaluation();
      }
      
      // Schedule cleanup tasks
      this.scheduleCleanupTasks();
      
      logger.info('Monitoring scheduler initialized successfully', {
        activeJobs: this.jobs.size
      });
      
    } catch (error: any) {
      logger.error('Failed to initialize monitoring scheduler', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Schedule metrics collection
   */
  private scheduleMetricsCollection(): void {
    const jobName = 'metrics-collection';
    const intervalSeconds = this.config.metrics.interval;
    const schedule = `*/${intervalSeconds} * * * * *`; // Every N seconds
    
    logger.info('Scheduling metrics collection job', {
      interval: `${intervalSeconds}s`,
      schedule
    });
    
    const task = cron.schedule(schedule, async () => {
      await this.runMetricsCollection();
    }, {
      timezone: 'Europe/Rome'
    });
    
    const job: MonitoringJob = {
      name: jobName,
      schedule,
      active: false,
      status: 'idle',
      task
    };
    
    this.jobs.set(jobName, job);
    this.startJob(jobName);
  }
  
  /**
   * Schedule health checks
   */
  private scheduleHealthChecks(): void {
    const jobName = 'health-checks';
    const intervalSeconds = this.config.healthChecks.interval;
    const schedule = `*/${intervalSeconds} * * * * *`; // Every N seconds
    
    logger.info('Scheduling health checks job', {
      interval: `${intervalSeconds}s`,
      schedule
    });
    
    const task = cron.schedule(schedule, async () => {
      await this.runHealthChecks();
    }, {
      timezone: 'Europe/Rome'
    });
    
    const job: MonitoringJob = {
      name: jobName,
      schedule,
      active: false,
      status: 'idle',
      task
    };
    
    this.jobs.set(jobName, job);
    this.startJob(jobName);
  }
  
  /**
   * Schedule alert evaluation
   */
  private scheduleAlertEvaluation(): void {
    const jobName = 'alert-evaluation';
    const schedule = '*/30 * * * * *'; // Every 30 seconds
    
    logger.info('Scheduling alert evaluation job', { schedule });
    
    const task = cron.schedule(schedule, async () => {
      await this.runAlertEvaluation();
    }, {
      timezone: 'Europe/Rome'
    });
    
    const job: MonitoringJob = {
      name: jobName,
      schedule,
      active: false,
      status: 'idle',
      task
    };
    
    this.jobs.set(jobName, job);
    this.startJob(jobName);
  }
  
  /**
   * Schedule cleanup tasks
   */
  private scheduleCleanupTasks(): void {
    // Alert cleanup - daily at 1 AM
    const alertCleanupJob = 'alert-cleanup';
    
    const alertCleanupTask = cron.schedule('0 1 * * *', async () => {
      await this.runAlertCleanup();
    }, {
      timezone: 'Europe/Rome'
    });
    
    this.jobs.set(alertCleanupJob, {
      name: alertCleanupJob,
      schedule: '0 1 * * *',
      active: false,
      status: 'idle',
      task: alertCleanupTask
    });
    
    this.startJob(alertCleanupJob);
  }
  
  /**
   * Run metrics collection
   */
  private async runMetricsCollection(): Promise<void> {
    const jobName = 'metrics-collection';
    const job = this.jobs.get(jobName);
    
    if (!job) return;
    
    const startTime = Date.now();
    
    try {
      job.status = 'running';
      job.lastRun = new Date();
      
      // Collect system metrics
      await this.systemMonitoring.collectSystemMetrics();
      
      // Collect application metrics
      await this.systemMonitoring.collectApplicationMetrics();
      
      const duration = Date.now() - startTime;
      job.duration = duration;
      job.status = 'idle';
      
      logger.debug('Metrics collection completed', { duration: `${duration}ms` });
      
    } catch (error: any) {
      job.status = 'error';
      const duration = Date.now() - startTime;
      job.duration = duration;
      
      logger.error('Metrics collection failed', { 
        error: error.message, 
        duration: `${duration}ms` 
      });
    }
  }
  
  /**
   * Run health checks
   */
  private async runHealthChecks(): Promise<void> {
    const jobName = 'health-checks';
    const job = this.jobs.get(jobName);
    
    if (!job) return;
    
    const startTime = Date.now();
    
    try {
      job.status = 'running';
      job.lastRun = new Date();
      
      // Perform health checks
      const healthResults = await this.systemMonitoring.performHealthChecks();
      
      // Log health status
      const unhealthyComponents = healthResults.filter(r => r.status === 'unhealthy');
      const degradedComponents = healthResults.filter(r => r.status === 'degraded');
      
      if (unhealthyComponents.length > 0 || degradedComponents.length > 0) {
        logger.warn('Health check issues detected', {
          unhealthy: unhealthyComponents.map(c => c.component),
          degraded: degradedComponents.map(c => c.component)
        });
      }
      
      const duration = Date.now() - startTime;
      job.duration = duration;
      job.status = 'idle';
      
      logger.debug('Health checks completed', { 
        duration: `${duration}ms`,
        healthy: healthResults.filter(r => r.status === 'healthy').length,
        degraded: degradedComponents.length,
        unhealthy: unhealthyComponents.length
      });
      
    } catch (error: any) {
      job.status = 'error';
      const duration = Date.now() - startTime;
      job.duration = duration;
      
      logger.error('Health checks failed', { 
        error: error.message, 
        duration: `${duration}ms` 
      });
    }
  }
  
  /**
   * Run alert evaluation
   */
  private async runAlertEvaluation(): Promise<void> {
    const jobName = 'alert-evaluation';
    const job = this.jobs.get(jobName);
    
    if (!job) return;
    
    const startTime = Date.now();
    
    try {
      job.status = 'running';
      job.lastRun = new Date();
      
      // Get latest metrics
      const { system, application } = this.systemMonitoring.getLastMetrics();
      
      const triggeredAlerts = [];
      
      // Evaluate system metrics
      if (system) {
        const systemAlerts = this.alertService.evaluateSystemMetrics(system);
        triggeredAlerts.push(...systemAlerts);
      }
      
      // Evaluate application metrics
      if (application) {
        const appAlerts = this.alertService.evaluateApplicationMetrics(application);
        triggeredAlerts.push(...appAlerts);
      }
      
      // Evaluate health checks
      const healthResults = await this.systemMonitoring.performHealthChecks();
      const healthAlerts = this.alertService.evaluateHealthChecks(healthResults);
      triggeredAlerts.push(...healthAlerts);
      
      const duration = Date.now() - startTime;
      job.duration = duration;
      job.status = 'idle';
      
      if (triggeredAlerts.length > 0) {
        logger.warn('Alert evaluation completed', {
          duration: `${duration}ms`,
          triggeredAlerts: triggeredAlerts.length,
          alerts: triggeredAlerts.map(a => ({ id: a.id, severity: a.severity, title: a.title }))
        });
      } else {
        logger.debug('Alert evaluation completed', { 
          duration: `${duration}ms`,
          triggeredAlerts: 0
        });
      }
      
    } catch (error: any) {
      job.status = 'error';
      const duration = Date.now() - startTime;
      job.duration = duration;
      
      logger.error('Alert evaluation failed', { 
        error: error.message, 
        duration: `${duration}ms` 
      });
    }
  }
  
  /**
   * Run alert cleanup
   */
  private async runAlertCleanup(): Promise<void> {
    const jobName = 'alert-cleanup';
    const job = this.jobs.get(jobName);
    
    if (!job) return;
    
    const startTime = Date.now();
    
    try {
      job.status = 'running';
      job.lastRun = new Date();
      
      // Clean old alerts
      const clearedCount = this.alertService.clearOldAlerts();
      
      const duration = Date.now() - startTime;
      job.duration = duration;
      job.status = 'idle';
      
      logger.info('Alert cleanup completed', {
        duration: `${duration}ms`,
        clearedAlerts: clearedCount
      });
      
    } catch (error: any) {
      job.status = 'error';
      const duration = Date.now() - startTime;
      job.duration = duration;
      
      logger.error('Alert cleanup failed', { 
        error: error.message, 
        duration: `${duration}ms` 
      });
    }
  }
  
  /**
   * Start a specific job
   */
  public startJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (!job) {
      logger.error(`Monitoring job not found: ${jobName}`);
      return false;
    }
    
    if (job.active) {
      logger.warn(`Monitoring job ${jobName} is already active`);
      return true;
    }
    
    try {
      job.task.start();
      job.active = true;
      job.status = 'idle';
      
      logger.info(`Monitoring job started: ${jobName}`, { schedule: job.schedule });
      return true;
      
    } catch (error: any) {
      logger.error(`Failed to start monitoring job: ${jobName}`, { error: error.message });
      return false;
    }
  }
  
  /**
   * Stop a specific job
   */
  public stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (!job) {
      logger.error(`Monitoring job not found: ${jobName}`);
      return false;
    }
    
    try {
      job.task.stop();
      job.active = false;
      job.status = 'idle';
      
      logger.info(`Monitoring job stopped: ${jobName}`);
      return true;
      
    } catch (error: any) {
      logger.error(`Failed to stop monitoring job: ${jobName}`, { error: error.message });
      return false;
    }
  }
  
  /**
   * Restart a specific job
   */
  public restartJob(jobName: string): boolean {
    return this.stopJob(jobName) && this.startJob(jobName);
  }
  
  /**
   * Get job status
   */
  public getJobStatus(jobName: string): MonitoringJob | undefined {
    const job = this.jobs.get(jobName);
    if (!job) return undefined;
    
    return {
      ...job,
      nextRun: this.calculateNextRun(job.schedule)
    };
  }
  
  /**
   * Get all jobs status
   */
  public getAllJobsStatus(): MonitoringJob[] {
    return Array.from(this.jobs.values()).map(job => ({
      ...job,
      nextRun: this.calculateNextRun(job.schedule)
    }));
  }
  
  /**
   * Calculate next run time for a schedule
   */
  private calculateNextRun(schedule: string): Date {
    try {
      // Simple next run calculation
      const now = new Date();
      
      if (schedule.includes('*')) {
        // For frequent jobs, next run is soon
        return new Date(now.getTime() + 30 * 1000); // 30 seconds
      } else {
        // For daily jobs, next run is tomorrow at same time
        const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return nextDay;
      }
    } catch {
      return new Date();
    }
  }
  
  /**
   * Manually trigger a monitoring job
   */
  public async triggerJob(jobName: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Manually triggering monitoring job: ${jobName}`);
      
      switch (jobName) {
        case 'metrics-collection':
          await this.runMetricsCollection();
          break;
        case 'health-checks':
          await this.runHealthChecks();
          break;
        case 'alert-evaluation':
          await this.runAlertEvaluation();
          break;
        case 'alert-cleanup':
          await this.runAlertCleanup();
          break;
        default:
          throw new Error(`Unknown monitoring job: ${jobName}`);
      }
      
      return { success: true };
      
    } catch (error: any) {
      logger.error(`Failed to trigger monitoring job: ${jobName}`, { error: error.message });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get monitoring status
   */
  public getMonitoringStatus(): any {
    const jobs = this.getAllJobsStatus();
    const activeJobs = jobs.filter(job => job.active);
    const errorJobs = jobs.filter(job => job.status === 'error');
    
    return {
      status: errorJobs.length === 0 ? 'healthy' : 'degraded',
      totalJobs: jobs.length,
      activeJobs: activeJobs.length,
      errorJobs: errorJobs.length,
      configuration: {
        metricsInterval: this.config.metrics.interval,
        healthCheckInterval: this.config.healthChecks.interval,
        alertsEnabled: this.config.alerts.enabled
      },
      lastRuns: jobs.reduce((acc, job) => {
        if (job.lastRun) {
          acc[job.name] = {
            lastRun: job.lastRun,
            status: job.status,
            duration: job.duration
          };
        }
        return acc;
      }, {} as Record<string, any>)
    };
  }
  
  /**
   * Shutdown scheduler and stop all jobs
   */
  public shutdown(): void {
    logger.info('Shutting down monitoring scheduler');
    
    for (const [jobName, job] of this.jobs) {
      try {
        if (job.active) {
          job.task.stop();
          logger.debug(`Stopped monitoring job: ${jobName}`);
        }
      } catch (error: any) {
        logger.error(`Failed to stop monitoring job during shutdown: ${jobName}`, { 
          error: error.message 
        });
      }
    }
    
    this.jobs.clear();
    
    logger.info('Monitoring scheduler shutdown completed');
  }
  
  /**
   * Update configuration and restart scheduler
   */
  public updateConfig(newConfig: MonitoringConfig): void {
    logger.info('Updating monitoring scheduler configuration');
    
    // Stop all jobs
    this.shutdown();
    
    // Update configuration
    this.config = newConfig;
    
    // Reinitialize with new configuration
    this.initialize();
    
    logger.info('Monitoring scheduler configuration updated');
  }
}
