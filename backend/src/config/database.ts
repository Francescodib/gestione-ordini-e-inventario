/**
 * Database configuration with Prisma Client
 * File: src/config/database.ts
 */

import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma Client instance
 * Ensures single instance across the application
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Create Prisma Client with configuration
 */
const createPrismaClient = () => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
  });

  return prisma;
};

/**
 * Singleton Prisma Client instance
 * Prevents multiple instances in development with hot reload
 */
export const prisma = globalThis.__prisma || createPrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

/**
 * Connect to database
 * Tests the connection and logs status
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    console.log(`📍 Database: SQLite (${process.env.DATABASE_URL || './dev.db'})`);
    
    // Log database info in development
    if (process.env.NODE_ENV === 'development') {
      const userCount = await prisma.user.count();
      console.log(`👥 Users in database: ${userCount}`);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

/**
 * Disconnect from database
 * Gracefully close all connections
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('👋 Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
};

/**
 * Handle process termination
 * Ensures database connection is closed properly
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

/**
 * Database health check
 * Verifies database is accessible
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};