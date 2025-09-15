/**
 * Sequelize Models Index
 * File: src/models/index.ts
 */

import { sequelize } from '../config/sequelize';
import { User, UserRole } from './User';
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
export type { CategoryAttributes, CategoryCreationAttributes } from './Category';
export type { ProductAttributes, ProductCreationAttributes } from './Product';
export type { OrderAttributes, OrderCreationAttributes } from './Order';
export type { OrderItemAttributes, OrderItemCreationAttributes } from './OrderItem';
export type { ProductImageAttributes, ProductImageCreationAttributes } from './ProductImage';
export type { UserAvatarAttributes, UserAvatarCreationAttributes } from './UserAvatar';
export type { UploadedFileAttributes, UploadedFileCreationAttributes } from './UploadedFile';

