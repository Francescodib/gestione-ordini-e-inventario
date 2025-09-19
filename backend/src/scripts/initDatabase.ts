#!/usr/bin/env tsx

/**
 * Database Initialization Script
 * File: src/scripts/initDatabase.ts
 *
 * Manually initialize database and required directories
 * Usage: npm run db:init
 */

import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase, syncModels, getDatabaseInfo, checkTablesExist } from '../config/database';
import { setupRequiredDirectories, getDirectoryStatus } from '../utils/directorySetup';
import { createDemoUserIfNeeded } from './createDemoUser';

// Load environment variables
dotenv.config();

/**
 * Main initialization function
 */
async function initializeDatabase() {
  console.log('🚀 QuickStock Solutions - Database Initialization');
  console.log('================================================');

  try {
    // Step 1: Setup directories
    console.log('\n📁 Step 1: Setting up required directories...');
    await setupRequiredDirectories();

    // Show directory status
    const dirStatus = await getDirectoryStatus();
    console.log('\n📊 Directory Status:');
    dirStatus.forEach(dir => {
      const status = dir.exists
        ? (dir.writable ? '✅ OK' : '⚠️  Read-only')
        : '❌ Missing';
      console.log(`   ${status} ${dir.path} - ${dir.description}`);
    });

    // Step 2: Database connection
    console.log('\n🔌 Step 2: Connecting to database...');
    await connectDatabase();

    // Step 3: Check existing tables
    console.log('\n🔍 Step 3: Checking existing database structure...');
    const hasExistingTables = await checkTablesExist();

    // Step 4: Sync models (create/update tables)
    console.log('\n🔄 Step 4: Synchronizing database models...');
    await syncModels(false); // Don't force, use smart sync

    // Step 5: Get database info
    console.log('\n📊 Step 5: Database information...');
    await getDatabaseInfo();

    // Step 6: Create demo user if needed
    console.log('\n👤 Step 6: Setting up demo user...');
    await createDemoUserIfNeeded();

    // Success summary
    console.log('\n✅ Database Initialization Completed Successfully!');
    console.log('================================================');
    console.log('📋 Summary:');
    console.log('   - Required directories: created/verified');
    console.log('   - Database connection: established');
    console.log('   - Database schema: synchronized');
    console.log('   - Demo user: available (demo@demo.com / Demo123!)');
    console.log('');
    console.log('🚀 You can now start the server with: npm run dev');

  } catch (error) {
    console.error('\n❌ Database Initialization Failed!');
    console.error('================================================');
    console.error('Error details:', error);
    process.exit(1);
  }
}

/**
 * Force initialization (recreate everything)
 */
async function forceInitialize() {
  console.log('🔥 QuickStock Solutions - FORCE Database Initialization');
  console.log('⚠️  WARNING: This will DELETE all existing data!');
  console.log('================================================');

  try {
    // Setup directories
    await setupRequiredDirectories();

    // Connect to database
    await connectDatabase();

    // Force sync (recreate all tables)
    console.log('\n🔥 Force synchronizing database (recreating all tables)...');
    await syncModels(true); // Force sync

    // Create demo user
    await createDemoUserIfNeeded();

    console.log('\n✅ Force Initialization Completed!');
    console.log('⚠️  All previous data has been deleted.');

  } catch (error) {
    console.error('\n❌ Force Initialization Failed!');
    console.error('Error details:', error);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log('QuickStock Solutions - Database Initialization');
  console.log('==============================================');
  console.log('');
  console.log('Usage:');
  console.log('  npm run db:init           Initialize database and directories');
  console.log('  npm run db:init -- --force  Force initialization (deletes all data)');
  console.log('  npm run db:init -- --help   Show this help');
  console.log('');
  console.log('What this script does:');
  console.log('  1. Creates required directories (logs, uploads, backups)');
  console.log('  2. Connects to SQLite database');
  console.log('  3. Creates/updates database tables');
  console.log('  4. Creates demo user if none exists');
  console.log('');
  console.log('Demo User Credentials:');
  console.log('  Email: demo@demo.com');
  console.log('  Password: Demo123!');
  console.log('  Role: ADMIN');
}

// Command line argument handling
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
} else if (args.includes('--force') || args.includes('-f')) {
  forceInitialize();
} else {
  initializeDatabase();
}