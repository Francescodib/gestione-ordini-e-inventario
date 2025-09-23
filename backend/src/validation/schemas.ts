/**
 * Validation Schemas using Joi
 * Defines validation rules for all entities in the system
 */

import Joi from 'joi';
import { UserRole, ProductStatus, OrderStatus, PaymentStatus } from '../models';

// ==========================================
// USER VALIDATION SCHEMAS
// ==========================================

/**
 * Schema for user registration
 */
export const createUserSchema = Joi.object({
  username: Joi.string()
    .pattern(new RegExp('^[a-zA-Z0-9._-]+$'))
    .min(3)
    .max(30)
    .lowercase()
    .required()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, dots, underscores, and hyphens',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),

  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'it', 'eu'] } })
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 100 characters',
      'any.required': 'Password is required'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match',
      'any.required': 'Password confirmation is required'
    }),

  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ0-9\\s]+$'))
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters, numbers, and spaces',
      'any.required': 'First name is required'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ0-9\\s]+$'))
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters, numbers, and spaces',
      'any.required': 'Last name is required'
    }),

  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .messages({
      'any.only': `Role must be one of: ${Object.values(UserRole).join(', ')}`
    }),

  phone: Joi.string()
    .trim()
    .pattern(new RegExp('^[+]?[0-9\\s\\-()]+$'))
    .min(5)
    .max(20)
    .allow('', null)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number format is invalid',
      'string.min': 'Phone number must be at least 5 characters long',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),

  streetAddress: Joi.string()
    .trim()
    .min(5)
    .max(255)
    .allow('', null)
    .optional()
    .messages({
      'string.min': 'Street address must be at least 5 characters long',
      'string.max': 'Street address cannot exceed 255 characters'
    }),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ\\s\\-\']+$'))
    .allow('', null)
    .optional()
    .messages({
      'string.min': 'City must be at least 2 characters long',
      'string.max': 'City cannot exceed 100 characters',
      'string.pattern.base': 'City can only contain letters, spaces, hyphens, and apostrophes'
    }),

  postalCode: Joi.string()
    .trim()
    .pattern(new RegExp('^[0-9A-Za-z\\s\\-]+$'))
    .min(3)
    .max(20)
    .allow('', null)
    .optional()
    .messages({
      'string.pattern.base': 'Postal code format is invalid',
      'string.min': 'Postal code must be at least 3 characters long',
      'string.max': 'Postal code cannot exceed 20 characters'
    }),

  country: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ\\s]+$'))
    .allow('', null)
    .optional()
    .messages({
      'string.min': 'Country must be at least 2 characters long',
      'string.max': 'Country cannot exceed 100 characters',
      'string.pattern.base': 'Country can only contain letters and spaces'
    })
});

/**
 * Schema for user login
 */
export const loginUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.min': 'Password is required',
      'any.required': 'Password is required'
    })
});

/**
 * Schema for user update
 */
export const updateUserSchema = Joi.object({
  username: Joi.string()
    .pattern(new RegExp('^[a-zA-Z0-9._-]+$'))
    .min(3)
    .max(30)
    .lowercase()
    .optional(),

  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .lowercase()
    .optional(),

  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ0-9\\s]+$'))
    .optional(),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ0-9\\s]+$'))
    .optional(),

  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional(),

  isActive: Joi.boolean()
    .optional(),

  phone: Joi.string()
    .trim()
    .pattern(new RegExp('^[+]?[0-9\\s\\-()]+$'))
    .min(5)
    .max(20)
    .allow('', null)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number format is invalid',
      'string.min': 'Phone number must be at least 5 characters long',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),

  streetAddress: Joi.string()
    .trim()
    .min(5)
    .max(255)
    .allow('', null)
    .optional()
    .messages({
      'string.min': 'Street address must be at least 5 characters long',
      'string.max': 'Street address cannot exceed 255 characters'
    }),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ\\s\\-\']+$'))
    .allow('', null)
    .optional()
    .messages({
      'string.min': 'City must be at least 2 characters long',
      'string.max': 'City cannot exceed 100 characters',
      'string.pattern.base': 'City can only contain letters, spaces, hyphens, and apostrophes'
    }),

  postalCode: Joi.string()
    .trim()
    .pattern(new RegExp('^[0-9A-Za-z\\s\\-]+$'))
    .min(3)
    .max(20)
    .allow('', null)
    .optional()
    .messages({
      'string.pattern.base': 'Postal code format is invalid',
      'string.min': 'Postal code must be at least 3 characters long',
      'string.max': 'Postal code cannot exceed 20 characters'
    }),

  country: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ\\s]+$'))
    .allow('', null)
    .optional()
    .messages({
      'string.min': 'Country must be at least 2 characters long',
      'string.max': 'Country cannot exceed 100 characters',
      'string.pattern.base': 'Country can only contain letters and spaces'
    })
});

