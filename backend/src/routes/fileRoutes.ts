/**
 * File Upload Routes
 * Handles file upload operations for products, avatars, and documents
 */

import express, { Request, Response } from 'express';
import { FileService } from '../services/fileService';
import { uploadMiddlewares, UPLOAD_CONFIG } from '../config/upload';
import { verifyToken } from '../middleware/auth';
import { logger, logUtils } from '../config/logger';
import {
  validateId,
  validateUserId,
  validateProductId,
  validateImageId,
  sanitizeInput,
  handleValidationErrors
} from '../middleware/validation';
import Joi from 'joi';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Apply validation error handling
router.use(handleValidationErrors());

// ==========================================
// STATIC FILE SERVING
// ==========================================

/**
 * GET /api/files/uploads/*
 * Serve uploaded files statically
 */
router.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true
}));

// ==========================================
// PRODUCT IMAGE UPLOAD ROUTES
// ==========================================

/**
 * POST /api/files/products/:productId/images
 * Upload product images (Admin/Manager only)
 */
router.post('/products/:productId/images',
  verifyToken,
  validateProductId(),
  uploadMiddlewares.productImages,
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to upload product images'
        });
      }

      const { productId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images provided'
        });
      }

      // Parse primary flags from request body
      const primaryFlags = req.body.isPrimary ? 
        JSON.parse(req.body.isPrimary) : 
        new Array(files.length).fill(false);

      const uploadResult = await FileService.uploadProductImages({
        productId,
        files,
        isPrimary: primaryFlags
      });

      logUtils.logUserAction(req.user!.userId, 'upload_product_images', {
        productId,
        imageCount: uploadResult.length
      });

      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${uploadResult.length} product images`,
        data: uploadResult
      });

    } catch (error: any) {
      logger.error('Product image upload failed', {
        error: error.message,
        productId: req.params.productId,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Failed to upload product images',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/files/products/:productId/images
 * Get product images
 */
router.get('/products/:productId/images',
  validateProductId(),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;

      const images = await FileService.getProductImages(productId);

      res.json({
        success: true,
        data: images
      });

    } catch (error: any) {
      logger.error('Failed to get product images', {
        error: error.message,
        productId: req.params.productId
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get product images',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/files/products/images/:imageId
 * Delete product image (Admin/Manager only)
 */
router.delete('/products/images/:imageId',
  verifyToken,
  validateImageId(),
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete product images'
        });
      }

      const { imageId } = req.params;

      await FileService.deleteProductImage(imageId);

      logUtils.logUserAction(req.user!.userId, 'delete_product_image', {
        imageId
      });

      res.json({
        success: true,
        message: 'Product image deleted successfully'
      });

    } catch (error: any) {
      logger.error('Failed to delete product image', {
        error: error.message,
        imageId: req.params.imageId,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Failed to delete product image',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/files/products/images/:imageId/primary
 * Set product image as primary (Admin/Manager only)
 */
router.put('/products/images/:imageId/primary',
  verifyToken,
  validateImageId(),
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to modify product images'
        });
      }

      const { imageId } = req.params;

      await FileService.setPrimaryProductImage(imageId);

      logUtils.logUserAction(req.user!.userId, 'set_primary_image', {
        imageId
      });

      res.json({
        success: true,
        message: 'Primary product image set successfully'
      });

    } catch (error: any) {
      logger.error('Failed to set primary product image', {
        error: error.message,
        imageId: req.params.imageId,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Failed to set primary product image',
        error: error.message
      });
    }
  }
);

// ==========================================
// AVATAR UPLOAD ROUTES
// ==========================================

/**
 * POST /api/files/users/:userId/avatar
 * Upload user avatar (Self or Admin)
 */
router.post('/users/:userId/avatar',
  verifyToken,
  validateUserId(),
  uploadMiddlewares.avatar,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Check permissions (user can upload own avatar, or admin can upload any)
      if (req.user?.userId !== userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to upload avatar'
        });
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No avatar image provided'
        });
      }

      const file = files[0]; // Avatar upload accepts only one file

      const uploadResult = await FileService.uploadAvatar({
        userId,
        file
      });

      logUtils.logUserAction(req.user!.userId, 'upload_avatar', {
        targetUserId: userId
      });

      res.status(201).json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: uploadResult
      });

    } catch (error: any) {
      logger.error('Avatar upload failed', {
        error: error.message,
        userId: req.params.userId,
        requestingUserId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Failed to upload avatar',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/files/users/:userId/avatar
 * Get user avatar
 */
router.get('/users/:userId/avatar',
  validateUserId(),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const avatar = await FileService.getUserAvatar(userId);

      res.json({
        success: true,
        data: avatar // può essere null se non esiste
      });

    } catch (error: any) {
      logger.error('Failed to get user avatar', {
        error: error.message,
        userId: req.params.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get user avatar',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/files/users/:userId/avatar
 * Delete user avatar (Self or Admin)
 */
router.delete('/users/:userId/avatar',
  verifyToken,
  validateUserId(),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Check permissions
      if (req.user?.userId !== userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete avatar'
        });
      }

      await FileService.deleteUserAvatar(userId);

      logUtils.logUserAction(req.user!.userId, 'delete_avatar', {
        targetUserId: userId
      });

      res.json({
        success: true,
        message: 'Avatar deleted successfully'
      });

    } catch (error: any) {
      logger.error('Failed to delete avatar', {
        error: error.message,
        userId: req.params.userId,
        requestingUserId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Failed to delete avatar',
        error: error.message
      });
    }
  }
);

// ==========================================
// DOCUMENT UPLOAD ROUTES
// ==========================================

/**
 * POST /api/files/documents
 * Upload document (Authenticated users)
 */
router.post('/documents',
  verifyToken,
  sanitizeInput(),
  uploadMiddlewares.documents,
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No documents provided'
        });
      }

      const { entityId, entityType, description } = req.body;

      const uploadResults = [];

      for (const file of files) {
        const uploadResult = await FileService.uploadDocument({
          file,
          entityId,
          entityType,
          description
        });
        uploadResults.push(uploadResult);
      }

      logUtils.logUserAction(req.user!.userId, 'upload_document', {
        documentCount: uploadResults.length,
        entityId,
        entityType
      });

      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${uploadResults.length} documents`,
        data: uploadResults
      });

    } catch (error: any) {
      logger.error('Document upload failed', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to upload documents',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/files/documents
 * Get documents by entity (Authenticated users)
 */
router.get('/documents',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const { entityId, entityType } = req.query;

      if (!entityId || !entityType) {
        return res.status(400).json({
          success: false,
          message: 'entityId and entityType are required'
        });
      }

      const files = await FileService.getFilesByEntity(
        entityId as string,
        entityType as any
      );

      res.json({
        success: true,
        data: files
      });

    } catch (error: any) {
      logger.error('Failed to get documents', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get documents',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/files/documents/:fileId
 * Delete document (Admin/Manager only)
 */
router.delete('/documents/:fileId',
  verifyToken,
  validateId(),
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MANAGER') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete documents'
        });
      }

      const { fileId } = req.params;

      await FileService.deleteUploadedFile(fileId);

      logUtils.logUserAction(req.user!.userId, 'delete_document', {
        fileId
      });

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });

    } catch (error: any) {
      logger.error('Failed to delete document', {
        error: error.message,
        fileId: req.params.fileId,
        userId: req.user?.userId
      });

      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Failed to delete document',
        error: error.message
      });
    }
  }
);

