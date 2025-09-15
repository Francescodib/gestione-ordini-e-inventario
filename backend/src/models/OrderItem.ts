/**
 * OrderItem Sequelize Model
 * File: src/models/OrderItem.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export interface OrderItemAttributes {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface OrderItemCreationAttributes extends Optional<OrderItemAttributes, 'id' | 'totalPrice'> {}

export class OrderItem extends Model<OrderItemAttributes, OrderItemCreationAttributes> implements OrderItemAttributes {
  declare id: string;
  declare orderId: string;
  declare productId: string;
  declare name: string;
  declare sku: string;
  declare quantity: number;
  declare price: number;
  declare totalPrice: number;

  // Helper methods
  public calculateTotalPrice(): number {
    return this.quantity * this.price;
  }
}

OrderItem.init(
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
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Product name at time of order',
      validate: {
        len: [1, 200]
      }
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Product SKU at time of order',
      validate: {
        len: [1, 50]
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Price at time of order',
      validate: {
        min: 0
      }
    },
    totalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'quantity * price',
      validate: {
        min: 0
      }
    }
  },
  {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: false,
    indexes: [
      {
        fields: ['orderId']
      },
      {
        fields: ['productId']
      },
      {
        fields: ['sku']
      }
    ],
    hooks: {
      beforeCreate: (orderItem: OrderItem) => {
        orderItem.totalPrice = orderItem.calculateTotalPrice();
      },
      beforeUpdate: (orderItem: OrderItem) => {
        if (orderItem.changed('quantity') || orderItem.changed('price')) {
          orderItem.totalPrice = orderItem.calculateTotalPrice();
        }
      }
    }
  }
);

export default OrderItem;