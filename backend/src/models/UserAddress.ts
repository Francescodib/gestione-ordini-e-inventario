/**
 * UserAddress Sequelize Model
 * File: src/models/UserAddress.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export enum AddressType {
  SHIPPING = 'SHIPPING',
  BILLING = 'BILLING'
}

export interface UserAddressAttributes {
  id: number;
  userId: number;
  addressType: AddressType;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  state?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAddressCreationAttributes extends Optional<UserAddressAttributes, 'id' | 'addressType' | 'state' | 'isDefault' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class UserAddress extends Model<UserAddressAttributes, UserAddressCreationAttributes> implements UserAddressAttributes {
  declare id: number;
  declare userId: number;
  declare addressType: AddressType;
  declare streetAddress: string;
  declare city: string;
  declare postalCode: string;
  declare country: string;
  declare state?: string;
  declare isDefault: boolean;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Helper methods
  public getFullAddress(): string {
    const parts = [this.streetAddress, this.city];
    if (this.state) parts.push(this.state);
    if (this.postalCode) parts.push(this.postalCode);
    if (this.country) parts.push(this.country);
    return parts.join(', ');
  }

  public isShippingAddress(): boolean {
    return this.addressType === AddressType.SHIPPING;
  }

  public isBillingAddress(): boolean {
    return this.addressType === AddressType.BILLING;
  }
}

UserAddress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    addressType: {
      type: DataTypes.ENUM(...Object.values(AddressType)),
      allowNull: false,
      defaultValue: AddressType.SHIPPING
    },
    streetAddress: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        len: [1, 20]
      }
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    modelName: 'UserAddress',
    tableName: 'user_addresses',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['userId', 'isDefault'],
        where: {
          isDefault: true
        }
      },
      {
        fields: ['userId', 'addressType']
      },
      {
        fields: ['isActive']
      }
    ]
  }
);

export default UserAddress;