/**
 * Schema for password change
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(6)
    .max(100)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot exceed 100 characters',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'New password is required'
    }),

  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New password confirmation does not match',
      'any.required': 'New password confirmation is required'
    })
});

// ==========================================
// PRODUCT VALIDATION SCHEMAS
// ==========================================

/**
 * Schema for product creation
 */
export const createProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Product name must be at least 2 characters long',
      'string.max': 'Product name cannot exceed 200 characters',
      'any.required': 'Product name is required'
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Product description must be at least 10 characters long',
      'string.max': 'Product description cannot exceed 2000 characters',
      'any.required': 'Product description is required'
    }),

  sku: Joi.string()
    .uppercase()
    .trim()
    .pattern(new RegExp('^[A-Z0-9\\-_]{3,20}$'))
    .required()
    .messages({
      'string.pattern.base': 'SKU must be 3-20 characters, alphanumeric, hyphens and underscores only',
      'any.required': 'SKU is required'
    }),

  barcode: Joi.string()
    .pattern(new RegExp('^[0-9]{8,13}$'))
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Barcode must be 8-13 digits'
    }),

  categoryId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.integer': 'Category ID must be a valid integer',
      'number.positive': 'Category ID must be positive',
      'any.required': 'Category is required'
    }),

  price: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .required()
    .messages({
      'number.positive': 'Price must be a positive number',
      'number.max': 'Price cannot exceed 999,999.99',
      'any.required': 'Price is required'
    }),

  costPrice: Joi.number()
    .positive()
    .precision(2)
    .max(999999.99)
    .required()
    .messages({
      'number.positive': 'Cost price must be a positive number',
      'number.max': 'Cost price cannot exceed 999,999.99',
      'any.required': 'Cost price is required'
    }),

  stock: Joi.number()
    .integer()
    .min(0)
    .max(999999)
    .default(0)
    .messages({
      'number.integer': 'Stock must be a whole number',
      'number.min': 'Stock cannot be negative',
      'number.max': 'Stock cannot exceed 999,999'
    }),

  minStock: Joi.number()
    .integer()
    .min(0)
    .max(999999)
    .default(0)
    .messages({
      'number.integer': 'Minimum stock must be a whole number',
      'number.min': 'Minimum stock cannot be negative',
      'number.max': 'Minimum stock cannot exceed 999,999'
    }),

  maxStock: Joi.number()
    .integer()
    .min(Joi.ref('minStock'))
    .max(999999)
    .optional()
    .allow(null)
    .messages({
      'number.integer': 'Maximum stock must be a whole number',
      'number.min': 'Maximum stock must be greater than minimum stock',
      'number.max': 'Maximum stock cannot exceed 999,999'
    }),

  weight: Joi.number()
    .positive()
    .max(999999)
    .optional()
    .allow(null)
    .messages({
      'number.positive': 'Weight must be a positive number',
      'number.max': 'Weight cannot exceed 999,999 grams'
    }),

  status: Joi.string()
    .valid(...Object.values(ProductStatus))
    .default(ProductStatus.ACTIVE)
    .messages({
      'any.only': `Status must be one of: ${Object.values(ProductStatus).join(', ')}`
    })
});

/**
 * Schema for product update
 */
export const updateProductSchema = createProductSchema.fork(
  ['name', 'description', 'sku', 'categoryId', 'price', 'costPrice'],
  (schema) => schema.optional()
);

// ==========================================
// CATEGORY VALIDATION SCHEMAS
// ==========================================

/**
 * Schema for category creation
 */
