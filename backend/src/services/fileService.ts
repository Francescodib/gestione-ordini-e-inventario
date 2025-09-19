/**
 * File Upload Service
 * Handles file upload operations for products, avatars, and documents
 */

import { logger } from '../config/logger';
import { FileUploadUtil, UPLOAD_CONFIG } from '../config/upload';
import { ProductImage, UserAvatar, UploadedFile, Product, User } from '../models';
import * as path from 'path';

interface UploadProductImagesParams {
  productId: string;
  files: Express.Multer.File[];
  isPrimary?: boolean[];
}

interface UploadAvatarParams {
  userId: string;
  file: Express.Multer.File;
}

interface UploadDocumentParams {
  file: Express.Multer.File;
  entityId?: string;
  entityType?: string;
  description?: string;
}

interface ProductImageResult {
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
  isPrimary: boolean;
  sortOrder: number;
  fileSize: number;
  mimetype: string;
  createdAt: string;
  updatedAt: string;
}

interface AvatarResult {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  paths: {
    small: string;
    medium: string;
    large: string;
  };
  fileSize: number;
  mimetype: string;
  createdAt: string;
  updatedAt: string;
}

export class FileService {
  /**
   * Upload product images
   */
  static async uploadProductImages(params: UploadProductImagesParams): Promise<ProductImageResult[]> {
    const { productId, files, isPrimary = [] } = params;

    try {
      // Verify product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const results: ProductImageResult[] = [];

      // Get current max sort order
      const maxSortOrder = await ProductImage.max('sortOrder', {
        where: { productId: parseInt(productId) }
      }) as number || 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isFilePrimary = isPrimary[i] || false;

        // Generate unique filename
        const filename = FileUploadUtil.generateFilename(file.originalname, 'product');

        // Process and save images
        const imagePaths = await FileUploadUtil.processProductImages(
          file.buffer,
          filename,
          productId
        );

        // If this image is set as primary, update other images to not be primary
        if (isFilePrimary) {
          await ProductImage.update(
            { isPrimary: false },
            { where: { productId: parseInt(productId) } }
          );
        }

        // Save to database
        const productImage = await ProductImage.create({
          productId: parseInt(productId),
          filename,
          originalName: file.originalname,
          thumbnailPath: imagePaths.thumbnail,
          mediumPath: imagePaths.medium,
          largePath: imagePaths.large,
          originalPath: imagePaths.original,
          isPrimary: isFilePrimary,
          sortOrder: maxSortOrder + i + 1,
          fileSize: file.size,
          mimetype: file.mimetype
        });

        results.push({
          id: productImage.id.toString(),
          productId: productImage.productId.toString(),
          filename: productImage.filename,
          originalName: productImage.originalName,
          paths: {
            thumbnail: productImage.thumbnailPath,
            medium: productImage.mediumPath,
            large: productImage.largePath,
            original: productImage.originalPath
          },
          isPrimary: productImage.isPrimary,
          sortOrder: productImage.sortOrder,
          fileSize: productImage.fileSize,
          mimetype: productImage.mimetype,
          createdAt: productImage.createdAt.toISOString(),
          updatedAt: productImage.updatedAt.toISOString()
        });

        logger.info('Product image uploaded successfully', {
          productId,
          filename,
          imageId: productImage.id
        });
      }

      return results;
    } catch (error: any) {
      logger.error('Failed to upload product images', {
        error: error.message,
        productId,
        fileCount: files.length
      });
      throw error;
    }
  }

  /**
   * Get product images
   */
  static async getProductImages(productId: string): Promise<ProductImageResult[]> {
    try {
      const images = await ProductImage.findAll({
        where: { productId: parseInt(productId) },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
      });

      return images.map(image => ({
        id: image.id.toString(),
        productId: image.productId.toString(),
        filename: image.filename,
        originalName: image.originalName,
        paths: {
          thumbnail: image.thumbnailPath,
          medium: image.mediumPath,
          large: image.largePath,
          original: image.originalPath
        },
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
        fileSize: image.fileSize,
        mimetype: image.mimetype,
        createdAt: image.createdAt.toISOString(),
        updatedAt: image.updatedAt.toISOString()
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
      const image = await ProductImage.findByPk(imageId);
      if (!image) {
        throw new Error(`Product image with ID ${imageId} not found`);
      }

      // Delete physical files
      const filesToDelete = [
        image.thumbnailPath,
        image.mediumPath,
        image.largePath,
        image.originalPath
      ];

      for (const filePath of filesToDelete) {
        try {
          await FileUploadUtil.deleteFile(filePath);
        } catch (error) {
          logger.warn('Failed to delete physical file', { filePath, error });
        }
      }

      // Delete from database
      await image.destroy();

      logger.info('Product image deleted successfully', { imageId });
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
      const image = await ProductImage.findByPk(imageId);
      if (!image) {
        throw new Error(`Product image with ID ${imageId} not found`);
      }

      // Update all images for this product to not be primary
      await ProductImage.update(
        { isPrimary: false },
        { where: { productId: image.productId } }
      );

      // Set this image as primary
      await image.update({ isPrimary: true });

      logger.info('Primary product image set successfully', { imageId });
    } catch (error: any) {
      logger.error('Failed to set primary product image', {
        error: error.message,
        imageId
      });
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  static async uploadAvatar(params: UploadAvatarParams): Promise<AvatarResult> {
    const { userId, file } = params;

    try {
      // Verify user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Delete existing avatar if any
      const existingAvatar = await UserAvatar.findOne({
        where: { userId: parseInt(userId) }
      });

      if (existingAvatar) {
        await this.deleteUserAvatar(userId);
      }

      // Generate unique filename
      const filename = FileUploadUtil.generateFilename(file.originalname, 'avatar');

      // Process and save avatar
      const avatarPaths = await FileUploadUtil.processAvatarImages(
        file.buffer,
        filename,
        userId
      );

      // Save to database
      const avatar = await UserAvatar.create({
        userId: parseInt(userId),
        filename,
        originalName: file.originalname,
        smallPath: avatarPaths.small,
        mediumPath: avatarPaths.medium,
        largePath: avatarPaths.large,
        fileSize: file.size,
        mimetype: file.mimetype
      });

      logger.info('Avatar uploaded successfully', {
        userId,
        filename,
        avatarId: avatar.id
      });

      return {
        id: avatar.id.toString(),
        userId: avatar.userId.toString(),
        filename: avatar.filename,
        originalName: avatar.originalName,
        paths: {
          small: avatar.smallPath,
          medium: avatar.mediumPath,
          large: avatar.largePath
        },
        fileSize: avatar.fileSize,
        mimetype: avatar.mimetype,
        createdAt: avatar.createdAt.toISOString(),
        updatedAt: avatar.updatedAt.toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to upload avatar', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get user avatar
   */
  static async getUserAvatar(userId: string): Promise<AvatarResult | null> {
    try {
      const avatar = await UserAvatar.findOne({
        where: { userId: parseInt(userId) }
      });

      if (!avatar) {
        return null;
      }

      return {
        id: avatar.id.toString(),
        userId: avatar.userId.toString(),
        filename: avatar.filename,
        originalName: avatar.originalName,
        paths: {
          small: avatar.smallPath,
          medium: avatar.mediumPath,
          large: avatar.largePath
        },
        fileSize: avatar.fileSize,
        mimetype: avatar.mimetype,
        createdAt: avatar.createdAt.toISOString(),
        updatedAt: avatar.updatedAt.toISOString()
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
      const avatar = await UserAvatar.findOne({
        where: { userId: parseInt(userId) }
      });

      if (!avatar) {
        throw new Error(`Avatar for user ${userId} not found`);
      }

      // Delete physical files
      const filesToDelete = [
        avatar.smallPath,
        avatar.mediumPath,
        avatar.largePath
      ];

      for (const filePath of filesToDelete) {
        try {
          await FileUploadUtil.deleteFile(filePath);
        } catch (error) {
          logger.warn('Failed to delete physical file', { filePath, error });
        }
      }

      // Delete from database
      await avatar.destroy();

      logger.info('Avatar deleted successfully', { userId });
    } catch (error: any) {
      logger.error('Failed to delete avatar', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Upload document
   */
  static async uploadDocument(params: UploadDocumentParams): Promise<any> {
    const { file, entityId, entityType, description } = params;

    try {
      // Generate unique filename
      const filename = FileUploadUtil.generateFilename(file.originalname, 'doc');
      const filePath = path.join(UPLOAD_CONFIG.directories.documents, filename);

      // Save file to filesystem
      await FileUploadUtil.saveFile(file.buffer, filePath);

      // Save to database
      const uploadedFile = await UploadedFile.create({
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        fileSize: file.size,
        filePath: path.relative('uploads', filePath),
        url: `/api/files/uploads/${path.relative('uploads', filePath)}`,
        type: 'document',
        entityId: entityId ? parseInt(entityId) : undefined,
        entityType,
        description
      });

      logger.info('Document uploaded successfully', {
        filename,
        fileId: uploadedFile.id
      });

      return {
        id: uploadedFile.id.toString(),
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalName,
        mimetype: uploadedFile.mimetype,
        fileSize: uploadedFile.fileSize,
        url: uploadedFile.url,
        createdAt: uploadedFile.createdAt.toISOString()
      };
    } catch (error: any) {
      logger.error('Failed to upload document', {
        error: error.message,
        filename: file.originalname
      });
      throw error;
    }
  }

  /**
   * Get files by entity
   */
  static async getFilesByEntity(entityId: string, entityType: string): Promise<any[]> {
    try {
      const files = await UploadedFile.findAll({
        where: {
          entityId: parseInt(entityId),
          entityType
        },
        order: [['createdAt', 'DESC']]
      });

      return files.map(file => ({
        id: file.id.toString(),
        filename: file.filename,
        originalName: file.originalName,
        mimetype: file.mimetype,
        fileSize: file.fileSize,
        url: file.url,
        description: file.description,
        createdAt: file.createdAt.toISOString()
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
      const file = await UploadedFile.findByPk(fileId);
      if (!file) {
        throw new Error(`File with ID ${fileId} not found`);
      }

      // Delete physical file
      try {
        await FileUploadUtil.deleteFile(file.filePath);
      } catch (error) {
        logger.warn('Failed to delete physical file', { filePath: file.filePath, error });
      }

      // Delete from database
      await file.destroy();

      logger.info('File deleted successfully', { fileId });
    } catch (error: any) {
      logger.error('Failed to delete file', {
        error: error.message,
        fileId
      });
      throw error;
    }
  }

  /**
   * Get file statistics
   */
  static async getFileStats(): Promise<any> {
    try {
      const [productImages, userAvatars, documents] = await Promise.all([
        ProductImage.count(),
        UserAvatar.count(),
        UploadedFile.count()
      ]);

      const totalFiles = productImages + userAvatars + documents;

      return {
        totalFiles,
        productImages,
        userAvatars,
        documents,
        totalSize: 0, // Would need to calculate from file sizes
        orphanedFiles: 0 // Would need complex query to find orphaned files
      };
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
  static async cleanupOrphanedFiles(): Promise<any> {
    try {
      // This would require complex logic to find and remove orphaned files
      // For now, return a simple response
      return {
        deletedFiles: 0,
        reclaimedSpace: 0
      };
    } catch (error: any) {
      logger.error('Failed to cleanup orphaned files', {
        error: error.message
      });
      throw error;
    }
  }

  // Legacy method aliases for backward compatibility
  static async uploadProductImage(...args: any[]): Promise<any> {
    throw new Error('Use uploadProductImages instead');
  }

  static async updateProductImages(...args: any[]): Promise<any> {
    throw new Error('Method not implemented - use individual upload/delete operations');
  }

  static async uploadUserAvatar(params: UploadAvatarParams): Promise<AvatarResult> {
    return this.uploadAvatar(params);
  }

  static async uploadGenericFile(params: UploadDocumentParams): Promise<any> {
    return this.uploadDocument(params);
  }

  static async getUploadedFiles(entityId: string, entityType: string): Promise<any[]> {
    return this.getFilesByEntity(entityId, entityType);
  }
}

export default FileService;