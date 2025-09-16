/**
 * Directory Setup Utilities
 * File: src/utils/directorySetup.ts
 *
 * Ensures all required directories exist for the application
 */

import fs from 'fs';
import path from 'path';

export interface DirectoryConfig {
  path: string;
  description: string;
  required: boolean;
}

/**
 * Default directory structure
 */
export const DEFAULT_DIRECTORIES: DirectoryConfig[] = [
  {
    path: 'logs',
    description: 'Application logs',
    required: true
  },
  {
    path: 'uploads',
    description: 'File uploads root',
    required: true
  },
  {
    path: 'uploads/products',
    description: 'Product images',
    required: true
  },
  {
    path: 'uploads/avatars',
    description: 'User avatars',
    required: true
  },
  {
    path: 'uploads/documents',
    description: 'Document uploads',
    required: true
  },
  {
    path: 'backups',
    description: 'System backups',
    required: true
  },
  {
    path: 'backups/database',
    description: 'Database backups',
    required: true
  },
  {
    path: 'backups/files',
    description: 'File backups',
    required: true
  }
];

/**
 * Create directory if it doesn't exist
 */
export const ensureDirectoryExists = async (dirPath: string): Promise<boolean> => {
  try {
    const fullPath = path.resolve(dirPath);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${fullPath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Failed to create directory ${dirPath}:`, error);
    throw error;
  }
};

/**
 * Check if directory exists and is writable
 */
export const checkDirectoryAccess = async (dirPath: string): Promise<boolean> => {
  try {
    const fullPath = path.resolve(dirPath);

    if (!fs.existsSync(fullPath)) {
      return false;
    }

    // Test write access
    fs.accessSync(fullPath, fs.constants.W_OK);
    return true;
  } catch (error) {
    console.error(`❌ Directory access check failed for ${dirPath}:`, error);
    return false;
  }
};

/**
 * Setup all required directories
 */
export const setupRequiredDirectories = async (directories: DirectoryConfig[] = DEFAULT_DIRECTORIES): Promise<void> => {
  console.log('🚀 Setting up required directories...');

  let createdCount = 0;
  let errorCount = 0;

  for (const dir of directories) {
    try {
      const wasCreated = await ensureDirectoryExists(dir.path);
      if (wasCreated) {
        createdCount++;
      }

      // Verify access
      const hasAccess = await checkDirectoryAccess(dir.path);
      if (!hasAccess) {
        console.warn(`⚠️  Directory exists but may not be writable: ${dir.path}`);
      }

    } catch (error) {
      errorCount++;
      if (dir.required) {
        console.error(`❌ Failed to setup required directory: ${dir.path}`);
        throw new Error(`Required directory setup failed: ${dir.path}`);
      } else {
        console.warn(`⚠️  Optional directory setup failed: ${dir.path}`);
      }
    }
  }

  console.log(`✅ Directory setup completed:`);
  console.log(`   - Created: ${createdCount} directories`);
  console.log(`   - Verified: ${directories.length - createdCount} existing directories`);

  if (errorCount > 0) {
    console.warn(`   - Errors: ${errorCount} directories had issues`);
  }
};

/**
 * Get directory status report
 */
export const getDirectoryStatus = async (directories: DirectoryConfig[] = DEFAULT_DIRECTORIES): Promise<{ path: string; exists: boolean; writable: boolean; description: string }[]> => {
  const status = [];

  for (const dir of directories) {
    const exists = fs.existsSync(path.resolve(dir.path));
    const writable = exists ? await checkDirectoryAccess(dir.path) : false;

    status.push({
      path: dir.path,
      exists,
      writable,
      description: dir.description
    });
  }

  return status;
};

/**
 * Cleanup empty directories (useful for testing)
 */
export const cleanupEmptyDirectories = async (directories: DirectoryConfig[]): Promise<void> => {
  for (const dir of directories.reverse()) {
    try {
      const fullPath = path.resolve(dir.path);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        if (files.length === 0) {
          fs.rmdirSync(fullPath);
          console.log(`🗑️  Removed empty directory: ${fullPath}`);
        }
      }
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
};