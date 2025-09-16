/**
 * Backup API Routes
 * API endpoints for backup management and administration
 */

import express, { Request, Response } from 'express';
import { logger, logUtils } from '../config/logger';
import { verifyToken } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { DatabaseBackupService } from '../services/databaseBackupService';
import { FilesBackupService } from '../services/filesBackupService';
import { BackupScheduler } from '../services/backupScheduler';
import { backupConfig, formatBackupSize } from '../config/backup';

const router = express.Router();
router.use(handleValidationErrors());

// Initialize backup scheduler
const backupScheduler = BackupScheduler.getInstance(backupConfig);

/**
 * GET /api/backup/status
 * Backup system status check (alias for /health)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const jobs = backupScheduler.getAllJobsStatus();
    const activeJobs = jobs.filter(job => job.active);
    const errorJobs = jobs.filter(job => job.status === 'error');

    const status = {
      status: errorJobs.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      scheduler: {
        initialized: jobs.length > 0,
        activeJobs: activeJobs.length,
        totalJobs: jobs.length,
        errorJobs: errorJobs.length
      },
      configuration: {
        databaseBackupEnabled: backupConfig.database.enabled,
        filesBackupEnabled: backupConfig.files.enabled,
        localStorageEnabled: backupConfig.storage.local.enabled,
        notificationsEnabled: backupConfig.notifications.enabled
      },
      storage: {
        backupDirectory: backupConfig.storage.local.path,
        retention: backupConfig.database.retention
      }
    };

    res.json({
      success: true,
      message: 'Backup system is operational',
      data: status
    });

  } catch (error: any) {
    logger.error('Backup status check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Backup status check failed',
      error: error.message
    });
  }
});

/**
 * GET /api/backup/health
 * Backup system health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const jobs = backupScheduler.getAllJobsStatus();
    const activeJobs = jobs.filter(job => job.active);
    const errorJobs = jobs.filter(job => job.status === 'error');
    
    const health = {
      status: errorJobs.length === 0 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      scheduler: {
        initialized: jobs.length > 0,
        activeJobs: activeJobs.length,
        totalJobs: jobs.length,
        errorJobs: errorJobs.length
      },
      configuration: {
        databaseBackupEnabled: backupConfig.database.enabled,
        filesBackupEnabled: backupConfig.files.enabled,
        localStorageEnabled: backupConfig.storage.local.enabled,
        notificationsEnabled: backupConfig.notifications.enabled
      },
      storage: {
        backupDirectory: backupConfig.storage.local.path,
        retention: backupConfig.database.retention
      }
    };
    
    res.json({
      success: true,
      message: 'Backup system is operational',
      data: health
    });
    
  } catch (error: any) {
    logger.error('Backup health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Backup health check failed',
      error: error.message
    });
  }
});

/**
 * GET /api/backup/jobs
 * Get all backup jobs status (Admin only)
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
      
      const jobs = backupScheduler.getAllJobsStatus();
      
      res.json({
        success: true,
        data: jobs
      });
      
    } catch (error: any) {
      logger.error('Failed to get backup jobs status', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get backup jobs status',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/backup/database
 * Create manual database backup (Admin only)
 */
