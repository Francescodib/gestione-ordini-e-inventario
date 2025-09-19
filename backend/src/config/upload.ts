/**
 * File Upload Configuration
 * Handles file upload settings, validation, and storage configuration
 */

import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

// Upload configuration constants
export const UPLOAD_CONFIG = {
  // File size limits (in bytes)
  maxFileSize: {
    image: 5 * 1024 * 1024,      // 5MB for images
    document: 10 * 1024 * 1024,   // 10MB for documents
    avatar: 2 * 1024 * 1024       // 2MB for avatars
  },
  
  // Allowed file types
  allowedTypes: {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    avatar: ['image/jpeg', 'image/jpg', 'image/png']
  },
  
  // Upload directories
  directories: {
    products: 'uploads/products',
    temp: 'uploads/temp',
    avatars: 'uploads/avatars',
    documents: 'uploads/documents'
  },
  
  // Image processing settings
  imageProcessing: {
    product: {
      thumbnail: { width: 300, height: 300, quality: 80 },
      medium: { width: 600, height: 600, quality: 85 },
      large: { width: 1200, height: 1200, quality: 90 }
    },
    avatar: {
      small: { width: 64, height: 64, quality: 80 },
      medium: { width: 128, height: 128, quality: 85 },
      large: { width: 256, height: 256, quality: 90 }
    }
  }
};

/**
 * File upload utility class
 */
export class FileUploadUtil {
  
  /**
   * Ensure upload directories exist
   */
  static async ensureDirectories(): Promise<void> {
    try {
      for (const dir of Object.values(UPLOAD_CONFIG.directories)) {
        await fs.mkdir(dir, { recursive: true });
      }
      logger.info('Upload directories initialized', {
        directories: Object.values(UPLOAD_CONFIG.directories)
      });
    } catch (error: any) {
      logger.error('Failed to create upload directories', {
        error: error.message,
        directories: Object.values(UPLOAD_CONFIG.directories)
      });
      throw error;
    }
  }
  
  /**
   * Generate unique filename
   */
  static generateFilename(originalName: string, prefix?: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const uuid = uuidv4();
    return prefix ? `${prefix}_${uuid}${ext}` : `${uuid}${ext}`;
  }
  
