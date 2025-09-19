/**
 * Database Reset Script
 * Clears all data and reseeds the database
 */

import { sequelize } from '../config/database';
import { connectDatabase, syncModels } from '../config/database';
import { createDemoUserIfNeeded } from './createDemoUser';
import { seedDatabase } from './seedDatabase';

const resetDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Starting database reset...');

    // Connect to database
    await connectDatabase();

    // Force sync (this will drop all tables and recreate them)
    console.log('🗑️  Dropping all tables...');
    await sequelize.sync({ force: true });

    console.log('🏗️  Recreating tables...');
    await syncModels(false); // Don't force again

    // Create demo user
    console.log('👤 Creating demo user...');
    await createDemoUserIfNeeded();

    // Seed database with sample data
    console.log('🌱 Seeding database...');
    await seedDatabase();

    console.log('✅ Database reset completed successfully!');
    console.log('📋 You can now log in with:');
    console.log('   📧 Email: demo@demo.com');
    console.log('   🔑 Password: Demo123!');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
};

// Run reset if called directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('🎉 Database reset process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database reset failed:', error);
      process.exit(1);
    });
}

export { resetDatabase };