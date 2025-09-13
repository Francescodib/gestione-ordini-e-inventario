/**
 * Order model for order management system
 * Defines the structure for orders and order items
 */

import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for order status
 */
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

/**
 * Enum for payment status
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

/**
 * Interface for OrderItem subdocument
 */
export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;           // Product name at time of order
  sku: string;            // Product SKU at time of order
  quantity: number;
  price: number;          // Price at time of order
  totalPrice: number;     // quantity * price
}

/**
 * Interface for shipping address
 */
export interface IShippingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

/**
 * Interface for Order document
 */
export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;         // Human-readable order number
  userId: Types.ObjectId;      // Customer who placed the order
  items: IOrderItem[];         // Products in this order
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;            // Sum of all items
  shippingCost: number;        // Shipping cost
  taxAmount: number;           // Tax amount
  discountAmount: number;      // Discount applied
  totalAmount: number;         // Final total
  currency: string;            // Currency code (USD, EUR, etc.)
  shippingAddress: IShippingAddress;
  billingAddress?: IShippingAddress; // Optional, uses shipping if not provided
  notes?: string;              // Order notes
  trackingNumber?: string;     // Shipping tracking number
  shippedAt?: Date;           // When order was shipped
  deliveredAt?: Date;         // When order was delivered
  cancelledAt?: Date;         // When order was cancelled
  cancelReason?: string;      // Reason for cancellation
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subdocument schema for order items
 */
const orderItemSchema = new Schema<IOrderItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sku: {
    type: String,
    required: true,
    uppercase: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
    set: (value: number) => Math.round(value * 100) / 100,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative'],
    set: (value: number) => Math.round(value * 100) / 100,
  },
}, { _id: false });

/**
 * Subdocument schema for shipping address
 */
const shippingAddressSchema = new Schema<IShippingAddress>({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  address1: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  address2: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    default: 'Italy',
  },
  phone: {
    type: String,
    match: [/^[\+]?[0-9\s\-\(\)]{8,}$/, 'Invalid phone format'],
  },
}, { _id: false });

/**
 * Main order schema
 */
const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function(items: IOrderItem[]) {
          return items && items.length > 0;
        },
        message: 'Order must have at least one item'
      }
    },

    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
      set: (value: number) => Math.round(value * 100) / 100,
    },

    shippingCost: {
      type: Number,
      required: true,
      min: [0, 'Shipping cost cannot be negative'],
      default: 0,
      set: (value: number) => Math.round(value * 100) / 100,
    },

    taxAmount: {
      type: Number,
      required: true,
      min: [0, 'Tax amount cannot be negative'],
      default: 0,
      set: (value: number) => Math.round(value * 100) / 100,
    },

    discountAmount: {
      type: Number,
      required: true,
      min: [0, 'Discount amount cannot be negative'],
      default: 0,
      set: (value: number) => Math.round(value * 100) / 100,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
      set: (value: number) => Math.round(value * 100) / 100,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'EUR',
      match: [/^[A-Z]{3}$/, 'Currency must be 3-letter code'],
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    billingAddress: {
      type: shippingAddressSchema,
      required: false,
    },

    notes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    trackingNumber: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    shippedAt: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },

    cancelReason: {
      type: String,
      maxlength: 500,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 }); // Most recent first
orderSchema.index({ userId: 1, createdAt: -1 }); // User's orders by date

/**
 * Pre-save middleware to generate order number
 */
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    // Count today's orders to generate sequential number
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const todayOrdersCount = await Order.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    
    const sequence = (todayOrdersCount + 1).toString().padStart(4, '0');
    this.orderNumber = `ORD${year}${month}${day}${sequence}`;
  }
  
  next();
});

/**
 * Pre-save middleware to update status timestamps
 */
orderSchema.pre('save', function(next) {
  const now = new Date();
  
  // Update timestamps based on status changes
  if (this.isModified('status')) {
    switch (this.status) {
      case OrderStatus.SHIPPED:
        if (!this.shippedAt) this.shippedAt = now;
        break;
      case OrderStatus.DELIVERED:
        if (!this.deliveredAt) this.deliveredAt = now;
        break;
      case OrderStatus.CANCELLED:
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }
  }
  
  next();
});

/**
 * Virtual for total items count
 */
orderSchema.virtual('itemsCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

/**
 * Instance method to calculate totals
 */
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.totalAmount = this.subtotal + this.shippingCost + this.taxAmount - this.discountAmount;
  return this;
};

/**
 * Instance method to add item to order
 */
orderSchema.methods.addItem = function(productId: Types.ObjectId, name: string, sku: string, quantity: number, price: number) {
  const existingItem = this.items.find(item => item.productId.equals(productId));
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.quantity * existingItem.price;
  } else {
    this.items.push({
      productId,
      name,
      sku,
      quantity,
      price,
      totalPrice: quantity * price
    });
  }
  
  this.calculateTotals();
  return this;
};

/**
 * Static method to find orders by status
 */
orderSchema.statics.findByStatus = function(status: OrderStatus) {
  return this.find({ status }).sort({ createdAt: -1 });
};

/**
 * Static method to get order statistics
 */
orderSchema.statics.getOrderStats = function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        statusCounts: {
          $push: '$status'
        }
      }
    }
  ]);
};

export const Order = model<IOrder>('Order', orderSchema);