  /**
   * Validate file type
   */
  static validateFileType(file: Express.Multer.File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.mimetype);
  }
  
  /**
   * Get file extension from mimetype
   */
  static getExtensionFromMimetype(mimetype: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    };
    return mimeMap[mimetype] || '';
  }
  
  /**
   * Process and resize image
   */
  static async processImage(
    inputBuffer: Buffer,
    outputPath: string,
    options: { width: number; height: number; quality: number; }
  ): Promise<void> {
    try {
      logger.debug('Starting image processing', {
        bufferSize: inputBuffer.length,
        outputPath,
        options
      });

      await sharp(inputBuffer)
        .resize(options.width, options.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: options.quality })
        .toFile(outputPath);

      logger.debug('Image processed successfully', {
        outputPath,
        width: options.width,
        height: options.height,
        quality: options.quality
      });
    } catch (error: any) {
      logger.error('Image processing failed', {
        error: error.message,
        stack: error.stack,
        bufferSize: inputBuffer?.length || 0,
        outputPath,
        options
      });
      throw error;
    }
  }
  
  /**
   * Process product images (multiple sizes)
   */
  static async processProductImages(
    imageBuffer: Buffer,
    filename: string,
    productId: string
  ): Promise<{
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  }> {
    try {
      logger.info('Starting product image processing', {
        productId,
        filename,
        bufferSize: imageBuffer.length
      });

      const baseDir = UPLOAD_CONFIG.directories.products;
      const productDir = path.join(baseDir, String(productId));

      logger.debug('Product directory setup', {
        baseDir,
        productDir
      });

      // Ensure product directory exists
      await fs.mkdir(productDir, { recursive: true });

      const baseName = path.parse(filename).name;
      const paths = {
        thumbnail: path.join(productDir, `${baseName}_thumb.jpg`),
        medium: path.join(productDir, `${baseName}_medium.jpg`),
        large: path.join(productDir, `${baseName}_large.jpg`),
        original: path.join(productDir, `${baseName}_original.jpg`)
      };

      logger.debug('Processing paths created', { paths });

      // Process images in parallel
      logger.debug('Starting parallel image processing');
      await Promise.all([
        this.processImage(imageBuffer, paths.thumbnail, UPLOAD_CONFIG.imageProcessing.product.thumbnail),
        this.processImage(imageBuffer, paths.medium, UPLOAD_CONFIG.imageProcessing.product.medium),
        this.processImage(imageBuffer, paths.large, UPLOAD_CONFIG.imageProcessing.product.large),
        fs.writeFile(paths.original, imageBuffer)
      ]);

      logger.debug('Parallel processing completed');

      // Return relative paths for database storage
      const relativePaths = {
        thumbnail: path.relative('uploads', paths.thumbnail),
        medium: path.relative('uploads', paths.medium),
        large: path.relative('uploads', paths.large),
        original: path.relative('uploads', paths.original)
      };

      logger.info('Product images processed successfully', {
        productId,
        paths: relativePaths
      });

      return relativePaths;
    } catch (error: any) {
      logger.error('Product image processing failed', {
        error: error.message,
        stack: error.stack,
        productId,
        filename,
        bufferSize: imageBuffer?.length || 0
      });
      throw error;
    }
  }
  
  /**
   * Process avatar images
   */
  static async processAvatarImages(
    imageBuffer: Buffer,
    filename: string,
    userId: string
  ): Promise<{
    small: string;
    medium: string;
    large: string;
  }> {
    try {
      const baseDir = UPLOAD_CONFIG.directories.avatars;
      const userDir = path.join(baseDir, String(userId));
      
      // Ensure user directory exists
      await fs.mkdir(userDir, { recursive: true });
      
      const baseName = path.parse(filename).name;
      const paths = {
        small: path.join(userDir, `${baseName}_small.jpg`),
        medium: path.join(userDir, `${baseName}_medium.jpg`),
        large: path.join(userDir, `${baseName}_large.jpg`)
      };
      
      // Process avatar images in parallel
      await Promise.all([
        this.processImage(imageBuffer, paths.small, UPLOAD_CONFIG.imageProcessing.avatar.small),
        this.processImage(imageBuffer, paths.medium, UPLOAD_CONFIG.imageProcessing.avatar.medium),
        this.processImage(imageBuffer, paths.large, UPLOAD_CONFIG.imageProcessing.avatar.large)
      ]);
      
      // Return relative paths
      const relativePaths = {
        small: path.relative('uploads', paths.small),
        medium: path.relative('uploads', paths.medium),
        large: path.relative('uploads', paths.large)
      };
      
      logger.info('Avatar images processed successfully', {
        userId,
        paths: relativePaths
      });
      
      return relativePaths;
    } catch (error: any) {
      logger.error('Avatar image processing failed', {
        error: error.message,
        userId,
        filename
      });
      throw error;
    }
  }
  
  /**
   * Save file to filesystem
   */
  static async saveFile(buffer: Buffer, filePath: string): Promise<void> {
    try {
      await fs.writeFile(filePath, buffer);
      logger.debug('File saved successfully', { filePath });
    } catch (error: any) {
      logger.error('Failed to save file', {
        error: error.message,
        filePath
      });
      throw error;
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join('uploads', filePath);
      await fs.unlink(fullPath);
      logger.debug('File deleted successfully', { filePath: fullPath });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete file', {
          error: error.message,
          filePath
        });
        throw error;
      }
    }
  }
  
  /**
   * Delete product images directory
   */
  static async deleteProductImages(productId: string): Promise<void> {
    try {
      const productDir = path.join(UPLOAD_CONFIG.directories.products, productId);
      await fs.rmdir(productDir, { recursive: true });
      logger.info('Product images directory deleted', { productId });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete product images directory', {
          error: error.message,
          productId
        });
        throw error;
      }
    }
  }
  
  /**
   * Get file stats
   */
  static async getFileStats(filePath: string): Promise<{
    exists: boolean;
    size?: number;
    modified?: Date;
  }> {
    try {
      const fullPath = path.join('uploads', filePath);
      const stats = await fs.stat(fullPath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      return { exists: false };
    }
  }
}

/**
 * Multer storage configuration for temporary uploads
 */
export const tempStorage = multer.memoryStorage();

/**
 * File filter function
 */
export const createFileFilter = (allowedTypes: string[]) => {
  return (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (FileUploadUtil.validateFileType(file, allowedTypes)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  };
};

/**
 * Create multer upload middleware
 */
export const createUploadMiddleware = (
  fieldName: string,
  maxCount: number,
  allowedTypes: string[],
  maxSize: number
) => {
  return multer({
    storage: tempStorage,
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: maxSize,
      files: maxCount
    }
  }).array(fieldName, maxCount);
};

// Pre-configured upload middlewares
export const uploadMiddlewares = {
  productImages: createUploadMiddleware(
    'images',
    5,
    UPLOAD_CONFIG.allowedTypes.image,
    UPLOAD_CONFIG.maxFileSize.image
  ),
  
  avatar: createUploadMiddleware(
    'avatar',
    1,
    UPLOAD_CONFIG.allowedTypes.avatar,
    UPLOAD_CONFIG.maxFileSize.avatar
  ),
  
  documents: createUploadMiddleware(
    'documents',
    3,
    UPLOAD_CONFIG.allowedTypes.document,
    UPLOAD_CONFIG.maxFileSize.document
  )
};

// Initialize upload directories on module load
FileUploadUtil.ensureDirectories().catch(error => {
  logger.error('Failed to initialize upload directories', { error: error.message });
});