export const createCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Category name must be at least 2 characters long',
      'string.max': 'Category name cannot exceed 50 characters',
      'any.required': 'Category name is required'
    }),

  description: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Category description cannot exceed 200 characters'
    }),

  slug: Joi.string()
    .lowercase()
    .trim()
    .pattern(new RegExp('^[a-z0-9-]+$'))
    .optional()
    .messages({
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens'
    }),

  parentId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().valid('').custom(() => null),
      Joi.valid(null)
    )
    .optional()
    .messages({
      'alternatives.match': 'Parent ID must be a valid integer or empty',
      'number.integer': 'Parent ID must be a valid integer',
      'number.positive': 'Parent ID must be positive'
    }),

  sortOrder: Joi.number()
    .integer()
    .min(0)
    .max(9999)
    .default(0)
    .messages({
      'number.integer': 'Sort order must be a whole number',
      'number.min': 'Sort order cannot be negative',
      'number.max': 'Sort order cannot exceed 9999'
    }),

  isActive: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'Status must be a boolean value'
    })
});

/**
 * Schema for category update
 */
export const updateCategorySchema = createCategorySchema.fork(
  ['name', 'description'],
  (schema) => schema.optional()
);

// ==========================================
// ORDER VALIDATION SCHEMAS
// ==========================================

/**
 * Schema for order item
 */
export const orderItemSchema = Joi.object({
  productId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
    )
    .required()
    .messages({
      'alternatives.match': 'Product ID must be a valid integer',
      'any.required': 'Product ID is required'
    }),

  quantity: Joi.number()
    .integer()
    .min(1)
    .max(999)
    .required()
    .messages({
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 999',
      'any.required': 'Quantity is required'
    }),

  // Optional fields that frontend might send
  name: Joi.string().optional(),
  sku: Joi.string().optional(),
  price: Joi.number().positive().optional(),
  totalPrice: Joi.number().positive().optional()
});

/**
 * Schema for shipping address
 */
export const shippingAddressSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ\\s]+$'))
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters and spaces',
      'any.required': 'First name is required'
    }),

  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(new RegExp('^[a-zA-ZÀ-ÿ\\s]+$'))
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces',
      'any.required': 'Last name is required'
    }),

  company: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Company name cannot exceed 100 characters'
    }),

  address1: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Address must be at least 5 characters long',
      'string.max': 'Address cannot exceed 200 characters',
      'any.required': 'Address is required'
    }),

  address2: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Address line 2 cannot exceed 200 characters'
    }),

  city: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'City must be at least 2 characters long',
      'string.max': 'City cannot exceed 100 characters',
      'any.required': 'City is required'
    }),

  state: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'State/Province must be at least 2 characters long',
      'string.max': 'State/Province cannot exceed 100 characters',
      'any.required': 'State/Province is required'
    }),

  postalCode: Joi.string()
    .trim()
    .pattern(new RegExp('^[0-9]{5}$|^[A-Z0-9]{2,10}$'))
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid postal code',
      'any.required': 'Postal code is required'
    }),

  country: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .default('Italy')
    .required()
    .messages({
      'string.min': 'Country must be at least 2 characters long',
      'string.max': 'Country cannot exceed 50 characters',
      'any.required': 'Country is required'
    }),

  phone: Joi.string()
    .pattern(new RegExp('^[\\+]?[0-9\\s\\-\\(\\)]{8,}$'))
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
});

/**
 * Schema for order creation
 */
