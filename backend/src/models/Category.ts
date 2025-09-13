/**
 * Category model for product categorization
 * Defines the structure for product categories in the inventory system
 */

import { Schema, model, Document, Types } from 'mongoose';

/**
 * Interface for Category document
 * Extends Mongoose Document for type safety
 */
export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  slug: string;           // URL-friendly version of name
  isActive: boolean;      // Whether category is active
  parentId?: Types.ObjectId; // For hierarchical categories (optional)
  sortOrder: number;      // For category ordering
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for Category
 * Defines validation rules and indexes
 */
const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    
    description: {
      type: String,
      required: [true, 'Category description is required'],
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
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
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ sortOrder: 1 });

// Compound index for active categories with sorting
categorySchema.index({ isActive: 1, sortOrder: 1 });

/**
 * Pre-save middleware to generate slug from name
 * Automatically creates URL-friendly slug
 */
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .trim();
  }
  next();
});

/**
 * Instance method to get subcategories
 * Returns all child categories of this category
 */
categorySchema.methods.getSubcategories = function() {
  return Category.find({ parentId: this._id, isActive: true })
    .sort({ sortOrder: 1, name: 1 });
};

/**
 * Static method to get category hierarchy
 * Returns categories in tree structure
 */
categorySchema.statics.getHierarchy = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: 'parentId',
        as: 'subcategories'
      }
    },
    { $match: { parentId: null } }, // Only top-level categories
    { $sort: { sortOrder: 1, name: 1 } }
  ]);
};

export const Category = model<ICategory>('Category', categorySchema);