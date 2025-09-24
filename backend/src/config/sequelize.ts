/**
 * Sequelize database configuration
 * File: src/config/sequelize.ts
 */

import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

/**
 * Initialize Sequelize instance with SQLite
 */
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_URL?.replace('file:', '') || path.join(__dirname, '../../dev.db'),
  logging: process.env.NODE_ENV === 'development'
    ? (sql: string) => console.log('SQL:', sql)
    : false,

  // SQLite specific configuration
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true
  },

  // Connection pool configuration
  pool: {
    max: 1, // SQLite works better with single connection
    min: 0,
    acquire: 60000, // Increase timeout for acquiring connections
    idle: 10000
  },

  // SQLite-specific optimizations
  dialectOptions: {
    // Enable Write-Ahead Logging for better concurrency
    options: {
      PRAGMA: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        busy_timeout: 30000, // 30 second timeout for locked database
        cache_size: 1000,
        temp_store: 'memory'
      }
    }
  },

  // Transaction retry configuration
  retry: {
    max: 3,
    backoffBase: 1000,
    backoffExponent: 1.5
  }
});

/**
 * Configure SQLite optimizations
 */
export const configureSQLiteOptimizations = async (): Promise<void> => {
  try {
    // Enable WAL mode for better concurrency
    await sequelize.query('PRAGMA journal_mode = WAL;');
    await sequelize.query('PRAGMA synchronous = NORMAL;');
    await sequelize.query('PRAGMA busy_timeout = 30000;');
    await sequelize.query('PRAGMA cache_size = 1000;');
    await sequelize.query('PRAGMA temp_store = memory;');
    await sequelize.query('PRAGMA foreign_keys = ON;');
    logger.info('✅ SQLite optimizations configured');
  } catch (error) {
    logger.warn('⚠️  SQLite optimization configuration failed:', error);
  }
};

/**
 * Test database connection
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    logger.info(`Database: SQLite (${sequelize.getDatabaseName()})`);

    // Configure SQLite optimizations
    await configureSQLiteOptimizations();

  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Disconnect from database
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
};

/**
 * Database health check
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

/**
 * Check if database tables exist
 */
export const checkTablesExist = async (): Promise<boolean> => {
  try {
    const [results] = await sequelize.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `, { raw: true });

    const tables = Array.isArray(results) ? results.map((row: any) => row.name) : [];
    logger.info(`Found ${tables.length} existing tables:`, tables.join(', ') || 'none');

    return tables.length > 0;
  } catch (error) {
    logger.info('No existing tables found (new database)');
    return false;
  }
};

/**
 * Sync all models with database (create tables)
 */
export const syncModels = async (force: boolean = false): Promise<void> => {
  try {
    logger.info('🔄 Synchronizing database models...');

    // Check current state
    const hasExistingTables = await checkTablesExist();

    if (hasExistingTables && !force) {
      logger.info('📋 Existing tables found, attempting safe sync (alter: false to avoid FK issues)');
      try {
        // Try safer sync first
        await sequelize.sync({ alter: false });
        logger.info('✅ Database models synchronized safely');
      } catch (alterError) {
        logger.warn('⚠️  Safe sync failed, trying force sync to resolve issues...');
        await sequelize.sync({ force: true });
        logger.info('✅ Database models force synchronized (all tables recreated)');
      }
    } else if (force) {
      logger.info('🔥 Force sync requested - recreating all tables');
      await sequelize.sync({ force: true });
      logger.info('✅ Database models force synchronized (all tables recreated)');
    } else {
      logger.info('🆕 No existing tables found, creating new database schema');
      await sequelize.sync({ force: false });
      logger.info('✅ Database models synchronized (new tables created)');
    }

    // Verify sync was successful by checking final table count
    await checkTablesExist();

  } catch (error) {
    logger.error('❌ Database sync failed:', error);
    throw error;
  }
};

/**
 * Get database information for debugging
 */
export const getDatabaseInfo = async (): Promise<void> => {
  try {
    // Get user count (safe query after sync)
    if (process.env.NODE_ENV === 'development') {
      try {
        const [results] = await sequelize.query("SELECT COUNT(*) as count FROM users", { raw: true });
        const userCount = Array.isArray(results) && results.length > 0 ? (results[0] as any).count : 0;
        logger.info(`👥 Users in database: ${userCount}`);
      } catch (error) {
        logger.info('👥 Users table not yet populated or accessible');
      }
    }
  } catch (error) {
    logger.info('ℹ️  Database info query skipped (table may not exist yet)');
  }
};

/**
 * Handle process termination
 */
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export { sequelize };
export default sequelize;