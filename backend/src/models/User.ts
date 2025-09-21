/**
 * User Sequelize Model
 * File: src/models/User.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export enum UserRole {
  CLIENT = 'CLIENT',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

export interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string;
  lastLogin?: Date;
  phone?: string;
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'isActive' | 'emailVerified' | 'avatar' | 'lastLogin' | 'phone' | 'streetAddress' | 'city' | 'postalCode' | 'country' | 'createdAt' | 'updatedAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare username: string;
  declare email: string;
  declare password: string;
  declare firstName: string;
  declare lastName: string;
  declare role: UserRole;
  declare isActive: boolean;
  declare emailVerified: boolean;
  declare avatar?: string;
  declare lastLogin?: Date;
  declare phone?: string;
  declare streetAddress?: string;
  declare city?: string;
  declare postalCode?: string;
  declare country?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Helper methods
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public getFullAddress(): string | null {
    if (!this.streetAddress || !this.city) {
      return null;
    }
    const parts = [this.streetAddress, this.city];
    if (this.postalCode) parts.push(this.postalCode);
    if (this.country) parts.push(this.country);
    return parts.join(', ');
  }

  public hasCompleteAddress(): boolean {
    return !!(this.streetAddress && this.city && this.postalCode && this.country);
  }

  public isClient(): boolean {
    return this.role === UserRole.CLIENT;
  }

  public isManager(): boolean {
    return this.role === UserRole.MANAGER;
  }

  public isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  public canManageUsers(): boolean {
    return this.role === UserRole.ADMIN;
  }

  public canManageOrders(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.MANAGER;
  }

  public canCreateClients(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.MANAGER;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.CLIENT
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 20]
      }
    },
    streetAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 255]
      }
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 20]
      }
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['username']
      },
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['isActive']
      }
    ]
  }
);

export default User;