/**
 * Category Sequelize Model
 * File: src/models/Category.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export interface CategoryAttributes {
  id: number;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
  parentId?: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'isActive' | 'parentId' | 'sortOrder' | 'createdAt' | 'updatedAt'> {}

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  declare id: number;
  declare name: string;
  declare description: string;
  declare slug: string;
  declare isActive: boolean;
  declare parentId?: number;
  declare sortOrder: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Helper methods
  public generateSlug(): string {
    if (!this.name) return '';
    return this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
}

Category.init(
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
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-z0-9-]+$/
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    modelName: 'Category',
    tableName: 'categories',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['parentId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['sortOrder']
      }
    ],
    hooks: {
      beforeCreate: (category: Category) => {
        if (!category.slug) {
          category.slug = category.generateSlug();
        }
      },
      beforeUpdate: (category: Category) => {
        if (category.changed('name') && !category.changed('slug')) {
          category.slug = category.generateSlug();
        }
      }
    }
  }
);

export default Category;