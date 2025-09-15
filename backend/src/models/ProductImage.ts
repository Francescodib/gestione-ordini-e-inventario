/**
 * ProductImage Sequelize Model
 * File: src/models/ProductImage.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export interface ProductImageAttributes {
  id: string;
  productId: string;
  filename: string;
  originalName: string;
  thumbnailPath: string;
  mediumPath: string;
  largePath: string;
  originalPath: string;
  isPrimary: boolean;
  sortOrder: number;
  fileSize: number;
  mimetype: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImageCreationAttributes extends Optional<ProductImageAttributes, 'id' | 'isPrimary' | 'sortOrder' | 'createdAt' | 'updatedAt'> {}

export class ProductImage extends Model<ProductImageAttributes, ProductImageCreationAttributes> implements ProductImageAttributes {
  declare id: string;
  declare productId: string;
  declare filename: string;
  declare originalName: string;
  declare thumbnailPath: string;
  declare mediumPath: string;
  declare largePath: string;
  declare originalPath: string;
  declare isPrimary: boolean;
  declare sortOrder: number;
  declare fileSize: number;
  declare mimetype: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProductImage.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => {
        // Generate cuid-like ID (simplified version)
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substr(2, 9);
        return `c${timestamp}${randomPart}`;
      }
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    thumbnailPath: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 500]
      }
    },
    mediumPath: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 500]
      }
    },
    largePath: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 500]
      }
    },
    originalPath: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 500]
      }
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    mimetype: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
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
    modelName: 'ProductImage',
    tableName: 'product_images',
    timestamps: true,
    indexes: [
      {
        fields: ['productId']
      },
      {
        fields: ['isPrimary']
      },
      {
        fields: ['sortOrder']
      }
    ]
  }
);

export default ProductImage;