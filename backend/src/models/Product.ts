/**
 * Product model for inventory management
 * Defines the structure for products in the e-commerce system
 */

import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for product status
 */
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
  OUT_OF_STOCK = 'out_of_stock'
}

/**
 * Interface for Product document
 * Extends Mongoose Document for type safety
 */
export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  sku: string;              // Stock Keeping Unit - unique identifier
  barcode?: string;         // Optional barcode
  categoryId: Types.ObjectId;
  price: number;            // Base price
  costPrice: number;        // Cost price for margin calculations
  stock: number;            // Current stock quantity
  minStock: number;         // Minimum stock threshold
  maxStock?: number;        // Maximum stock capacity (optional)
  weight?: number;          // Product weight in grams
  dimensions?: {            // Product dimensions
    length: number;
    width: number;
    height: number;
  };
  images: string[];         // Array of image URLs
  tags: string[];           // Tags for search and filtering
  status: ProductStatus;
  supplier?: {              // Supplier information (optional)
    name: string;
    email: string;
    phone?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subdocument schema for dimensions
 */
const dimensionsSchema = new Schema({
  length: { type: Number, required: true, min: 0 },
  width: { type: Number, required: true, min: 0 },
  height: { type: Number, required: true, min: 0 },
}, { _id: false });

/**
 * Subdocument schema for supplier
 */
const supplierSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100 
  },
  email: { 
    type: String, 
    required: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  phone: { 
    type: String,
    match: [/^[\+]?[0-9\s\-\(\)]{8,}$/, 'Invalid phone format']
  },
}, { _id: false });

/**
 * Mongoose schema for Product
 */
const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [200, 'Product name cannot exceed 200 characters'],
      index: true, // Index for search
    },

    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9\-_]{3,20}$/, 'SKU must be 3-20 characters, alphanumeric, hyphens and underscores only'],
    },

    barcode: {
      type: String,
      sparse: true, // Allows multiple null values
      match: [/^[0-9]{8,13}$/, 'Barcode must be 8-13 digits'],
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      set: (value: number) => Math.round(value * 100) / 100, // Round to 2 decimals
    },

    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
      set: (value: number) => Math.round(value * 100) / 100,
    },

    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },

    minStock: {
      type: Number,
      required: [true, 'Minimum stock is required'],
      min: [0, 'Minimum stock cannot be negative'],
      default: 0,
    },

    maxStock: {
      type: Number,
      min: [0, 'Maximum stock cannot be negative'],
      validate: {
        validator: function(value: number) {
          return !value || value >= this.minStock;
        },
        message: 'Maximum stock must be greater than minimum stock'
      }
    },

    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
    },

    dimensions: {
      type: dimensionsSchema,
      required: false,
    },

    images: [{
      type: String,
      validate: {
        validator: function(url: string) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        },
        message: 'Invalid image URL format'
      }
    }],

    tags: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 30,
    }],

    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.ACTIVE,
    },

    supplier: {
      type: supplierSchema,
      required: false,
    },

    isActive: {
      type: Boolean,
      default: true,
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

// Indexes for better performance
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ categoryId: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ stock: 1 });

// Compound indexes
productSchema.index({ isActive: 1, status: 1 });
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' }); // Text search

/**
 * Virtual for profit margin calculation
 */
productSchema.virtual('profitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return Math.round(((this.price - this.costPrice) / this.costPrice) * 100);
});

/**
 * Virtual for stock status
 */
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.minStock) return 'low_stock';
  if (this.maxStock && this.stock >= this.maxStock) return 'overstock';
  return 'normal';
});

/**
 * Pre-save middleware to update status based on stock
 */
productSchema.pre('save', function(next) {
  if (this.stock === 0) {
    this.status = ProductStatus.OUT_OF_STOCK;
  } else if (this.status === ProductStatus.OUT_OF_STOCK && this.stock > 0) {
    this.status = ProductStatus.ACTIVE;
  }
  next();
});

/**
 * Instance method to check if product is low stock
 */
productSchema.methods.isLowStock = function(): boolean {
  return this.stock <= this.minStock && this.stock > 0;
};

/**
 * Instance method to update stock
 */
productSchema.methods.updateStock = function(quantity: number, operation: 'add' | 'subtract' = 'subtract') {
  if (operation === 'add') {
    this.stock += quantity;
  } else {
    this.stock = Math.max(0, this.stock - quantity);
  }
  return this.save();
};

/**
 * Static method to find low stock products
 */
productSchema.statics.findLowStock = function() {
  return this.find({
    $expr: { $lte: ['$stock', '$minStock'] },
    stock: { $gt: 0 },
    isActive: true
  });
};

/**
 * Static method to find out of stock products
 */
productSchema.statics.findOutOfStock = function() {
  return this.find({
    stock: 0,
    isActive: true
  });
};

export const Product = model<IProduct>('Product', productSchema);