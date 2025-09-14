/**
 * Manual Database Backup Script
 * Script for creating manual database backups from command line
 */

import { DatabaseBackupService } from '../services/databaseBackupService';
import { backupConfig, formatBackupSize } from '../config/backup';
import { logger } from '../config/logger';

/**
 * Main backup function
 */
async function createDatabaseBackup(): Promise<void> {
  try {
    console.log('🗄️  Starting manual database backup...\n');
    
    // Show configuration
    console.log('📋 Backup Configuration:');
    console.log(`   • Compression: ${backupConfig.database.compression ? '✅' : '❌'}`);
    console.log(`   • Storage Path: ${backupConfig.storage.local.path}`);
    console.log(`   • Retention: ${backupConfig.database.retention.daily} days\n`);
    
    // Create backup
    const startTime = Date.now();
    const result = await DatabaseBackupService.createBackup(backupConfig);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log('✅ Database backup completed successfully!\n');
      console.log('📊 Backup Details:');
      console.log(`   • File: ${result.backupPath}`);
      console.log(`   • Size: ${formatBackupSize(result.size || 0)}`);
      console.log(`   • Duration: ${duration}ms`);
      console.log(`   • Tables: ${result.metadata.tables.length}`);
      console.log(`   • Records: ${Object.values(result.metadata.recordCounts).reduce((a, b) => a + b, 0)}`);
      
      if (result.metadata.checksum) {
        console.log(`   • Checksum: ${result.metadata.checksum.substring(0, 16)}...`);
      }
      
      console.log('\n🎉 Database backup ready for use!');
      
    } else {
      console.error('❌ Database backup failed!');
      console.error(`   Error: ${result.error}`);
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('❌ Backup script failed:', error.message);
    logger.error('Manual backup script failed', { error: error.message });
    process.exit(1);
  }
}

/**
 * Handle command line arguments
 */
function parseArguments(): { compress?: boolean; path?: string } {
  const args = process.argv.slice(2);
  const options: { compress?: boolean; path?: string } = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--no-compress':
        options.compress = false;
        break;
      case '--compress':
        options.compress = true;
        break;
      case '--path':
        if (i + 1 < args.length) {
          options.path = args[i + 1];
          i++;
        }
        break;
      case '--help':
        console.log('📚 Database Backup Script Usage:');
        console.log('');
        console.log('npm run backup:database [options]');
        console.log('');
        console.log('Options:');
        console.log('  --compress      Enable compression (default)');
        console.log('  --no-compress   Disable compression');
        console.log('  --path <path>   Custom backup directory');
        console.log('  --help          Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  npm run backup:database');
        console.log('  npm run backup:database -- --no-compress');
        console.log('  npm run backup:database -- --path /custom/backup/path');
        process.exit(0);
        break;
    }
  }
  
  return options;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('💾 Database Backup Tool');
  console.log('========================\n');
  
  const options = parseArguments();
  
  // Update configuration with command line options
  if (options.compress !== undefined) {
    backupConfig.database.compression = options.compress;
  }
  
  if (options.path) {
    backupConfig.storage.local.path = options.path;
  }
  
  await createDatabaseBackup();
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}
