/**
 * Types Index
 * Central export file for all TypeScript types and interfaces
 */

// Common types
export * from './common';

// Domain-specific types
export * from './auth';
export * from './product';
export * from './category';
export * from './order';
export * from './file';
export * from './search';
export * from './monitoring';

// Note: user.ts removed to avoid naming conflicts
// All types are now properly organized by domain

// Re-export Sequelize model types for convenience (with specific exports to avoid conflicts)
export { 
  User as SequelizeUser,
  UserAttributes,
  UserCreationAttributes,
  UserRole as SequelizeUserRole,
  Category as SequelizeCategory,
  CategoryAttributes,
  CategoryCreationAttributes,
  Product as SequelizeProduct,
  ProductAttributes,
  ProductCreationAttributes,
  ProductStatus,
  Order as SequelizeOrder,
  OrderAttributes, 
  OrderCreationAttributes,
  OrderStatus,
  PaymentStatus,
  OrderItem as SequelizeOrderItem,
  OrderItemAttributes,
  OrderItemCreationAttributes,
  ProductImage as SequelizeProductImage,
  ProductImageAttributes,
  ProductImageCreationAttributes,
  UserAvatar as SequelizeUserAvatar,
  UserAvatarAttributes,
  UserAvatarCreationAttributes,
  UploadedFile as SequelizeUploadedFile,
  UploadedFileAttributes,
  UploadedFileCreationAttributes
} from '../models';