export const createOrderSchema = Joi.object({
  userId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
    )
    .optional()
    .messages({
      'alternatives.match': 'User ID must be a valid integer'
    }),

  items: Joi.array()
    .items(orderItemSchema)
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'Order must contain at least one item',
      'array.max': 'Order cannot contain more than 50 items',
      'any.required': 'Order items are required'
    }),

  subtotal: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Subtotal must be a positive number'
    }),

  shippingCost: Joi.number()
    .min(0)
    .precision(2)
    .default(0)
    .messages({
      'number.min': 'Shipping cost cannot be negative'
    }),

  taxAmount: Joi.number()
    .min(0)
    .precision(2)
    .default(0)
    .messages({
      'number.min': 'Tax amount cannot be negative'
    }),

  discountAmount: Joi.number()
    .min(0)
    .precision(2)
    .default(0)
    .messages({
      'number.min': 'Discount amount cannot be negative'
    }),

  totalAmount: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Total amount must be a positive number'
    }),

  // New address reference fields (preferred method)
  shippingAddressId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.integer': 'Shipping address ID must be a valid integer',
      'number.positive': 'Shipping address ID must be positive'
    }),

  billingAddressId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.integer': 'Billing address ID must be a valid integer',
      'number.positive': 'Billing address ID must be positive'
    }),

  // For admin users creating orders for clients
  targetUserId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.integer': 'Target user ID must be a valid integer',
      'number.positive': 'Target user ID must be positive'
    }),

  // Legacy address fields (for backward compatibility)
  shippingAddress: Joi.alternatives().try(
    shippingAddressSchema,
    Joi.string().max(2000) // Allow JSON string
  ).optional(),

  billingAddress: Joi.alternatives().try(
    shippingAddressSchema,
    Joi.string().max(2000) // Allow JSON string
  ).optional(),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    }),

  status: Joi.string()
    .valid(...Object.values(OrderStatus))
    .optional()
    .messages({
      'any.only': `Status must be one of: ${Object.values(OrderStatus).join(', ')}`
    }),

  paymentStatus: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .optional()
    .messages({
      'any.only': `Payment status must be one of: ${Object.values(PaymentStatus).join(', ')}`
    }),

  currency: Joi.string()
    .uppercase()
    .length(3)
    .pattern(new RegExp('^[A-Z]{3}$'))
    .default('EUR')
    .messages({
      'string.length': 'Currency must be a 3-letter code',
      'string.pattern.base': 'Currency must be a valid 3-letter code (e.g., EUR, USD)'
    })
}).custom((value, helpers) => {
  // Ensure either shippingAddressId or shippingAddress is provided
  if (!value.shippingAddressId && !value.shippingAddress) {
    return helpers.error('custom.shippingAddressRequired');
  }
  return value;
}).messages({
  'custom.shippingAddressRequired': 'Either shippingAddressId or shippingAddress must be provided'
});

/**
 * Schema for complete order update
 */
export const updateOrderSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(OrderStatus))
    .optional()
    .messages({
      'any.only': `Status must be one of: ${Object.values(OrderStatus).join(', ')}`
    }),

  paymentStatus: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .optional()
    .messages({
      'any.only': `Payment status must be one of: ${Object.values(PaymentStatus).join(', ')}`
    }),

  trackingNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Tracking number cannot exceed 100 characters'
    }),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    }),

  subtotal: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Subtotal must be greater than or equal to 0'
    }),

  totalAmount: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Total amount must be greater than or equal to 0'
    }),

  shippingCost: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Shipping cost cannot be negative'
    }),

  taxAmount: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Tax amount cannot be negative'
    }),

  discountAmount: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Discount amount cannot be negative'
    }),

  currency: Joi.string()
    .uppercase()
    .length(3)
    .optional()
    .messages({
      'string.length': 'Currency must be exactly 3 characters',
      'string.uppercase': 'Currency must be uppercase'
    }),

  items: Joi.array()
    .items(orderItemSchema.keys({
      id: Joi.number().optional() // Allow existing item IDs
    }))
    .min(1)
    .max(50)
    .optional()
    .messages({
      'array.min': 'Order must contain at least one item',
      'array.max': 'Order cannot contain more than 50 items'
    }),

  // New address reference fields (preferred method)
  shippingAddressId: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.integer': 'Shipping address ID must be a valid integer',
      'number.positive': 'Shipping address ID must be positive'
    }),

  billingAddressId: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      'number.integer': 'Billing address ID must be a valid integer',
      'number.positive': 'Billing address ID must be positive'
    }),

  // Legacy address fields (for backward compatibility)
  shippingAddress: Joi.alternatives().try(
    shippingAddressSchema,
    Joi.string().max(2000) // Allow JSON string
  ).optional(),

  billingAddress: Joi.alternatives().try(
    shippingAddressSchema,
    Joi.string().max(2000) // Allow JSON string
  ).optional()
});

/**
 * Schema for order status update
 */
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(OrderStatus))
    .required()
    .messages({
      'any.only': `Status must be one of: ${Object.values(OrderStatus).join(', ')}`,
      'any.required': 'Status is required'
    }),

  paymentStatus: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .optional()
    .messages({
      'any.only': `Payment status must be one of: ${Object.values(PaymentStatus).join(', ')}`
    }),

  trackingNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Tracking number cannot exceed 100 characters'
    }),

  cancelReason: Joi.string()
    .trim()
    .max(500)
    .when('status', {
      is: OrderStatus.CANCELLED,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.max': 'Cancel reason cannot exceed 500 characters',
      'any.required': 'Cancel reason is required when cancelling an order'
    })
});

