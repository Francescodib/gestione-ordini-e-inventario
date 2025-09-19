/**
 * Backup Configuration
 * Configuration for automated backup system
 */

import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger';

export interface BackupConfig {
  // Database backup settings
  database: {
    enabled: boolean;
    schedule: string; // Cron expression
    retention: {
      daily: number;   // Keep last N daily backups
      weekly: number;  // Keep last N weekly backups
      monthly: number; // Keep last N monthly backups
    };
    compression: boolean;
    encryption: boolean;
  };
  
  // File system backup settings
  files: {
    enabled: boolean;
    schedule: string;
    directories: string[];
    exclusions: string[];
    compression: boolean;
    encryption: boolean;
  };
  
  // Storage settings
  storage: {
    local: {
      enabled: boolean;
      path: string;
    };
    cloud: {
      enabled: boolean;
      provider: 'aws' | 'gcp' | 'azure';
      bucket?: string;
      credentials?: any;
    };
  };
  
  // Notification settings
  notifications: {
    enabled: boolean;
    email?: string;
    webhook?: string;
    onSuccess: boolean;
    onFailure: boolean;
  };
}

/**
 * Default backup configuration
 */
export const defaultBackupConfig: BackupConfig = {
  database: {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    retention: {
      daily: 7,   // Keep 7 daily backups
      weekly: 4,  // Keep 4 weekly backups
      monthly: 12 // Keep 12 monthly backups
    },
    compression: true,
    encryption: false
  },
  
  files: {
    enabled: true,
    schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
    directories: [
      'uploads',
      'logs',
      'config'
    ],
    exclusions: [
      '*.log',
      '*.tmp',
      'node_modules',
      '.git',
      'coverage',
      'dist'
    ],
    compression: true,
    encryption: false
  },
  
  storage: {
    local: {
      enabled: true,
      path: path.join(process.cwd(), 'backups')
    },
    cloud: {
      enabled: false,
      provider: 'aws'
    }
  },
  
  notifications: {
    enabled: true,
    onSuccess: false, // Don't spam on success
    onFailure: true   // Always notify on failure
  }
};

/**
 * Load backup configuration from environment
 */
export function loadBackupConfig(): BackupConfig {
  const config = { ...defaultBackupConfig };
  
  // Override with environment variables
  if (process.env.BACKUP_ENABLED === 'false') {
    config.database.enabled = false;
    config.files.enabled = false;
  }
  
  if (process.env.BACKUP_DATABASE_SCHEDULE) {
    config.database.schedule = process.env.BACKUP_DATABASE_SCHEDULE;
  }
  
  if (process.env.BACKUP_FILES_SCHEDULE) {
    config.files.schedule = process.env.BACKUP_FILES_SCHEDULE;
  }
  
  if (process.env.BACKUP_RETENTION_DAILY) {
    config.database.retention.daily = parseInt(process.env.BACKUP_RETENTION_DAILY);
  }
  
  if (process.env.BACKUP_LOCAL_PATH) {
    config.storage.local.path = process.env.BACKUP_LOCAL_PATH;
  }
  
  if (process.env.BACKUP_NOTIFICATION_EMAIL) {
    config.notifications.email = process.env.BACKUP_NOTIFICATION_EMAIL;
    config.notifications.enabled = true;
  }
  
  // Validate configuration
  validateBackupConfig(config);
  
  return config;
}

/**
 * Validate backup configuration
 */
function validateBackupConfig(config: BackupConfig): void {
  try {
    // Ensure backup directory exists
    if (config.storage.local.enabled) {
      fs.ensureDirSync(config.storage.local.path);
      logger.info('Backup directory ensured', { path: config.storage.local.path });
    }
    
    // Validate cron expressions
    if (config.database.enabled && !isValidCronExpression(config.database.schedule)) {
      throw new Error(`Invalid database backup schedule: ${config.database.schedule}`);
    }
    
    if (config.files.enabled && !isValidCronExpression(config.files.schedule)) {
      throw new Error(`Invalid files backup schedule: ${config.files.schedule}`);
    }
    
    // Validate retention settings
    if (config.database.retention.daily < 1) {
      throw new Error('Daily retention must be at least 1');
    }
    
    logger.info('Backup configuration validated successfully');
    
  } catch (error: any) {
    logger.error('Backup configuration validation failed', { error: error.message });
    throw error;
  }
}

/**
 * Basic cron expression validation
 */
function isValidCronExpression(expression: string): boolean {
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  return cronRegex.test(expression);
}

/**
 * Get backup file naming pattern
 */
export function getBackupFileName(type: 'database' | 'files', timestamp?: Date): string {
  const now = timestamp || new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  return `${type}_backup_${dateStr}_${timeStr}`;
}

/**
 * Get backup file path
 */
export function getBackupFilePath(config: BackupConfig, fileName: string, extension: string = ''): string {
  return path.join(config.storage.local.path, `${fileName}${extension}`);
}

/**
 * Calculate backup retention periods
 */
export function getRetentionDate(retentionDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - retentionDays);
  return date;
}

/**
 * Check if backup file should be kept based on retention policy
 */
export function shouldKeepBackup(filePath: string, retentionDate: Date): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime > retentionDate;
  } catch {
    return false; // If file doesn't exist or can't be accessed, don't keep it
  }
}

/**
 * Format backup size for logging
 */
export function formatBackupSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${Math.round(size * 100) / 100} ${sizes[i]}`;
}

/**
 * Backup configuration instance
 */
export const backupConfig = loadBackupConfig();