router.post('/database',
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
      
      logger.info('Manual database backup requested', { userId: req.user?.id });
      
      const result = await DatabaseBackupService.createBackup(backupConfig);
      
      if (result.success) {
        logger.info('Manual database backup completed', { 
          userId: req.user?.id,
          backupPath: result.backupPath
        });
        
        logUtils.logUserAction(req.user?.id, 'Created manual database backup');
        
        res.status(201).json({
          success: true,
          message: 'Database backup created successfully',
          data: {
            backupPath: result.backupPath,
            size: formatBackupSize(result.size || 0),
            duration: result.duration,
            metadata: result.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Database backup failed',
          error: result.error
        });
      }
      
    } catch (error: any) {
      logger.error('Manual database backup failed', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Database backup failed',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/backup/files
 * Create manual files backup (Admin only)
 */
router.post('/files',
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
      
      logger.info('Manual files backup requested', { userId: req.user?.id });
      
      const result = await FilesBackupService.createBackup(backupConfig);
      
      if (result.success) {
        logger.info('Manual files backup completed', { 
          userId: req.user?.id,
          backupPath: result.backupPath
        });
        
        logUtils.logUserAction(req.user?.id, 'Created manual files backup');
        
        res.status(201).json({
          success: true,
          message: 'Files backup created successfully',
          data: {
            backupPath: result.backupPath,
            size: formatBackupSize(result.size || 0),
            fileCount: result.metadata.fileCount,
            duration: result.duration,
            metadata: result.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Files backup failed',
          error: result.error
        });
      }
      
    } catch (error: any) {
      logger.error('Manual files backup failed', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Files backup failed',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/backup/list
 * List all available backups (Admin only)
 */
router.get('/list',
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
      
      const { type } = req.query;
      
      let backups: any[] = [];
      
      if (!type || type === 'database') {
        const dbBackups = await DatabaseBackupService.listBackups(backupConfig);
        backups.push(...dbBackups.map(backup => ({
          ...backup,
          type: 'database',
          size: formatBackupSize(backup.size)
        })));
      }
      
      if (!type || type === 'files') {
        const fileBackups = await FilesBackupService.listBackups(backupConfig);
        backups.push(...fileBackups.map(backup => ({
          ...backup,
          type: 'files',
          size: formatBackupSize(backup.size)
        })));
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      res.json({
        success: true,
        data: backups,
        count: backups.length
      });
      
    } catch (error: any) {
      logger.error('Failed to list backups', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to list backups',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/backup/restore/database
 * Restore database from backup (Admin only)
 */
router.post('/restore/database',
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
      
      const { backupPath } = req.body;
      
      if (!backupPath) {
        return res.status(400).json({
          success: false,
          message: 'Backup path is required'
        });
      }
      
      logger.info('Database restore requested', { 
        userId: req.user?.id,
        backupPath
      });
      
      const result = await DatabaseBackupService.restoreBackup(backupPath);
      
      if (result.success) {
        logger.info('Database restore completed', { 
          userId: req.user?.id,
          backupPath
        });
        
        logUtils.logUserAction(req.user?.id, `Restored database from backup: ${backupPath}`);
        
        res.json({
          success: true,
          message: 'Database restored successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Database restore failed',
          error: result.error
        });
      }
      
    } catch (error: any) {
      logger.error('Database restore failed', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Database restore failed',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/backup/restore/files
 * Restore files from backup (Admin only)
 */
router.post('/restore/files',
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
      
      const { backupPath, targetDirectory } = req.body;
      
      if (!backupPath) {
        return res.status(400).json({
          success: false,
          message: 'Backup path is required'
        });
      }
      
      logger.info('Files restore requested', { 
        userId: req.user?.id,
        backupPath,
        targetDirectory
      });
      
      const result = await FilesBackupService.restoreBackup(backupPath, targetDirectory);
      
      if (result.success) {
        logger.info('Files restore completed', { 
          userId: req.user?.id,
          backupPath,
          extractedFiles: result.extractedFiles
        });
        
        logUtils.logUserAction(req.user?.id, `Restored files from backup: ${backupPath}`);
        
        res.json({
          success: true,
          message: 'Files restored successfully',
          data: {
            extractedFiles: result.extractedFiles
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Files restore failed',
          error: result.error
        });
      }
      
    } catch (error: any) {
      logger.error('Files restore failed', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Files restore failed',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/backup/verify
 * Verify backup integrity (Admin only)
 */
router.post('/verify',
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
      
      const { backupPath, type } = req.body;
      
      if (!backupPath || !type) {
        return res.status(400).json({
          success: false,
          message: 'Backup path and type are required'
        });
      }
      
      let result;
      
      if (type === 'database') {
        result = await DatabaseBackupService.verifyBackup(backupPath);
      } else if (type === 'files') {
        result = await FilesBackupService.verifyBackup(backupPath);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid backup type. Must be "database" or "files"'
        });
      }
      
      logger.info('Backup verification completed', { 
        userId: req.user?.id,
        backupPath,
        type,
        valid: result.valid
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      logger.error('Backup verification failed', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Backup verification failed',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/backup/jobs/:jobName/trigger
 * Manually trigger a backup job (Admin only)
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
      
      const { jobName } = req.params;
      
      logger.info('Manual job trigger requested', { 
        userId: req.user?.id,
        jobName
      });
      
      const result = await backupScheduler.triggerJob(jobName);
      
      if (result.success) {
        logUtils.logUserAction(req.user?.id, `Manually triggered backup job: ${jobName}`);
        
        res.json({
          success: true,
          message: `Job ${jobName} triggered successfully`
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Failed to trigger job ${jobName}`,
          error: result.error
        });
      }
      
    } catch (error: any) {
      logger.error('Manual job trigger failed', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to trigger job',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/backup/cleanup
 * Clean old backups (Admin only)
 */
router.post('/cleanup',
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
      
      logger.info('Manual cleanup requested', { userId: req.user?.id });
      
      const [dbCleanup, filesCleanup] = await Promise.all([
        DatabaseBackupService.cleanOldBackups(backupConfig),
        FilesBackupService.cleanOldBackups(backupConfig)
      ]);
      
      const totalDeleted = dbCleanup.deletedCount + filesCleanup.deletedCount;
      const totalErrors = [...dbCleanup.errors, ...filesCleanup.errors];
      
      logger.info('Manual cleanup completed', { 
        userId: req.user?.id,
        totalDeleted,
        totalErrors: totalErrors.length
      });
      
      logUtils.logUserAction(req.user?.id, `Cleanup completed: deleted ${totalDeleted} old backups`);
      
      res.json({
        success: true,
        message: 'Cleanup completed successfully',
        data: {
          database: dbCleanup,
          files: filesCleanup,
          summary: {
            totalDeleted,
            totalErrors: totalErrors.length,
            errors: totalErrors
          }
        }
      });
      
    } catch (error: any) {
      logger.error('Manual cleanup failed', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/backup/stats
 * Get backup statistics (Admin only)
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
      
      const [dbBackups, fileBackups] = await Promise.all([
        DatabaseBackupService.listBackups(backupConfig),
        FilesBackupService.listBackups(backupConfig)
      ]);
      
      const dbStats = {
        count: dbBackups.length,
        totalSize: dbBackups.reduce((sum, backup) => sum + backup.size, 0),
        oldestBackup: dbBackups.length > 0 ? 
          dbBackups[dbBackups.length - 1].created : null,
        newestBackup: dbBackups.length > 0 ? 
          dbBackups[0].created : null
      };
      
      const fileStats = {
        count: fileBackups.length,
        totalSize: fileBackups.reduce((sum, backup) => sum + backup.size, 0),
        oldestBackup: fileBackups.length > 0 ? 
          fileBackups[fileBackups.length - 1].created : null,
        newestBackup: fileBackups.length > 0 ? 
          fileBackups[0].created : null
      };
      
      const stats = {
        database: {
          ...dbStats,
          totalSize: formatBackupSize(dbStats.totalSize)
        },
        files: {
          ...fileStats,
          totalSize: formatBackupSize(fileStats.totalSize)
        },
        total: {
          count: dbStats.count + fileStats.count,
          totalSize: formatBackupSize(dbStats.totalSize + fileStats.totalSize)
        },
        jobs: backupScheduler.getAllJobsStatus(),
        configuration: backupConfig
      };
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error: any) {
      logger.error('Failed to get backup stats', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to get backup statistics',
        error: error.message
      });
    }
  }
);

export default router;
