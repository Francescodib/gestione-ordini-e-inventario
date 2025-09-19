/**
 * File and Upload Types
 * All types related to file uploads, images, and file management
 */

import { AuditFields, PaginationQuery, Statistics } from './common';

/**
 * File type enumeration
 */
export enum FileType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  ARCHIVE = 'ARCHIVE',
  OTHER = 'OTHER'
}

/**
 * File category enumeration
 */
export enum FileCategory {
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  USER_AVATAR = 'USER_AVATAR',
  CATEGORY_IMAGE = 'CATEGORY_IMAGE',
  DOCUMENT = 'DOCUMENT',
  INVOICE = 'INVOICE',
  REPORT = 'REPORT',
  BACKUP = 'BACKUP',
  OTHER = 'OTHER'
}

/**
 * Base uploaded file interface
 */
export interface UploadedFile extends AuditFields {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: FileType;
  category: FileCategory;
  path: string;
  url: string;
  uploadedBy?: string;
  
  // File metadata
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // for video/audio
    pages?: number;    // for documents
    [key: string]: any;
  };
  
  // Access control
  isPublic: boolean;
  expiresAt?: Date;
  
  // Relations
  user?: {
    id: string;
    username: string;
  };
}

/**
 * Product image specific interface
 */
export interface ProductImage extends AuditFields {
  id: string;
  productId: string;
  fileId: string;
  alt?: string;
  title?: string;
  isPrimary: boolean;
  sortOrder: number;
  isActive: boolean;
  
  // Relations
  file?: UploadedFile;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

/**
 * User avatar interface
 */
export interface UserAvatar extends AuditFields {
  id: string;
  userId: string;
  fileId: string;
  isActive: boolean;
  
  // Relations
  file?: UploadedFile;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

/**
 * File upload request
 */
export interface FileUploadRequest {
  file: Express.Multer.File;
  category: FileCategory;
  isPublic?: boolean;
  metadata?: Record<string, any>;
  alt?: string;
  title?: string;
}

/**
 * Multiple file upload request
 */
export interface MultipleFileUploadRequest {
  files: Express.Multer.File[];
  category: FileCategory;
  isPublic?: boolean;
  metadata?: Record<string, any>[];
}

/**
 * Product image upload request
 */
export interface ProductImageUploadRequest {
  productId: string;
  files: Express.Multer.File[];
  isPrimary?: boolean[];
  alt?: string[];
  title?: string[];
  sortOrder?: number[];
}

/**
 * File update request
 */
export interface FileUpdateRequest {
  alt?: string;
  title?: string;
  isPrimary?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

/**
 * File search and filter options
 */
export interface FileFilters {
  type?: FileType;
  category?: FileCategory;
  uploadedBy?: string;
  isPublic?: boolean;
  sizeMin?: number;
  sizeMax?: number;
  uploadedFrom?: Date | string;
  uploadedTo?: Date | string;
  filename?: string;
  mimeType?: string;
}

/**
 * File search query
 */
export interface FileSearchQuery extends PaginationQuery {
  q?: string;
  filters?: FileFilters;
}

/**
 * File statistics
 */
export interface FileStatistics extends Statistics {
  totalSize: number;
  averageSize: number;
  largestFile: {
    id: string;
    filename: string;
    size: number;
  };
  byType: Record<FileType, number>;
  byCategory: Record<FileCategory, number>;
  byMimeType: Record<string, number>;
  recentUploads: Array<{
    id: string;
    filename: string;
    size: number;
    uploadedAt: Date;
  }>;
  topUploaders: Array<{
    userId: string;
    username: string;
    fileCount: number;
    totalSize: number;
  }>;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: string;
  };
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  compress?: boolean;
  watermark?: {
    text?: string;
    image?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
}

/**
 * Image variant for different sizes
 */
export interface ImageVariant {
  name: string;
  width: number;
  height: number;
  url: string;
  size: number;
}

/**
 * Processed image with variants
 */
export interface ProcessedImage extends UploadedFile {
  variants: ImageVariant[];
  originalUrl: string;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  fileInfo?: {
    type: FileType;
    size: number;
    mimeType: string;
    isImage: boolean;
    isDocument: boolean;
  };
}

/**
 * File storage configuration
 */
export interface FileStorageConfig {
  provider: 'local' | 'aws' | 'gcp' | 'azure';
  local?: {
    uploadPath: string;
    urlPath: string;
  };
  aws?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    cloudFront?: string;
  };
  limits: {
    maxFileSize: number;
    maxFiles: number;
    allowedMimeTypes: string[];
    allowedExtensions: string[];
  };
  imageProcessing: {
    enabled: boolean;
    variants: Array<{
      name: string;
      width: number;
      height: number;
      quality?: number;
    }>;
  };
}

/**
 * File bulk operation request
 */
export interface FileBulkOperation {
  action: 'delete' | 'move' | 'copy' | 'changeCategory' | 'changeAccess';
  fileIds: string[];
  data?: {
    category?: FileCategory;
    isPublic?: boolean;
    destinationPath?: string;
    [key: string]: any;
  };
}

/**
 * File download request
 */
export interface FileDownloadRequest {
  fileId: string;
  variant?: string; // For images
  download?: boolean; // Force download vs inline display
}

/**
 * File sharing settings
 */
export interface FileSharingSettings {
  isPublic: boolean;
  shareToken?: string;
  expiresAt?: Date;
  downloadLimit?: number;
  downloadCount?: number;
  allowedDomains?: string[];
  requirePassword?: boolean;
  password?: string;
}

/**
 * File access log
 */
export interface FileAccessLog extends AuditFields {
  id: string;
  fileId: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  action: 'view' | 'download' | 'upload' | 'delete' | 'share';
  variant?: string;
  
  // Relations
  file?: Pick<UploadedFile, 'id' | 'filename' | 'category'>;
  user?: {
    id: string;
    username: string;
  };
}

/**
 * File backup information
 */
export interface FileBackup extends AuditFields {
  id: string;
  fileId: string;
  backupPath: string;
  backupSize: number;
  checksum: string;
  provider: string;
  status: 'pending' | 'completed' | 'failed';
  
  // Relations
  file?: Pick<UploadedFile, 'id' | 'filename' | 'size'>;
}

/**
 * File cleanup job
 */
export interface FileCleanupJob {
  type: 'orphaned' | 'expired' | 'duplicate' | 'temporary';
  criteria: {
    olderThan?: Date;
    category?: FileCategory;
    unusedFor?: number; // days
    size?: {
      operator: 'gt' | 'lt';
      value: number;
    };
  };
  dryRun: boolean;
}

/**
 * File migration request
 */
export interface FileMigrationRequest {
  fromProvider: string;
  toProvider: string;
  fileIds?: string[];
  categories?: FileCategory[];
  batchSize?: number;
  preserveUrls?: boolean;
}

/**
 * CDN configuration
 */
export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'google' | 'azure';
  baseUrl: string;
  purgeOnUpdate: boolean;
  cacheControl: {
    images: string;
    documents: string;
    default: string;
  };
}

/**
 * File compression settings
 */
export interface FileCompressionSettings {
  enabled: boolean;
  images: {
    jpeg: {
      quality: number;
      progressive: boolean;
    };
    png: {
      compressionLevel: number;
      progressive: boolean;
    };
    webp: {
      quality: number;
      lossless: boolean;
    };
  };
  documents: {
    pdf: {
      compress: boolean;
      imageQuality: number;
    };
  };
}