// ==========================================
// FILE MANAGEMENT ROUTES (Admin only)
// ==========================================

/**
 * GET /api/files/stats
 * Get file upload statistics (Admin only)
 */
router.get('/stats',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to view file statistics'
        });
      }

      const stats = await FileService.getFileStats();

      res.json({
        success: true,
        data: {
          ...stats,
          config: {
            maxFileSizes: UPLOAD_CONFIG.maxFileSize,
            allowedTypes: UPLOAD_CONFIG.allowedTypes,
            uploadDirectories: UPLOAD_CONFIG.directories
          }
        }
      });

    } catch (error: any) {
      logger.error('Failed to get file statistics', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get file statistics',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/files/cleanup
 * Cleanup orphaned files (Admin only)
 */
router.post('/cleanup',
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      // Check permissions
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to cleanup files'
        });
      }

      const deletedCount = await FileService.cleanupOrphanedFiles();

      logUtils.logUserAction(req.user!.userId, 'cleanup_files', {
        deletedCount
      });

      res.json({
        success: true,
        message: `Successfully cleaned up ${deletedCount} orphaned files`,
        data: { deletedCount }
      });

    } catch (error: any) {
      logger.error('File cleanup failed', {
        error: error.message,
        userId: req.user?.userId
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup files',
        error: error.message
      });
    }
  }
);

// ==========================================
// HEALTH CHECK
// ==========================================

/**
 * GET /api/files/health
 * Check file upload system health
 */
router.get('/health',
  async (req: Request, res: Response) => {
    try {
      const uploadDirs = Object.values(UPLOAD_CONFIG.directories);
      const dirStatus: Record<string, boolean> = {};

      // Check if upload directories exist and are writable
      for (const dir of uploadDirs) {
        try {
          await fs.access(dir, fs.constants.F_OK | fs.constants.W_OK);
          dirStatus[dir] = true;
        } catch {
          dirStatus[dir] = false;
        }
      }

      const allDirsHealthy = Object.values(dirStatus).every(status => status);

      res.status(allDirsHealthy ? 200 : 500).json({
        success: allDirsHealthy,
        message: allDirsHealthy ? 'File upload system is healthy' : 'File upload system has issues',
        data: {
          directories: dirStatus,
          config: {
            maxFileSizes: UPLOAD_CONFIG.maxFileSize,
            allowedTypes: UPLOAD_CONFIG.allowedTypes
          }
        }
      });

    } catch (error: any) {
      logger.error('File system health check failed', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'File system health check failed',
        error: error.message
      });
    }
  }
);

export default router;
