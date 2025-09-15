/**
 * Sequelize database configuration
 * File: src/config/sequelize.ts
 */

import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';

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
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

/**
 * Test database connection
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    console.log(`Database: SQLite (${sequelize.getDatabaseName()})`);
    
    // Log database info in development
    if (process.env.NODE_ENV === 'development') {
      const [results] = await sequelize.query("SELECT COUNT(*) as count FROM users", { raw: true });
      const userCount = Array.isArray(results) && results.length > 0 ? (results[0] as any).count : 0;
      console.log(`Users in database: ${userCount}`);
    }
    
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Disconnect from database
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('Database disconnected');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
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
    console.error('Database health check failed:', error);
    return false;
  }
};

/**
 * Sync all models with database (create tables)
 */
export const syncModels = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    console.log('Database models synchronized');
  } catch (error) {
    console.error('Database sync failed:', error);
    throw error;
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