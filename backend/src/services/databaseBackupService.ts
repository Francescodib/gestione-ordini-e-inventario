/**
 * Database Backup Service
 * Service for backing up SQLite database with compression and retention management
 */

import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import crypto from 'crypto';
import yauzl from 'yauzl';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { 
  BackupConfig, 
  getBackupFileName, 
  getBackupFilePath, 
  formatBackupSize,
  shouldKeepBackup,
  getRetentionDate
} from '../config/backup';

const prisma = new PrismaClient();

export interface DatabaseBackupResult {
  success: boolean;
  backupPath?: string;
  size?: number;
  duration?: number;
  error?: string;
  metadata: {
    timestamp: Date;
    tables: string[];
    recordCounts: Record<string, number>;
    checksum?: string;
  };
}

export class DatabaseBackupService {
  
  /**
   * Create database backup
   */
  public static async createBackup(config: BackupConfig): Promise<DatabaseBackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    logger.info('Starting database backup', { timestamp });
    
    try {
      // Generate backup filename
      const fileName = getBackupFileName('database', timestamp);
      const backupPath = getBackupFilePath(config, fileName, '.db');
      const compressedPath = getBackupFilePath(config, fileName, '.db.zip');
      
      // Get database file path
      const dbPath = await this.getDatabasePath();
      if (!dbPath) {
        throw new Error('Database file not found');
      }
      
      // Ensure backup directory exists
      await fs.ensureDir(path.dirname(backupPath));
      
      // Get database metadata before backup
      const metadata = await this.getDatabaseMetadata(timestamp);
      
      // Create database backup (copy file)
      await fs.copy(dbPath, backupPath);
      logger.info('Database file copied', { from: dbPath, to: backupPath });
      
      let finalPath = backupPath;
      let finalSize = (await fs.stat(backupPath)).size;
      
      // Compress backup if enabled
      if (config.database.compression) {
        await this.compressBackup(backupPath, compressedPath);
        await fs.remove(backupPath); // Remove uncompressed version
        finalPath = compressedPath;
        finalSize = (await fs.stat(compressedPath)).size;
        logger.info('Database backup compressed', { 
          originalSize: formatBackupSize((await fs.stat(backupPath)).size),
          compressedSize: formatBackupSize(finalSize)
        });
      }
      
      // Generate checksum
      const checksum = await this.generateChecksum(finalPath);
      metadata.checksum = checksum;
      
      // Save backup metadata
      await this.saveBackupMetadata(finalPath, metadata);
      
      const duration = Date.now() - startTime;
      
      logger.info('Database backup completed successfully', {
        backupPath: finalPath,
        size: formatBackupSize(finalSize),
        duration: `${duration}ms`,
        tables: metadata.tables.length,
        records: Object.values(metadata.recordCounts).reduce((a, b) => a + b, 0)
      });
      
      // logUtils.logSystemAction('DATABASE_BACKUP_CREATED', `Backup created: ${path.basename(finalPath)}`);
      
      return {
        success: true,
        backupPath: finalPath,
        size: finalSize,
        duration,
        metadata
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Database backup failed', {
        error: error.message,
        duration: `${duration}ms`,
        timestamp
      });
      