// ==========================================
// SEARCH VALIDATION SCHEMAS
// ==========================================

/**
 * Schema for global search parameters
 */
export const globalSearchSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  
  entities: Joi.string()
    .pattern(/^(products|categories|orders|users)(,(products|categories|orders|users))*$/)
    .default('products,categories')
    .messages({
      'string.pattern.base': 'Invalid entities format. Must be comma-separated list of: products, categories, orders, users'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  sortBy: Joi.string()
    .valid('relevance', 'date', 'name', 'price')
    .default('relevance')
    .messages({
      'any.only': 'Sort by must be one of: relevance, date, name, price'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    }),

  // Price filter
  'price.min': Joi.number().min(0).optional(),
  'price.max': Joi.number().min(0).optional(),
  
  // Category filter
  categoryIds: Joi.string().optional(),
  
  // Status filter
  status: Joi.string().optional(),
  
  // Date filter
  'date.from': Joi.date().optional(),
  'date.to': Joi.date().optional(),
  
  // Boolean filters
  inStock: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});

/**
 * Schema for search suggestions
 */
export const searchSuggestionsSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 50 characters',
      'any.required': 'Search query is required'
    }),
  
  type: Joi.string()
    .valid('products', 'categories', 'all')
    .default('all')
    .messages({
      'any.only': 'Type must be one of: products, categories, all'
    })
});

/**
 * Schema for autocomplete
 */
export const autocompleteSchema = Joi.object({
  q: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query cannot exceed 50 characters',
      'any.required': 'Search query is required'
    }),
  
  type: Joi.string()
    .valid('products', 'categories')
    .optional()
    .messages({
      'any.only': 'Type must be one of: products, categories'
    })
});

/**
 * Schema for product search
 */
export const productSearchSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  sortBy: Joi.string()
    .valid('relevance', 'price', 'name', 'date')
    .default('relevance'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
  
  'price.min': Joi.number().min(0).optional(),
  'price.max': Joi.number().min(0).optional(),
  categoryIds: Joi.string().optional(),
  status: Joi.string().optional(),
  inStock: Joi.boolean().optional(),
  includeRelated: Joi.boolean().default(false)
});

/**
 * Schema for category search
 */
export const categorySearchSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  sortBy: Joi.string()
    .valid('relevance', 'name', 'date')
    .default('relevance'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
  
  includeRelated: Joi.boolean().default(false)
});

/**
 * Schema for order search
 */
export const orderSearchSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  sortBy: Joi.string()
    .valid('relevance', 'date', 'total')
    .default('date'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
  
  status: Joi.string().optional(),
  'date.from': Joi.date().optional(),
  'date.to': Joi.date().optional()
});

/**
 * Schema for user search
 */
export const userSearchSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Search query is required',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  sortBy: Joi.string()
    .valid('name', 'email', 'date')
    .default('name'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc'),
  
  role: Joi.string().optional()
});

// ==========================================
// COMMON VALIDATION SCHEMAS
// ==========================================

/**
 * Schema for pagination parameters
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .max(9999)
    .default(1)
    .messages({
      'number.integer': 'Page must be a whole number',
      'number.min': 'Page must be at least 1',
      'number.max': 'Page cannot exceed 9999'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  sortBy: Joi.string()
    .optional()
    .messages({
      'string.base': 'Sort field must be a string'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    })
});

/**
 * Schema for search parameters
 */
export const searchSchema = Joi.object({
  query: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character long',
      'string.max': 'Search query cannot exceed 100 characters'
    }),

  category: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.integer': 'Category must be a valid integer',
      'number.positive': 'Category must be positive'
    }),

  minPrice: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      'number.positive': 'Minimum price must be a positive number'
    }),

  maxPrice: Joi.number()
    .positive()
    .precision(2)
    .greater(Joi.ref('minPrice'))
    .optional()
    .messages({
      'number.positive': 'Maximum price must be a positive number',
      'number.greater': 'Maximum price must be greater than minimum price'
    }),

  inStock: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'In stock filter must be true or false'
    })
});
