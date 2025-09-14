/**
 * Files Backup Service
 * Service for backing up file system directories with compression and exclusions
 */

import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import crypto from 'crypto';
import yauzl from 'yauzl';
import { glob } from 'glob';
import { logger } from '../config/logger';
import { 
  BackupConfig, 
  getBackupFileName, 
  getBackupFilePath, 
  formatBackupSize,
  shouldKeepBackup,
  getRetentionDate
} from '../config/backup';

export interface FilesBackupResult {
  success: boolean;
  backupPath?: string;
  size?: number;
  duration?: number;
  error?: string;
  metadata: {
    timestamp: Date;
    directories: string[];
    fileCount: number;
    totalSize: number;
    exclusions: string[];
    checksum?: string;
  };
}

export class FilesBackupService {
  
  /**
   * Create files backup
   */
  public static async createBackup(config: BackupConfig): Promise<FilesBackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    logger.info('Starting files backup', { timestamp, directories: config.files.directories });
    
    try {
      // Generate backup filename
      const fileName = getBackupFileName('files', timestamp);
      const backupPath = getBackupFilePath(config, fileName, '.zip');
      
      // Ensure backup directory exists
      await fs.ensureDir(path.dirname(backupPath));
      
      // Collect files to backup
      const filesToBackup = await this.collectFiles(config);
      
      if (filesToBackup.length === 0) {
        logger.warn('No files found to backup');
      }
      
      // Create backup metadata
      const metadata: FilesBackupResult['metadata'] = {
        timestamp,
        directories: config.files.directories,
        fileCount: filesToBackup.length,
        totalSize: 0,
        exclusions: config.files.exclusions
      };
      
      // Calculate total size
      for (const filePath of filesToBackup) {
        try {
          const stats = await fs.stat(filePath);
          metadata.totalSize += stats.size;
        } catch {
          // Ignore files that can't be accessed
        }
      }
      
      // Create compressed backup
      const finalSize = await this.createArchive(filesToBackup, backupPath);
      
      // Generate checksum
      const checksum = await this.generateChecksum(backupPath);
      metadata.checksum = checksum;
      
      // Save backup metadata
      await this.saveBackupMetadata(backupPath, metadata);
      
      const duration = Date.now() - startTime;
      
      logger.info('Files backup completed successfully', {
        backupPath,
        fileCount: metadata.fileCount,
        originalSize: formatBackupSize(metadata.totalSize),
        compressedSize: formatBackupSize(finalSize),
        compressionRatio: `${Math.round((1 - finalSize / metadata.totalSize) * 100)}%`,
        duration: `${duration}ms`
      });
      
      logUtils.logSystemAction('FILES_BACKUP_CREATED', 
        `Backup created: ${path.basename(backupPath)} (${metadata.fileCount} files)`
      );
      
      return {
        success: true,
        backupPath,
        size: finalSize,
        duration,
        metadata
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Files backup failed', {
        error: error.message,
        duration: `${duration}ms`,
        timestamp
      });
      
