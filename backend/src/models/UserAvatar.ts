/**
 * UserAvatar Sequelize Model
 * File: src/models/UserAvatar.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export interface UserAvatarAttributes {
  id: number;
  userId: number;
  filename: string;
  originalName: string;
  smallPath: string;
  mediumPath: string;
  largePath: string;
  fileSize: number;
  mimetype: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAvatarCreationAttributes extends Optional<UserAvatarAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class UserAvatar extends Model<UserAvatarAttributes, UserAvatarCreationAttributes> implements UserAvatarAttributes {
  declare id: number;
  declare userId: number;
  declare filename: string;
  declare originalName: string;
  declare smallPath: string;
  declare mediumPath: string;
  declare largePath: string;
  declare fileSize: number;
  declare mimetype: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UserAvatar.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
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
    smallPath: {
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
    modelName: 'UserAvatar',
    tableName: 'user_avatars',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId']
      }
    ]
  }
);

export default UserAvatar;