      // logUtils.logSystemAction('DATABASE_BACKUP_FAILED', `Backup failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        duration,
        metadata: {
          timestamp,
          tables: [],
          recordCounts: {}
        }
      };
    }
  }
  
  /**
   * Get database file path
   */
  private static async getDatabasePath(): Promise<string | null> {
    try {
      // For SQLite, get the database URL from environment
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not found');
      }
      
      // Extract file path from database URL (file:./dev.db -> ./dev.db)
      const filePath = dbUrl.replace('file:', '');
      const fullPath = path.resolve(filePath);
      
      // Check if file exists
      if (await fs.pathExists(fullPath)) {
        return fullPath;
      }
      
      return null;
    } catch (error: any) {
      logger.error('Failed to get database path', { error: error.message });
      return null;
    }
  }
  
  /**
   * Get database metadata
   */
  private static async getDatabaseMetadata(timestamp: Date): Promise<DatabaseBackupResult['metadata']> {
    try {
      const metadata: DatabaseBackupResult['metadata'] = {
        timestamp,
        tables: [],
        recordCounts: {}
      };
      
      // Get all table names and record counts
      const tableQueries = [
        { name: 'users', query: () => prisma.user.count() },
        { name: 'categories', query: () => prisma.category.count() },
        { name: 'products', query: () => prisma.product.count() },
        { name: 'orders', query: () => prisma.order.count() },
        { name: 'orderItems', query: () => prisma.orderItem.count() },
        { name: 'productImages', query: () => prisma.productImage.count() },
        { name: 'userAvatars', query: () => prisma.userAvatar.count() },
        { name: 'uploadedFiles', query: () => prisma.uploadedFile.count() }
      ];
      
      for (const table of tableQueries) {
        try {
          const count = await table.query();
          metadata.tables.push(table.name);
          metadata.recordCounts[table.name] = count;
        } catch (error: any) {
          logger.warn(`Failed to count records in table ${table.name}`, { error: error.message });
          metadata.recordCounts[table.name] = 0;
        }
      }
      
      return metadata;
      
    } catch (error: any) {
      logger.error('Failed to get database metadata', { error: error.message });
      
      return {
        timestamp,
        tables: [],
        recordCounts: {}
      };
    }
  }
  
  /**
   * Compress backup file
   */
  private static async compressBackup(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      output.on('close', () => {
        logger.debug('Backup compression completed', {
          originalSize: formatBackupSize(archive.pointer()),
          outputPath
        });
        resolve();
      });
      
      archive.on('error', (err) => {
        logger.error('Backup compression failed', { error: err.message });
        reject(err);
      });
      
      archive.pipe(output);
      archive.file(inputPath, { name: path.basename(inputPath) });
      archive.finalize();
    });
  }
  
  /**
   * Generate backup checksum
   */
  private static async generateChecksum(filePath: string): Promise<string> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error: any) {
      logger.error('Failed to generate backup checksum', { error: error.message });
      return '';
    }
  }
  
  /**
   * Save backup metadata
   */
  private static async saveBackupMetadata(backupPath: string, metadata: DatabaseBackupResult['metadata']): Promise<void> {
    try {
      const metadataPath = `${backupPath}.meta.json`;
      const metadataContent = {
        ...metadata,
        backupPath,
        version: '1.0',
        type: 'database'
      };
      
      await fs.writeJson(metadataPath, metadataContent, { spaces: 2 });
      logger.debug('Backup metadata saved', { metadataPath });
    } catch (error: any) {
      logger.error('Failed to save backup metadata', { error: error.message });
    }
  }
  
  /**
   * Restore database from backup
   */
  public static async restoreBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Starting database restore', { backupPath });
      
      // Validate backup file exists
      if (!await fs.pathExists(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      // Get current database path
      const currentDbPath = await this.getDatabasePath();
      if (!currentDbPath) {
        throw new Error('Current database path not found');
      }
      
      // Create backup of current database before restore
      const backupCurrentPath = `${currentDbPath}.backup.${Date.now()}`;
      await fs.copy(currentDbPath, backupCurrentPath);
      
      // Close Prisma connection
      await prisma.$disconnect();
      
      try {
        // Restore database
        if (path.extname(backupPath) === '.zip') {
          // Extract compressed backup
          await this.extractBackup(backupPath, currentDbPath);
        } else {
          // Copy uncompressed backup
          await fs.copy(backupPath, currentDbPath);
        }
        
        logger.info('Database restore completed successfully', { backupPath });
        // logUtils.logSystemAction('DATABASE_RESTORE_COMPLETED', `Restored from: ${path.basename(backupPath)}`);
        
        return { success: true };
        
      } catch (restoreError: any) {
        // Restore failed, revert to original database
        await fs.copy(backupCurrentPath, currentDbPath);
        throw restoreError;
      } finally {
        // Reconnect Prisma
        await prisma.$connect();
        
        // Clean up temporary backup
        await fs.remove(backupCurrentPath);
      }
      
    } catch (error: any) {
      logger.error('Database restore failed', { error: error.message, backupPath });
      // logUtils.logSystemAction('DATABASE_RESTORE_FAILED', `Restore failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Extract compressed backup
   */
  private static async extractBackup(zipPath: string, extractTo: string): Promise<void> {
    // For simplicity, this is a basic implementation
    // In production, you might want to use a more robust unzip library
    
    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err: any, zipfile: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        zipfile.readEntry();
        zipfile.on('entry', (entry: any) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile.readEntry();
          } else {
            // File entry
            zipfile.openReadStream(entry, (err: any, readStream: any) => {
              if (err) {
                reject(err);
                return;
              }
              
              const writeStream = fs.createWriteStream(extractTo);
              readStream.pipe(writeStream);
              writeStream.on('close', () => {
                zipfile.readEntry();
              });
            });
          }
        });
        
        zipfile.on('end', () => {
          resolve();
        });
      });
    });
  }
  
  /**
   * List available backups
   */
  public static async listBackups(config: BackupConfig): Promise<Array<{
    path: string;
    name: string;
    size: number;
    created: Date;
    metadata?: any;
  }>> {
    try {
      const backupDir = config.storage.local.path;
      
      if (!await fs.pathExists(backupDir)) {
        return [];
      }
      
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('database_backup_') && 
        (file.endsWith('.db') || file.endsWith('.db.zip'))
      );
      
      const backups = [];
      
      for (const file of backupFiles) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        // Try to load metadata
        let metadata;
        const metadataPath = `${filePath}.meta.json`;
        if (await fs.pathExists(metadataPath)) {
          try {
            metadata = await fs.readJson(metadataPath);
          } catch {
            // Ignore metadata read errors
          }
        }
        
        backups.push({
          path: filePath,
          name: file,
          size: stats.size,
          created: stats.mtime,
          metadata
        });
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      return backups;
      
    } catch (error: any) {
      logger.error('Failed to list backups', { error: error.message });
      return [];
    }
  }
  
  /**
   * Clean old backups based on retention policy
   */
  public static async cleanOldBackups(config: BackupConfig): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    try {
      logger.info('Starting backup cleanup', { retention: config.database.retention });
      
      const backups = await this.listBackups(config);
      const retentionDate = getRetentionDate(config.database.retention.daily);
      
      let deletedCount = 0;
      const errors: string[] = [];
      
      for (const backup of backups) {
        if (!shouldKeepBackup(backup.path, retentionDate)) {
          try {
            await fs.remove(backup.path);
            
            // Also remove metadata file if exists
            const metadataPath = `${backup.path}.meta.json`;
            if (await fs.pathExists(metadataPath)) {
              await fs.remove(metadataPath);
            }
            
            deletedCount++;
            logger.debug('Old backup deleted', { 
              backup: backup.name,
              age: Math.round((Date.now() - backup.created.getTime()) / (1000 * 60 * 60 * 24))
            });
            
          } catch (error: any) {
            const errorMsg = `Failed to delete ${backup.name}: ${error.message}`;
            errors.push(errorMsg);
            logger.error('Failed to delete old backup', { 
              backup: backup.name, 
              error: error.message 
            });
          }
        }
      }
      
      if (deletedCount > 0) {
        logger.info('Backup cleanup completed', { deletedCount, errors: errors.length });
        // logUtils.logSystemAction('BACKUP_CLEANUP_COMPLETED', `Deleted ${deletedCount} old backups`);
      }
      
      return { deletedCount, errors };
      
    } catch (error: any) {
      logger.error('Backup cleanup failed', { error: error.message });
      return { deletedCount: 0, errors: [error.message] };
    }
  }
  
  /**
   * Verify backup integrity
   */
  public static async verifyBackup(backupPath: string): Promise<{
    valid: boolean;
    error?: string;
    checksumMatch?: boolean;
  }> {
    try {
      // Check if backup file exists
      if (!await fs.pathExists(backupPath)) {
        return { valid: false, error: 'Backup file not found' };
      }
      
      // Check file size
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        return { valid: false, error: 'Backup file is empty' };
      }
      
      // Try to load metadata and verify checksum
      const metadataPath = `${backupPath}.meta.json`;
      if (await fs.pathExists(metadataPath)) {
        try {
          const metadata = await fs.readJson(metadataPath);
          if (metadata.checksum) {
            const currentChecksum = await this.generateChecksum(backupPath);
            const checksumMatch = currentChecksum === metadata.checksum;
            
            if (!checksumMatch) {
              return { 
                valid: false, 
                error: 'Checksum mismatch - backup may be corrupted',
                checksumMatch: false
              };
            }
            
            return { valid: true, checksumMatch: true };
          }
        } catch (error: any) {
          logger.warn('Failed to verify backup checksum', { error: error.message });
        }
      }
      
      // Basic validation passed
      return { valid: true };
      
    } catch (error: any) {
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }
}
