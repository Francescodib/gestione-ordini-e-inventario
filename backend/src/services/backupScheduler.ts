/**
 * Backup Scheduler Service
 * Service for scheduling and managing automated backups using cron jobs
 */

import cron from 'node-cron';
import { logger, logUtils } from '../config/logger';
import { BackupConfig, backupConfig } from '../config/backup';
import { DatabaseBackupService } from './databaseBackupService';
import { FilesBackupService } from './filesBackupService';

export interface ScheduledJob {
  name: string;
  schedule: string;
  active: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'idle' | 'error';
  task: cron.ScheduledTask;
}

export class BackupScheduler {
  private static instance: BackupScheduler;
  private jobs: Map<string, ScheduledJob> = new Map();
  private config: BackupConfig;
  
  private constructor(config: BackupConfig) {
    this.config = config;
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: BackupConfig): BackupScheduler {
    if (!BackupScheduler.instance) {
      BackupScheduler.instance = new BackupScheduler(config || backupConfig);
    }
    return BackupScheduler.instance;
  }
  
  /**
   * Initialize and start all scheduled backup jobs
   */
  public initialize(): void {
    logger.info('Initializing backup scheduler', {
      databaseEnabled: this.config.database.enabled,
      filesEnabled: this.config.files.enabled
    });
    
    try {
      // Schedule database backups
      if (this.config.database.enabled) {
        this.scheduleDatabaseBackup();
      }
      
      // Schedule file backups
      if (this.config.files.enabled) {
        this.scheduleFilesBackup();
      }
      
      // Schedule cleanup jobs
      this.scheduleCleanupJobs();
      
      logger.info('Backup scheduler initialized successfully', {
        activeJobs: this.jobs.size
      });
      
      logUtils.logSystemAction('BACKUP_SCHEDULER_INITIALIZED', 
        `Initialized ${this.jobs.size} backup jobs`
      );
      
    } catch (error: any) {
      logger.error('Failed to initialize backup scheduler', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Schedule database backup job
   */
  private scheduleDatabaseBackup(): void {
    const jobName = 'database-backup';
    
    logger.info('Scheduling database backup job', {
      schedule: this.config.database.schedule
    });
    
    const task = cron.schedule(this.config.database.schedule, async () => {
      await this.runDatabaseBackup();
    }, {
      scheduled: false, // Don't start immediately
      timezone: 'Europe/Rome'
    });
    
    const job: ScheduledJob = {
      name: jobName,
      schedule: this.config.database.schedule,
      active: false,
      status: 'idle',
      task
    };
    
    this.jobs.set(jobName, job);
    
    // Start the job
    this.startJob(jobName);
  }
  
  /**
   * Schedule files backup job
   */
  private scheduleFilesBackup(): void {
    const jobName = 'files-backup';
    
    logger.info('Scheduling files backup job', {
      schedule: this.config.files.schedule,
      directories: this.config.files.directories
    });
    
    const task = cron.schedule(this.config.files.schedule, async () => {
      await this.runFilesBackup();
    }, {
      scheduled: false,
      timezone: 'Europe/Rome'
    });
    
    const job: ScheduledJob = {
      name: jobName,
      schedule: this.config.files.schedule,
      active: false,
      status: 'idle',
      task
    };
    
    this.jobs.set(jobName, job);
    
    // Start the job
    this.startJob(jobName);
  }
  
  /**
   * Schedule cleanup jobs
   */
  private scheduleCleanupJobs(): void {
    // Database backup cleanup - daily at 1 AM
    const dbCleanupJob = 'database-cleanup';
    
    const dbCleanupTask = cron.schedule('0 1 * * *', async () => {
      await this.runDatabaseCleanup();
    }, {
      scheduled: false,
      timezone: 'Europe/Rome'
    });
    
    this.jobs.set(dbCleanupJob, {
      name: dbCleanupJob,
      schedule: '0 1 * * *',
      active: false,
      status: 'idle',
      task: dbCleanupTask
    });
    
    // Files backup cleanup - daily at 1:30 AM
    const filesCleanupJob = 'files-cleanup';
    
    const filesCleanupTask = cron.schedule('30 1 * * *', async () => {
      await this.runFilesCleanup();
    }, {
      scheduled: false,
      timezone: 'Europe/Rome'
    });
    
    this.jobs.set(filesCleanupJob, {
      name: filesCleanupJob,
      schedule: '30 1 * * *',
      active: false,
      status: 'idle',
      task: filesCleanupTask
    });
    
    // Start cleanup jobs
    this.startJob(dbCleanupJob);
    this.startJob(filesCleanupJob);
  }
  
  /**
   * Run database backup
   */
  private async runDatabaseBackup(): Promise<void> {
    const jobName = 'database-backup';
    const job = this.jobs.get(jobName);
    
    if (!job) return;
    
    try {
      job.status = 'running';
      job.lastRun = new Date();
      
      logger.info('Starting scheduled database backup');
      
      const result = await DatabaseBackupService.createBackup(this.config);
      
      if (result.success) {
        logger.info('Scheduled database backup completed successfully', {
          backupPath: result.backupPath,
          size: result.size,
          duration: result.duration
        });
        
        // Send success notification if configured
        if (this.config.notifications.enabled && this.config.notifications.onSuccess) {
          await this.sendNotification('Database backup completed successfully', result);
        }
      } else {
        throw new Error(result.error || 'Database backup failed');
      }
      
      job.status = 'idle';
      
    } catch (error: any) {
      job.status = 'error';
      
      logger.error('Scheduled database backup failed', { error: error.message });
      
      // Send failure notification
      if (this.config.notifications.enabled && this.config.notifications.onFailure) {
        await this.sendNotification('Database backup failed', { error: error.message });
      }
    }
  }
  
  /**
   * Run files backup
   */
  private async runFilesBackup(): Promise<void> {
    const jobName = 'files-backup';
    const job = this.jobs.get(jobName);
    
    if (!job) return;
    
    try {
      job.status = 'running';
      job.lastRun = new Date();
      
      logger.info('Starting scheduled files backup');
      
      const result = await FilesBackupService.createBackup(this.config);
      
      if (result.success) {
        logger.info('Scheduled files backup completed successfully', {
          backupPath: result.backupPath,
          fileCount: result.metadata.fileCount,
          size: result.size,
          duration: result.duration
        });
        
        // Send success notification if configured
        if (this.config.notifications.enabled && this.config.notifications.onSuccess) {
          await this.sendNotification('Files backup completed successfully', result);
        }
      } else {
        throw new Error(result.error || 'Files backup failed');
      }
      
      job.status = 'idle';
      
    } catch (error: any) {
      job.status = 'error';
      
      logger.error('Scheduled files backup failed', { error: error.message });
      
      // Send failure notification
      if (this.config.notifications.enabled && this.config.notifications.onFailure) {
        await this.sendNotification('Files backup failed', { error: error.message });
      }
    }
  }
  
  /**
   * Run database cleanup
   */
  private async runDatabaseCleanup(): Promise<void> {
    const jobName = 'database-cleanup';
    const job = this.jobs.get(jobName);
    
    if (!job) return;
    
    try {
      job.status = 'running';
      job.lastRun = new Date();
      
      logger.info('Starting scheduled database backup cleanup');
      
      const result = await DatabaseBackupService.cleanOldBackups(this.config);
      
      logger.info('Scheduled database cleanup completed', {
        deletedCount: result.deletedCount,
        errors: result.errors.length
      });
      
      job.status = 'idle';
      
    } catch (error: any) {
      job.status = 'error';
      logger.error('Scheduled database cleanup failed', { error: error.message });
    }
  }
  
  /**
   * Run files cleanup
   */
  private async runFilesCleanup(): Promise<void> {
    const jobName = 'files-cleanup';
    const job = this.jobs.get(jobName);
    
    if (!job) return;
    
    try {
      job.status = 'running';
      job.lastRun = new Date();
      
      logger.info('Starting scheduled files backup cleanup');
      
      const result = await FilesBackupService.cleanOldBackups(this.config);
      
      logger.info('Scheduled files cleanup completed', {
        deletedCount: result.deletedCount,
        errors: result.errors.length
      });
      
      job.status = 'idle';
      
    } catch (error: any) {
      job.status = 'error';
      logger.error('Scheduled files cleanup failed', { error: error.message });
    }
  }
  
  /**
   * Start a specific job
   */
  public startJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (!job) {
      logger.error(`Job not found: ${jobName}`);
      return false;
    }
    
    if (job.active) {
      logger.warn(`Job ${jobName} is already active`);
      return true;
    }
    
    try {
      job.task.start();
      job.active = true;
      job.status = 'idle';
      
      logger.info(`Backup job started: ${jobName}`, { schedule: job.schedule });
      return true;
      
    } catch (error: any) {
      logger.error(`Failed to start job: ${jobName}`, { error: error.message });
      return false;
    }
  }
  
  /**
   * Stop a specific job
   */
  public stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (!job) {
      logger.error(`Job not found: ${jobName}`);
      return false;
    }
    
    try {
      job.task.stop();
      job.active = false;
      job.status = 'idle';
      
      logger.info(`Backup job stopped: ${jobName}`);
      return true;
      
    } catch (error: any) {
      logger.error(`Failed to stop job: ${jobName}`, { error: error.message });
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
  public getJobStatus(jobName: string): ScheduledJob | undefined {
    const job = this.jobs.get(jobName);
    if (!job) return undefined;
    
    // Calculate next run time
    const nextRun = this.calculateNextRun(job.schedule);
    
    return {
      ...job,
      nextRun
    };
  }
  
  /**
   * Get all jobs status
   */
  public getAllJobsStatus(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(job => ({
      ...job,
      nextRun: this.calculateNextRun(job.schedule)
    }));
  }
  
  /**
   * Calculate next run time for a cron schedule
   */
  private calculateNextRun(schedule: string): Date {
    try {
      // Simple next run calculation (this is a basic implementation)
      // In production, you might want to use a more sophisticated cron parser
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour as fallback
      return nextHour;
    } catch {
      return new Date();
    }
  }
  
  /**
   * Manually trigger a backup job
   */
  public async triggerJob(jobName: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info(`Manually triggering backup job: ${jobName}`);
      
      switch (jobName) {
        case 'database-backup':
          await this.runDatabaseBackup();
          break;
        case 'files-backup':
          await this.runFilesBackup();
          break;
        case 'database-cleanup':
          await this.runDatabaseCleanup();
          break;
        case 'files-cleanup':
          await this.runFilesCleanup();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
      
      logUtils.logSystemAction('BACKUP_JOB_TRIGGERED', `Manually triggered: ${jobName}`);
      
      return { success: true };
      
    } catch (error: any) {
      logger.error(`Failed to trigger job: ${jobName}`, { error: error.message });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Send notification
   */
  private async sendNotification(message: string, data?: any): Promise<void> {
    try {
      // Email notification
      if (this.config.notifications.email) {
        logger.info('Email notification would be sent', {
          to: this.config.notifications.email,
          message,
          data
        });
        // TODO: Implement actual email sending
      }
      
      // Webhook notification
      if (this.config.notifications.webhook) {
        logger.info('Webhook notification would be sent', {
          url: this.config.notifications.webhook,
          message,
          data
        });
        // TODO: Implement webhook notification
      }
      
      // For now, just log the notification
      logger.info('Backup notification', { message, data });
      
    } catch (error: any) {
      logger.error('Failed to send backup notification', { error: error.message });
    }
  }
  
  /**
   * Shutdown scheduler and stop all jobs
   */
  public shutdown(): void {
    logger.info('Shutting down backup scheduler');
    
    for (const [jobName, job] of this.jobs) {
      try {
        if (job.active) {
          job.task.stop();
          logger.debug(`Stopped job: ${jobName}`);
        }
      } catch (error: any) {
        logger.error(`Failed to stop job during shutdown: ${jobName}`, { error: error.message });
      }
    }
    
    this.jobs.clear();
    
    logger.info('Backup scheduler shutdown completed');
    logUtils.logSystemAction('BACKUP_SCHEDULER_SHUTDOWN', 'Scheduler stopped');
  }
  
  /**
   * Update configuration and restart scheduler
   */
  public updateConfig(newConfig: BackupConfig): void {
    logger.info('Updating backup scheduler configuration');
    
    // Stop all jobs
    this.shutdown();
    
    // Update configuration
    this.config = newConfig;
    
    // Reinitialize with new configuration
    this.initialize();
    
    logger.info('Backup scheduler configuration updated');
  }
}
