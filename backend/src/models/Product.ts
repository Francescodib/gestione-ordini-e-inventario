/**
 * Product Sequelize Model
 * File: src/models/Product.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE', 
  DISCONTINUED = 'DISCONTINUED',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export interface ProductAttributes {
  id: number;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  categoryId: number;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  weight?: number;
  images?: string;
  tags?: string;
  status: ProductStatus;
  supplier?: string;
  dimensions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'barcode' | 'stock' | 'minStock' | 'maxStock' | 'weight' | 'images' | 'tags' | 'status' | 'supplier' | 'dimensions' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  declare id: number;
  declare name: string;
  declare description: string;
  declare sku: string;
  declare barcode?: string;
  declare categoryId: number;
  declare price: number;
  declare costPrice: number;
  declare stock: number;
  declare minStock: number;
  declare maxStock?: number;
  declare weight?: number;
  declare images?: string;
  declare tags?: string;
  declare status: ProductStatus;
  declare supplier?: string;
  declare dimensions?: string;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Helper methods
  public isLowStock(): boolean {
    return this.stock <= this.minStock && this.stock > 0;
  }

  public isOutOfStock(): boolean {
    return this.stock === 0;
  }

  public getImagesArray(): string[] {
    try {
      return this.images ? JSON.parse(this.images) : [];
    } catch {
      return [];
    }
  }

  public setImagesArray(images: string[]): void {
    this.images = JSON.stringify(images);
  }

  public getTagsArray(): string[] {
    try {
      return this.tags ? JSON.parse(this.tags) : [];
    } catch {
      return [];
    }
  }

  public setTagsArray(tags: string[]): void {
    this.tags = JSON.stringify(tags);
  }

  public getSupplierObject(): any {
    try {
      return this.supplier ? JSON.parse(this.supplier) : null;
    } catch {
      return null;
    }
  }

  public setSupplierObject(supplier: any): void {
    this.supplier = JSON.stringify(supplier);
  }

  public getDimensionsObject(): any {
    try {
      return this.dimensions ? JSON.parse(this.dimensions) : null;
    } catch {
      return null;
    }
  }

  public setDimensionsObject(dimensions: any): void {
    this.dimensions = JSON.stringify(dimensions);
  }
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 50]
      }
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 50]
      }
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    costPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    maxStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    images: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string array of image URLs'
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string array of tags'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ProductStatus)),
      allowNull: false,
      defaultValue: ProductStatus.ACTIVE
    },
    supplier: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON object with supplier information'
    },
    dimensions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON object with dimensions (length, width, height)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['sku']
      },
      {
        fields: ['categoryId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['price']
      },
      {
        fields: ['stock']
      },
      {
        fields: ['name']
      }
    ],
    hooks: {
      beforeCreate: (product: Product) => {
        product.sku = product.sku.toUpperCase();
      },
      beforeUpdate: (product: Product) => {
        if (product.changed('sku')) {
          product.sku = product.sku.toUpperCase();
        }
      }
    }
  }
);

export default Product;