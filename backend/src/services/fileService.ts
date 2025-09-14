/**
 * File Upload Service
 * Handles file upload operations, image processing, and file management
 */

import { prisma } from '../config/database';
import { FileUploadUtil, UPLOAD_CONFIG } from '../config/upload';
import { logger, logUtils } from '../config/logger';
import path from 'path';
// Note: File types are defined inline in this service for now
// Future migration: move to ../types/file.ts

/**
 * File upload interfaces
 */
export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  type: FileType;
  entityId?: string;
  entityType?: EntityType;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImageUpload {
  id: string;
  productId: string;
  filename: string;
  originalName: string;
  paths: {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  };
  urls: {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  };
  isPrimary: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface AvatarUpload {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  paths: {
    small: string;
    medium: string;
    large: string;
  };
  urls: {
    small: string;
    medium: string;
    large: string;
  };
  createdAt: Date;
}

export type FileType = 'image' | 'document' | 'avatar';
export type EntityType = 'product' | 'user' | 'category' | 'order';

/**
 * File upload request interfaces
 */
export interface UploadProductImagesRequest {
  productId: string;
  files: Express.Multer.File[];
  isPrimary?: boolean[];
}

export interface UploadAvatarRequest {
  userId: string;
  file: Express.Multer.File;
}

export interface UploadDocumentRequest {
  file: Express.Multer.File;
  entityId?: string;
  entityType?: EntityType;
  description?: string;
}

/**
 * File Service Class
 */
export class FileService {

  // ==========================================
  // PRODUCT IMAGE UPLOAD
  // ==========================================

  /**
   * Upload product images
   */
  static async uploadProductImages(request: UploadProductImagesRequest): Promise<ProductImageUpload[]> {
    try {
      const { productId, files, isPrimary = [] } = request;

      // Verify product exists
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      logUtils.logUserAction('system', 'upload_product_images', {
        productId,
        fileCount: files.length
      });

      const uploadResults: ProductImageUpload[] = [];

      // Get current image count for sort order
      const currentImages = await prisma.productImage.count({
        where: { productId }
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = FileUploadUtil.generateFilename(file.originalname, 'product');
        const isThisPrimary = isPrimary[i] === true;

        // Process images (multiple sizes)
        const imagePaths = await FileUploadUtil.processProductImages(
          file.buffer,
          filename,
          productId
        );

        // Generate URLs
        const baseUrl = '/api/files/uploads';
        const urls = {
          thumbnail: `${baseUrl}/${imagePaths.thumbnail}`,
          medium: `${baseUrl}/${imagePaths.medium}`,
          large: `${baseUrl}/${imagePaths.large}`,
          original: `${baseUrl}/${imagePaths.original}`
        };

        // Save to database
        const productImage = await prisma.productImage.create({
          data: {
            productId,
            filename,
            originalName: file.originalname,
            thumbnailPath: imagePaths.thumbnail,
            mediumPath: imagePaths.medium,
            largePath: imagePaths.large,
            originalPath: imagePaths.original,
            isPrimary: isThisPrimary,
            sortOrder: currentImages + i,
            fileSize: file.size,
            mimetype: file.mimetype
          }
        });

        uploadResults.push({
          id: productImage.id,
          productId,
          filename,
          originalName: file.originalname,
          paths: imagePaths,
          urls,
          isPrimary: isThisPrimary,
          sortOrder: productImage.sortOrder,
          createdAt: productImage.createdAt
        });
      }

      // Update product images array in products table
      await this.updateProductImagesArray(productId);

      logger.info('Product images uploaded successfully', {
        productId,
        uploadCount: uploadResults.length
      });

      return uploadResults;

    } catch (error: any) {
      logUtils.logDbOperation('FILE_UPLOAD', 'product_images', undefined, error);
      logger.error('Product image upload failed', {
        error: error.message,
        productId: request.productId
      });
      throw error;
    }
  }

  /**
   * Update product images array
   */
  private static async updateProductImagesArray(productId: string): Promise<void> {
    try {
      const images = await prisma.productImage.findMany({
        where: { productId },
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' }
        ],
        select: {
          mediumPath: true,
          isPrimary: true
        }
      });

      const imageUrls = images.map(img => `/api/files/uploads/${img.mediumPath}`);

      await prisma.product.update({
        where: { id: productId },
        data: {
          images: JSON.stringify(imageUrls)
        }
      });

    } catch (error: any) {
      logger.error('Failed to update product images array', {
        error: error.message,
        productId
      });
    }
  }

  /**
   * Get product images
   */
  static async getProductImages(productId: string): Promise<ProductImageUpload[]> {
    try {
      const images = await prisma.productImage.findMany({
        where: { productId },
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' }
        ]
      });

      const baseUrl = '/api/files/uploads';

      return images.map(image => ({
        id: image.id,
        productId: image.productId,
        filename: image.filename,
        originalName: image.originalName,
        paths: {
          thumbnail: image.thumbnailPath,
          medium: image.mediumPath,
          large: image.largePath,
          original: image.originalPath
        },
        urls: {
          thumbnail: `${baseUrl}/${image.thumbnailPath}`,
          medium: `${baseUrl}/${image.mediumPath}`,
          large: `${baseUrl}/${image.largePath}`,
          original: `${baseUrl}/${image.originalPath}`
        },
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
        createdAt: image.createdAt
      }));

    } catch (error: any) {
      logger.error('Failed to get product images', {
        error: error.message,
        productId
      });
      throw error;
    }
  }

  /**
   * Delete product image
   */
  static async deleteProductImage(imageId: string): Promise<void> {
    try {
      const image = await prisma.productImage.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        throw new Error(`Product image with ID ${imageId} not found`);
      }

      // Delete files from filesystem
      await Promise.all([
        FileUploadUtil.deleteFile(image.thumbnailPath),
        FileUploadUtil.deleteFile(image.mediumPath),
        FileUploadUtil.deleteFile(image.largePath),
        FileUploadUtil.deleteFile(image.originalPath)
      ]);

      // Delete from database
      await prisma.productImage.delete({
        where: { id: imageId }
      });

      // Update product images array
      await this.updateProductImagesArray(image.productId);

      logger.info('Product image deleted successfully', {
        imageId,
        productId: image.productId
      });

    } catch (error: any) {
      logger.error('Failed to delete product image', {
        error: error.message,
        imageId
      });
      throw error;
    }
  }

  /**
   * Set primary product image
   */
  static async setPrimaryProductImage(imageId: string): Promise<void> {
    try {
      const image = await prisma.productImage.findUnique({
        where: { id: imageId }
      });

      if (!image) {
        throw new Error(`Product image with ID ${imageId} not found`);
      }

      await prisma.$transaction(async (tx) => {
        // Remove primary flag from all images for this product
        await tx.productImage.updateMany({
          where: { productId: image.productId },
          data: { isPrimary: false }
        });

        // Set this image as primary
        await tx.productImage.update({
          where: { id: imageId },
          data: { isPrimary: true }
        });
      });

      // Update product images array
      await this.updateProductImagesArray(image.productId);

      logger.info('Primary product image set successfully', {
        imageId,
        productId: image.productId
      });

    } catch (error: any) {
      logger.error('Failed to set primary product image', {
        error: error.message,
        imageId
      });
      throw error;
    }
  }

  // ==========================================
  // AVATAR UPLOAD
  // ==========================================

  /**
   * Upload user avatar
   */
  static async uploadAvatar(request: UploadAvatarRequest): Promise<AvatarUpload> {
    try {
      const { userId, file } = request;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const filename = FileUploadUtil.generateFilename(file.originalname, 'avatar');

      // Process avatar images (multiple sizes)
      const imagePaths = await FileUploadUtil.processAvatarImages(
        file.buffer,
        filename,
        userId
      );

      // Generate URLs
      const baseUrl = '/api/files/uploads';
      const urls = {
        small: `${baseUrl}/${imagePaths.small}`,
        medium: `${baseUrl}/${imagePaths.medium}`,
        large: `${baseUrl}/${imagePaths.large}`
      };

      // Delete old avatar if exists
      const oldAvatar = await prisma.userAvatar.findUnique({
        where: { userId }
      });

      if (oldAvatar) {
        await Promise.all([
          FileUploadUtil.deleteFile(oldAvatar.smallPath),
          FileUploadUtil.deleteFile(oldAvatar.mediumPath),
          FileUploadUtil.deleteFile(oldAvatar.largePath)
        ]);
      }

      // Save to database (upsert)
      const avatar = await prisma.userAvatar.upsert({
        where: { userId },
        update: {
          filename,
          originalName: file.originalname,
          smallPath: imagePaths.small,
          mediumPath: imagePaths.medium,
          largePath: imagePaths.large,
          fileSize: file.size,
          mimetype: file.mimetype
        },
        create: {
          userId,
          filename,
          originalName: file.originalname,
          smallPath: imagePaths.small,
          mediumPath: imagePaths.medium,
          largePath: imagePaths.large,
          fileSize: file.size,
          mimetype: file.mimetype
        }
      });

      // Update user avatar URL
      await prisma.user.update({
        where: { id: userId },
        data: {
          avatar: urls.medium
        }
      });

      logger.info('Avatar uploaded successfully', { userId });

      return {
        id: avatar.id,
        userId,
        filename,
        originalName: file.originalname,
        paths: imagePaths,
        urls,
        createdAt: avatar.createdAt
      };

    } catch (error: any) {
      logger.error('Avatar upload failed', {
        error: error.message,
        userId: request.userId
      });
      throw error;
    }
  }

  /**
   * Get user avatar
   */
  static async getUserAvatar(userId: string): Promise<AvatarUpload | null> {
    try {
      const avatar = await prisma.userAvatar.findUnique({
        where: { userId }
      });

      if (!avatar) {
        return null;
      }

      const baseUrl = '/api/files/uploads';
      const urls = {
        small: `${baseUrl}/${avatar.smallPath}`,
        medium: `${baseUrl}/${avatar.mediumPath}`,
        large: `${baseUrl}/${avatar.largePath}`
      };

      return {
        id: avatar.id,
        userId,
        filename: avatar.filename,
        originalName: avatar.originalName,
        paths: {
          small: avatar.smallPath,
          medium: avatar.mediumPath,
          large: avatar.largePath
        },
        urls,
        createdAt: avatar.createdAt
      };

    } catch (error: any) {
      logger.error('Failed to get user avatar', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete user avatar
   */
  static async deleteUserAvatar(userId: string): Promise<void> {
    try {
      const avatar = await prisma.userAvatar.findUnique({
        where: { userId }
      });

      if (!avatar) {
        throw new Error(`Avatar for user ${userId} not found`);
      }

      // Delete files from filesystem
      await Promise.all([
        FileUploadUtil.deleteFile(avatar.smallPath),
        FileUploadUtil.deleteFile(avatar.mediumPath),
        FileUploadUtil.deleteFile(avatar.largePath)
      ]);

      // Delete from database
      await prisma.userAvatar.delete({
        where: { userId }
      });

      // Remove avatar URL from user
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: null }
      });

      logger.info('Avatar deleted successfully', { userId });

    } catch (error: any) {
      logger.error('Failed to delete avatar', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // ==========================================
  // DOCUMENT UPLOAD
  // ==========================================

  /**
   * Upload document
   */
  static async uploadDocument(request: UploadDocumentRequest): Promise<UploadedFile> {
    try {
      const { file, entityId, entityType, description } = request;

      const filename = FileUploadUtil.generateFilename(file.originalname, 'doc');
      const filePath = path.join(UPLOAD_CONFIG.directories.documents, filename);

      // Save file to filesystem
      await FileUploadUtil.saveFile(file.buffer, filePath);

      const relativePath = path.relative('uploads', filePath);
      const url = `/api/files/uploads/${relativePath}`;

      // Save to database
      const uploadedFile = await prisma.uploadedFile.create({
        data: {
          filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          fileSize: file.size,
          filePath: relativePath,
          url,
          type: 'document',
          entityId,
          entityType,
          description
        }
      });

      logger.info('Document uploaded successfully', {
        fileId: uploadedFile.id,
        entityId,
        entityType
      });

      return {
        id: uploadedFile.id,
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: relativePath,
        url,
        type: 'document',
        entityId,
        entityType,
        createdAt: uploadedFile.createdAt,
        updatedAt: uploadedFile.updatedAt
      };

    } catch (error: any) {
      logger.error('Document upload failed', {
        error: error.message,
        entityId: request.entityId,
        entityType: request.entityType
      });
      throw error;
    }
  }

  /**
   * Get uploaded files by entity
   */
  static async getFilesByEntity(entityId: string, entityType: EntityType): Promise<UploadedFile[]> {
    try {
      const files = await prisma.uploadedFile.findMany({
        where: {
          entityId,
          entityType
        },
        orderBy: { createdAt: 'desc' }
      });

      return files.map(file => ({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        mimetype: file.mimetype,
        size: file.fileSize,
        path: file.filePath,
        url: file.url,
        type: file.type as FileType,
        entityId: file.entityId || undefined,
        entityType: file.entityType as EntityType,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }));

    } catch (error: any) {
      logger.error('Failed to get files by entity', {
        error: error.message,
        entityId,
        entityType
      });
      throw error;
    }
  }

  /**
   * Delete uploaded file
   */
  static async deleteUploadedFile(fileId: string): Promise<void> {
    try {
      const file = await prisma.uploadedFile.findUnique({
        where: { id: fileId }
      });

      if (!file) {
        throw new Error(`File with ID ${fileId} not found`);
      }

      // Delete file from filesystem
      await FileUploadUtil.deleteFile(file.filePath);

      // Delete from database
      await prisma.uploadedFile.delete({
        where: { id: fileId }
      });

      logger.info('File deleted successfully', { fileId });

    } catch (error: any) {
      logger.error('Failed to delete file', {
        error: error.message,
        fileId
      });
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Get file statistics
   */
  static async getFileStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    recentUploads: number;
  }> {
    try {
      const [files, recentUploads] = await Promise.all([
        prisma.uploadedFile.findMany({
          select: {
            type: true,
            fileSize: true
          }
        }),
        prisma.uploadedFile.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.fileSize, 0),
        filesByType: files.reduce((acc, file) => {
          acc[file.type] = (acc[file.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recentUploads
      };

      return stats;

    } catch (error: any) {
      logger.error('Failed to get file statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cleanup orphaned files
   */
  static async cleanupOrphanedFiles(): Promise<number> {
    try {
      // Find product images without products
      const orphanedProductImages = await prisma.productImage.findMany({
        where: {
          product: null
        }
      });

      // Find avatars without users
      const orphanedAvatars = await prisma.userAvatar.findMany({
        where: {
          user: null
        }
      });

      let deletedCount = 0;

      // Delete orphaned product images
      for (const image of orphanedProductImages) {
        try {
          await Promise.all([
            FileUploadUtil.deleteFile(image.thumbnailPath),
            FileUploadUtil.deleteFile(image.mediumPath),
            FileUploadUtil.deleteFile(image.largePath),
            FileUploadUtil.deleteFile(image.originalPath)
          ]);

          await prisma.productImage.delete({
            where: { id: image.id }
          });

          deletedCount++;
        } catch (error) {
          logger.warn('Failed to delete orphaned product image', {
            imageId: image.id,
            error: (error as Error).message
          });
        }
      }

      // Delete orphaned avatars
      for (const avatar of orphanedAvatars) {
        try {
          await Promise.all([
            FileUploadUtil.deleteFile(avatar.smallPath),
            FileUploadUtil.deleteFile(avatar.mediumPath),
            FileUploadUtil.deleteFile(avatar.largePath)
          ]);

          await prisma.userAvatar.delete({
            where: { id: avatar.id }
          });

          deletedCount++;
        } catch (error) {
          logger.warn('Failed to delete orphaned avatar', {
            avatarId: avatar.id,
            error: (error as Error).message
          });
        }
      }

      logger.info('Orphaned files cleanup completed', {
        deletedCount,
        orphanedProductImages: orphanedProductImages.length,
        orphanedAvatars: orphanedAvatars.length
      });

      return deletedCount;

    } catch (error: any) {
      logger.error('Failed to cleanup orphaned files', {
        error: error.message
      });
      throw error;
    }
  }
}
