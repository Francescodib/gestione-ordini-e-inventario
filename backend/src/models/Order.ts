/**
 * Order Sequelize Model
 * File: src/models/Order.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export interface OrderAttributes {
  id: number;
  orderNumber: string;
  userId: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  shippingAddress: string;
  billingAddress?: string;
  notes?: string;
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderCreationAttributes extends Optional<OrderAttributes, 'id' | 'status' | 'paymentStatus' | 'shippingCost' | 'taxAmount' | 'discountAmount' | 'currency' | 'billingAddress' | 'notes' | 'trackingNumber' | 'shippedAt' | 'deliveredAt' | 'cancelledAt' | 'cancelReason' | 'createdAt' | 'updatedAt'> {}

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  declare id: number;
  declare orderNumber: string;
  declare userId: number;
  declare status: OrderStatus;
  declare paymentStatus: PaymentStatus;
  declare subtotal: number;
  declare shippingCost: number;
  declare taxAmount: number;
  declare discountAmount: number;
  declare totalAmount: number;
  declare currency: string;
  declare shippingAddress: string;
  declare billingAddress?: string;
  declare notes?: string;
  declare trackingNumber?: string;
  declare shippedAt?: Date;
  declare deliveredAt?: Date;
  declare cancelledAt?: Date;
  declare cancelReason?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Helper methods
  public getShippingAddressObject(): any {
    try {
      return JSON.parse(this.shippingAddress);
    } catch {
      return null;
    }
  }

  public setShippingAddressObject(address: any): void {
    this.shippingAddress = JSON.stringify(address);
  }

  public getBillingAddressObject(): any {
    try {
      return this.billingAddress ? JSON.parse(this.billingAddress) : null;
    } catch {
      return null;
    }
  }

  public setBillingAddressObject(address: any): void {
    this.billingAddress = JSON.stringify(address);
  }

  public isPaid(): boolean {
    return this.paymentStatus === PaymentStatus.PAID;
  }

  public isShipped(): boolean {
    return this.status === OrderStatus.SHIPPED || this.status === OrderStatus.DELIVERED;
  }

  public isCancelled(): boolean {
    return this.status === OrderStatus.CANCELLED;
  }
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 50]
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(OrderStatus)),
      allowNull: false,
      defaultValue: OrderStatus.PENDING
    },
    paymentStatus: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      allowNull: false,
      defaultValue: PaymentStatus.PENDING
    },
    subtotal: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    shippingCost: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    taxAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    discountAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'EUR',
      validate: {
        len: [3, 3],
        isUppercase: true
      }
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JSON object with shipping address'
    },
    billingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON object with billing address'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    shippedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelReason: {
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
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['orderNumber']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['paymentStatus']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['trackingNumber']
      }
    ],
    hooks: {
      beforeCreate: (order: Order) => {
        if (!order.orderNumber) {
          // Generate order number: ORD-YYYYMMDD-XXXX
          const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const random = Math.random().toString(36).substr(2, 4).toUpperCase();
          order.orderNumber = `ORD-${date}-${random}`;
        }
      }
    }
  }
);

export default Order;