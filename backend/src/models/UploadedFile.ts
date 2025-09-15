/**
 * UploadedFile Sequelize Model
 * File: src/models/UploadedFile.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export interface UploadedFileAttributes {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  fileSize: number;
  filePath: string;
  url: string;
  type: string;
  entityId?: string;
  entityType?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadedFileCreationAttributes extends Optional<UploadedFileAttributes, 'id' | 'entityId' | 'entityType' | 'description' | 'createdAt' | 'updatedAt'> {}

export class UploadedFile extends Model<UploadedFileAttributes, UploadedFileCreationAttributes> implements UploadedFileAttributes {
  declare id: string;
  declare filename: string;
  declare originalName: string;
  declare mimetype: string;
  declare fileSize: number;
  declare filePath: string;
  declare url: string;
  declare type: string;
  declare entityId?: string;
  declare entityType?: string;
  declare description?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UploadedFile.init(
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
    mimetype: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 500]
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 500]
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'File type: image, document, avatar, etc.',
      validate: {
        len: [1, 50]
      }
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID of related entity (product, user, etc.)'
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Type of related entity (product, user, etc.)',
      validate: {
        len: [1, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    modelName: 'UploadedFile',
    tableName: 'uploaded_files',
    timestamps: true,
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['entityId']
      },
      {
        fields: ['entityType']
      },
      {
        fields: ['createdAt']
      }
    ]
  }
);

export default UploadedFile;