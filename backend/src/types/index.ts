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

// Re-export Prisma types for convenience (with specific exports to avoid conflicts)
export { 
  Prisma,
  User as PrismaUser,
  Category as PrismaCategory,
  Product as PrismaProduct,
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  ProductImage as PrismaProductImage,
  UserAvatar as PrismaUserAvatar,
  UploadedFile as PrismaUploadedFile,
  UserRole as PrismaUserRole,
  ProductStatus,
  OrderStatus,
  PaymentStatus
} from '@prisma/client';