      logUtils.logSystemAction('FILES_BACKUP_FAILED', `Backup failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        duration,
        metadata: {
          timestamp,
          directories: config.files.directories,
          fileCount: 0,
          totalSize: 0,
          exclusions: config.files.exclusions
        }
      };
    }
  }
  
  /**
   * Collect files to backup based on configuration
   */
  private static async collectFiles(config: BackupConfig): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const directory of config.files.directories) {
      try {
        const directoryPath = path.resolve(directory);
        
        // Check if directory exists
        if (!await fs.pathExists(directoryPath)) {
          logger.warn(`Backup directory not found: ${directoryPath}`);
          continue;
        }
        
        // Find all files in directory
        const pattern = path.join(directoryPath, '**/*');
        const files = await glob(pattern, {
          nodir: true,  // Only files, not directories
          dot: false,   // Exclude hidden files
          ignore: config.files.exclusions.map(exclusion => 
            path.join(directoryPath, exclusion)
          )
        });
        
        allFiles.push(...files);
        
        logger.debug(`Found ${files.length} files in ${directory}`);
        
      } catch (error: any) {
        logger.error(`Failed to collect files from ${directory}`, { error: error.message });
      }
    }
    
    // Remove duplicates and sort
    const uniqueFiles = [...new Set(allFiles)].sort();
    
    logger.info(`Collected ${uniqueFiles.length} files for backup`);
    
    return uniqueFiles;
  }
  
  /**
   * Create compressed archive
   */
  private static async createArchive(filePaths: string[], outputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 6 } // Balanced compression
      });
      
      let filesAdded = 0;
      let filesSkipped = 0;
      
      output.on('close', () => {
        logger.info('Archive created successfully', {
          outputPath,
          filesAdded,
          filesSkipped,
          totalSize: formatBackupSize(archive.pointer())
        });
        resolve(archive.pointer());
      });
      
      archive.on('error', (err) => {
        logger.error('Archive creation failed', { error: err.message });
        reject(err);
      });
      
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          logger.warn('File not found during archive creation', { error: err.message });
          filesSkipped++;
        } else {
          logger.error('Archive warning', { error: err.message });
        }
      });
      
      archive.pipe(output);
      
      // Add files to archive
      const projectRoot = process.cwd();
      
      for (const filePath of filePaths) {
        try {
          // Calculate relative path from project root
          const relativePath = path.relative(projectRoot, filePath);
          
          // Add file to archive
          archive.file(filePath, { name: relativePath });
          filesAdded++;
          
        } catch (error: any) {
          logger.warn(`Failed to add file to archive: ${filePath}`, { error: error.message });
          filesSkipped++;
        }
      }
      
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
  private static async saveBackupMetadata(backupPath: string, metadata: FilesBackupResult['metadata']): Promise<void> {
    try {
      const metadataPath = `${backupPath}.meta.json`;
      const metadataContent = {
        ...metadata,
        backupPath,
        version: '1.0',
        type: 'files'
      };
      
      await fs.writeJson(metadataPath, metadataContent, { spaces: 2 });
      logger.debug('Backup metadata saved', { metadataPath });
    } catch (error: any) {
      logger.error('Failed to save backup metadata', { error: error.message });
    }
  }
  
  /**
   * Restore files from backup
   */
  public static async restoreBackup(backupPath: string, targetDirectory?: string): Promise<{
    success: boolean;
    extractedFiles?: number;
    error?: string;
  }> {
    try {
      logger.info('Starting files restore', { backupPath, targetDirectory });
      
      // Validate backup file exists
      if (!await fs.pathExists(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      // Determine extraction directory
      const extractDir = targetDirectory || process.cwd();
      
      // Load backup metadata
      const metadataPath = `${backupPath}.meta.json`;
      let metadata;
      if (await fs.pathExists(metadataPath)) {
        metadata = await fs.readJson(metadataPath);
      }
      
      // Extract archive
      const extractedFiles = await this.extractArchive(backupPath, extractDir);
      
      logger.info('Files restore completed successfully', {
        backupPath,
        extractedFiles,
        targetDirectory: extractDir
      });
      
      logUtils.logSystemAction('FILES_RESTORE_COMPLETED', 
        `Restored ${extractedFiles} files from: ${path.basename(backupPath)}`
      );
      
      return {
        success: true,
        extractedFiles
      };
      
    } catch (error: any) {
      logger.error('Files restore failed', { error: error.message, backupPath });
      logUtils.logSystemAction('FILES_RESTORE_FAILED', `Restore failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Extract archive
   */
  private static async extractArchive(zipPath: string, extractTo: string): Promise<number> {
    
    return new Promise((resolve, reject) => {
      let extractedFiles = 0;
      
      yauzl.open(zipPath, { lazyEntries: true }, (err: any, zipfile: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        zipfile.readEntry();
        
        zipfile.on('entry', async (entry: any) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            const dirPath = path.join(extractTo, entry.fileName);
            await fs.ensureDir(dirPath);
            zipfile.readEntry();
          } else {
            // File entry
            const filePath = path.join(extractTo, entry.fileName);
            
            // Ensure parent directory exists
            await fs.ensureDir(path.dirname(filePath));
            
            zipfile.openReadStream(entry, (err: any, readStream: any) => {
              if (err) {
                logger.error(`Failed to extract file: ${entry.fileName}`, { error: err.message });
                zipfile.readEntry();
                return;
              }
              
              const writeStream = fs.createWriteStream(filePath);
              readStream.pipe(writeStream);
              
              writeStream.on('close', () => {
                extractedFiles++;
                zipfile.readEntry();
              });
              
              writeStream.on('error', (err) => {
                logger.error(`Failed to write file: ${filePath}`, { error: err.message });
                zipfile.readEntry();
              });
            });
          }
        });
        
        zipfile.on('end', () => {
          resolve(extractedFiles);
        });
        
        zipfile.on('error', (err: any) => {
          reject(err);
        });
      });
    });
  }
  
  /**
   * List available file backups
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
        file.startsWith('files_backup_') && file.endsWith('.zip')
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
      logger.error('Failed to list file backups', { error: error.message });
      return [];
    }
  }
  
  /**
   * Clean old file backups based on retention policy
   */
  public static async cleanOldBackups(config: BackupConfig): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    try {
      logger.info('Starting file backup cleanup');
      
      const backups = await this.listBackups(config);
      const retentionDate = getRetentionDate(config.database.retention.daily); // Use same retention as database
      
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
            logger.debug('Old file backup deleted', { 
              backup: backup.name,
              age: Math.round((Date.now() - backup.created.getTime()) / (1000 * 60 * 60 * 24))
            });
            
          } catch (error: any) {
            const errorMsg = `Failed to delete ${backup.name}: ${error.message}`;
            errors.push(errorMsg);
            logger.error('Failed to delete old file backup', { 
              backup: backup.name, 
              error: error.message 
            });
          }
        }
      }
      
      if (deletedCount > 0) {
        logger.info('File backup cleanup completed', { deletedCount, errors: errors.length });
        logUtils.logSystemAction('FILE_BACKUP_CLEANUP_COMPLETED', `Deleted ${deletedCount} old file backups`);
      }
      
      return { deletedCount, errors };
      
    } catch (error: any) {
      logger.error('File backup cleanup failed', { error: error.message });
      return { deletedCount: 0, errors: [error.message] };
    }
  }
  
  /**
   * Verify file backup integrity
   */
  public static async verifyBackup(backupPath: string): Promise<{
    valid: boolean;
    error?: string;
    checksumMatch?: boolean;
    fileCount?: number;
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
      
      // Try to open and count files in archive
        
      const fileCount = await new Promise<number>((resolve, reject) => {
        let count = 0;
        
        yauzl.open(backupPath, { lazyEntries: true }, (err: any, zipfile: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          zipfile.readEntry();
          
          zipfile.on('entry', (entry: any) => {
            if (!/\/$/.test(entry.fileName)) {
              count++; // Count files, not directories
            }
            zipfile.readEntry();
          });
          
          zipfile.on('end', () => {
            resolve(count);
          });
          
          zipfile.on('error', reject);
        });
      });
      
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
                checksumMatch: false,
                fileCount
              };
            }
            
            return { valid: true, checksumMatch: true, fileCount };
          }
        } catch (error: any) {
          logger.warn('Failed to verify file backup checksum', { error: error.message });
        }
      }
      
      // Basic validation passed
      return { valid: true, fileCount };
      
    } catch (error: any) {
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }
}
