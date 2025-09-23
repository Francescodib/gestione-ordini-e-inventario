/**
 * Sequelize Models Index
 * File: src/models/index.ts
 */

import { sequelize } from '../config/sequelize';
import { User, UserRole } from './User';
import { UserAddress, AddressType } from './UserAddress';
import { AuditLog, AuditAction, ResourceType } from './AuditLog';
import { Category } from './Category';
import { Product, ProductStatus } from './Product';
import { Order, OrderStatus, PaymentStatus } from './Order';
import { OrderItem } from './OrderItem';
import { ProductImage } from './ProductImage';
import { UserAvatar } from './UserAvatar';
import { UploadedFile } from './UploadedFile';

// Define all associations
const defineAssociations = () => {
  // User associations
  User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
  User.hasOne(UserAvatar, { foreignKey: 'userId', as: 'userAvatar' });
  User.hasMany(UserAddress, { foreignKey: 'userId', as: 'addresses' });
  User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
  User.hasMany(AuditLog, { foreignKey: 'targetUserId', as: 'targetAuditLogs' });
  User.hasMany(AuditLog, { foreignKey: 'createdBy', as: 'createdAuditLogs' });

  // UserAddress associations
  UserAddress.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  UserAddress.hasMany(Order, { foreignKey: 'shippingAddressId', as: 'shippingOrders' });
  UserAddress.hasMany(Order, { foreignKey: 'billingAddressId', as: 'billingOrders' });

  // AuditLog associations
  AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  AuditLog.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });
  AuditLog.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  // Category associations
  Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
  Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });
  Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });

  // Product associations
  Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
  Product.hasMany(ProductImage, { foreignKey: 'productId', as: 'productImages' });

  // Order associations
  Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
  Order.belongsTo(UserAddress, { foreignKey: 'shippingAddressId', as: 'shippingAddressRef' });
  Order.belongsTo(UserAddress, { foreignKey: 'billingAddressId', as: 'billingAddressRef' });

  // OrderItem associations
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // ProductImage associations
  ProductImage.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // UserAvatar associations
  UserAvatar.belongsTo(User, { foreignKey: 'userId', as: 'user' });
};

// Initialize associations
defineAssociations();

// Export all models and enums
export {
  sequelize,
  User,
  UserRole,
  UserAddress,
  AddressType,
  AuditLog,
  AuditAction,
  ResourceType,
  Category,
  Product,
  ProductStatus,
  Order,
  OrderStatus,
  PaymentStatus,
  OrderItem,
  ProductImage,
  UserAvatar,
  UploadedFile
};

// Export model attribute interfaces
export type { UserAttributes, UserCreationAttributes } from './User';
export type { UserAddressAttributes, UserAddressCreationAttributes } from './UserAddress';
export type { AuditLogAttributes, AuditLogCreationAttributes } from './AuditLog';
export type { CategoryAttributes, CategoryCreationAttributes } from './Category';
export type { ProductAttributes, ProductCreationAttributes } from './Product';
export type { OrderAttributes, OrderCreationAttributes } from './Order';
export type { OrderItemAttributes, OrderItemCreationAttributes } from './OrderItem';
export type { ProductImageAttributes, ProductImageCreationAttributes } from './ProductImage';
export type { UserAvatarAttributes, UserAvatarCreationAttributes } from './UserAvatar';
export type { UploadedFileAttributes, UploadedFileCreationAttributes } from './UploadedFile';

