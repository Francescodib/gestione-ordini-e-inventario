/**
 * File Upload Service - TEMPORARY STUB
 * This service is temporarily disabled while migrating from Prisma to Sequelize
 * All file operations will throw errors until properly implemented
 */

import { logger } from '../config/logger';

/**
 * Temporary stub class for FileService
 * All methods throw errors to prevent crashes during Prisma removal
 */
export class FileService {
  static async uploadProductImage(...args: any[]): Promise<any> {
    logger.warn('FileService::uploadProductImage called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async getProductImages(...args: any[]): Promise<any> {
    logger.warn('FileService::getProductImages called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async updateProductImages(...args: any[]): Promise<any> {
    logger.warn('FileService::updateProductImages called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async deleteProductImage(...args: any[]): Promise<any> {
    logger.warn('FileService::deleteProductImage called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async setPrimaryProductImage(...args: any[]): Promise<any> {
    logger.warn('FileService::setPrimaryProductImage called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async uploadUserAvatar(...args: any[]): Promise<any> {
    logger.warn('FileService::uploadUserAvatar called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async getUserAvatar(...args: any[]): Promise<any> {
    logger.warn('FileService::getUserAvatar called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async deleteUserAvatar(...args: any[]): Promise<any> {
    logger.warn('FileService::deleteUserAvatar called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async uploadProductImages(...args: any[]): Promise<any> {
    logger.warn('FileService::uploadProductImages called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async uploadAvatar(...args: any[]): Promise<any> {
    logger.warn('FileService::uploadAvatar called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async uploadDocument(...args: any[]): Promise<any> {
    logger.warn('FileService::uploadDocument called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async getFilesByEntity(...args: any[]): Promise<any> {
    logger.warn('FileService::getFilesByEntity called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async uploadGenericFile(...args: any[]): Promise<any> {
    logger.warn('FileService::uploadGenericFile called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async getUploadedFiles(...args: any[]): Promise<any> {
    logger.warn('FileService::getUploadedFiles called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async deleteUploadedFile(...args: any[]): Promise<any> {
    logger.warn('FileService::deleteUploadedFile called but service is disabled during Prisma migration');
    throw new Error('File service temporarily disabled - needs Sequelize implementation');
  }

  static async getFileStats(...args: any[]): Promise<any> {
    logger.warn('FileService::getFileStats called but service is disabled during Prisma migration');
    return {
      totalFiles: 0,
      totalSize: 0,
      productImages: 0,
      userAvatars: 0,
      documents: 0,
      orphanedFiles: 0
    };
  }

  static async cleanupOrphanedFiles(...args: any[]): Promise<any> {
    logger.warn('FileService::cleanupOrphanedFiles called but service is disabled during Prisma migration');
    return {
      deletedFiles: 0,
      reclaimedSpace: 0
    };
  }
}

export default FileService;