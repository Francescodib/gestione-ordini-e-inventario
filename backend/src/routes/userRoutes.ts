/**
 * Enhanced User Routes with RBAC and Address Management
 * File: src/routes/userRoutes.ts
 */

import express, { Request, Response } from 'express';
import { UserService, CreateUserRequest, UpdateUserRequest, LoginRequest, UserResponse } from '../services/userService';
import { AddressService, CreateAddressRequest, UpdateAddressRequest } from '../services/addressService';
import { AuthService } from '../services/authService';
import {
  verifyToken,
  requireAdmin,
  requireManager,
  requireSelfOrAdmin,
  requireSelfOrManager,
  requireUserCreationAuth,
  requireRoleChangeAuth,
  requireClientForAddress,
  validateRequest,
  securityHeaders
} from '../middleware/authEnhanced';
import { verifyToken as verifyTokenStandard } from '../middleware/auth';
import { logger } from '../config/logger';
import {
  validateBody,
  validateQuery,
  validateId,
  sanitizeInput,
  validateContentType,
  handleValidationErrors
} from "../middleware/validation";
import {
  createUserSchema,
  loginUserSchema,
  updateUserSchema,
  changePasswordSchema,
  paginationSchema
} from "../validation/schemas";

const router = express.Router();

// Apply security headers to all routes
router.use(securityHeaders);

// Helper function to parse ID
const parseIntId = (id: string): number => {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid ID format');
  }
  return parsed;
};

// ==========================================
// PUBLIC ROUTES (no authentication required)
// ==========================================

/**
 * POST /api/users/register
 * User registration - only creates basic user, address is handled separately
 */
router.post('/register',
  sanitizeInput(),
  validateContentType(),
  validateBody(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const userData: CreateUserRequest = req.body;

      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email, password, firstName, lastName'
        });
      }

      if (userData.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check if user already exists
      const existingUser = await UserService.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Generate username if not provided
      if (!userData.username) {
        userData.username = userData.email.split('@')[0];
      }

      // Check username conflicts
      const existingUsername = await UserService.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }

      // Create user (address will be handled separately if needed)
      const newUser = await UserService.createUser(userData, undefined, req.auditContext);

      // Remove sensitive data for response
      const userForToken = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        emailVerified: newUser.emailVerified,
        lastLogin: newUser.lastLogin,
        phone: newUser.phone,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };

      const authResponse = AuthService.createAuthResponse(userForToken as any);

      res.status(201).json({
        ...authResponse,
        message: 'User registered successfully'
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating user',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/users/login
 * User authentication
 */
router.post('/login',
  sanitizeInput(),
  validateContentType(),
  validateBody(loginUserSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password }: LoginRequest = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const user = await UserService.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const userForToken = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      const authResponse = AuthService.createAuthResponse(userForToken as any);

      logger.info('User login successful', { userId: user.id, ip: req.ip });

      res.json({
        ...authResponse,
        message: 'Login successful'
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      logger.warn('User login failed', { email: req.body?.email || 'unknown', ip: req.ip });

      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/users/refresh
 * Token refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const newToken = AuthService.refreshToken(token);
    if (!newToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      error: error.message
    });
  }
});

// ==========================================
// PROTECTED ROUTES (require authentication)
// ==========================================

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', verifyTokenStandard, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await UserService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
});

/**
 * GET /api/users
 * Get all users (Admin/Manager only)
 */
router.get('/',
  requireManager,
  validateQuery(paginationSchema, { allowUnknown: true }),
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, role, active } = req.query;

      let users;

      if (role) {
        users = await UserService.getUsersByRole(role as any);
      } else {
        const includeInactive = active === 'false' ? true : false;
        users = await UserService.getAllUsers(!includeInactive);
      }

      const userResponses = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      res.json({
        success: true,
        data: userResponses,
        count: userResponses.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error fetching users',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/users/search
 * Search users (Admin/Manager only)
 */
router.get('/search', requireManager, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter "q" is required'
      });
    }

    const users = await UserService.searchUsers(q);

    const userResponses = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      success: true,
      data: userResponses,
      count: userResponses.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error searching users',
      error: error.message
    });
  }
});

/**
 * GET /api/users/stats
 * Get user statistics (Admin only)
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await UserService.getUserStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user stats',
      error: error.message
    });
  }
});

/**
 * POST /api/users
 * Create new user with role-based authorization
 */
router.post('/',
  requireUserCreationAuth,
  sanitizeInput(),
  validateContentType(),
  validateBody(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const { confirmPassword, ...userData }: CreateUserRequest & { confirmPassword: string } = req.body;

      const newUser = await UserService.createUser(
        userData,
        req.user?.userId,
        req.auditContext
      );

      const userResponse = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        emailVerified: newUser.emailVerified,
        phone: newUser.phone,
        createdAt: newUser.createdAt
      };

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: userResponse
      });
    } catch (error: any) {
      logger.error('Error creating user', {
        error: error.message,
        userData: { ...req.body, password: '[REDACTED]' }
      });

      res.status(500).json({
        success: false,
        message: 'Error creating user',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/users/:id
 * Get specific user (self access or admin/manager)
 */
router.get('/:id',
  requireSelfOrManager,
  validateId(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseIntId(req.params.id);

      const user = await UserService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userResponse: UserResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.json({
        success: true,
        data: userResponse
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user (self access or admin, with role change restrictions)
 */
router.put('/:id',
  requireSelfOrAdmin,
  requireRoleChangeAuth,
  validateId(),
  sanitizeInput(),
  validateContentType(),
  validateBody(updateUserSchema),
  async (req: Request, res: Response) => {
    try {
      const userData: UpdateUserRequest = req.body;

      // Check for conflicts
      if (userData.email || userData.username) {
        const conflicts = await UserService.checkUserExists(
          userData.email,
          userData.username,
          parseIntId(req.params.id)
        );

        if (conflicts.emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }

        if (conflicts.usernameExists) {
          return res.status(400).json({
            success: false,
            message: 'Username already exists'
          });
        }
      }

      const userId = parseIntId(req.params.id);
      const updatedUser = await UserService.updateUser(userId, userData);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userResponse: UserResponse = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        emailVerified: updatedUser.emailVerified,
        lastLogin: updatedUser.lastLogin,
        phone: updatedUser.phone,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };

      res.json({
        success: true,
        data: userResponse,
        message: 'User updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error updating user',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Deactivate user (Admin only)
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseIntId(req.params.id);
    const deleted = await UserService.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// ==========================================
// ADDRESS MANAGEMENT ROUTES (CLIENT users only)
// ==========================================

/**
 * GET /api/users/:id/addresses
 * Get all addresses for a user (CLIENT only)
 */
router.get('/:id/addresses',
  verifyTokenStandard,
  validateId(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseIntId(req.params.id);
      const addresses = await AddressService.getUserAddresses(userId);

      res.json({
        success: true,
        data: addresses
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error fetching addresses',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/users/:id/addresses
 * Create new address for user (CLIENT only)
 */
router.post('/:id/addresses',
  verifyTokenStandard,
  validateId(),
  sanitizeInput(),
  validateContentType(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseIntId(req.params.id);
      const addressData: CreateAddressRequest = req.body;

      if (!addressData.streetAddress || !addressData.city || !addressData.postalCode || !addressData.country) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: streetAddress, city, postalCode, country'
        });
      }

      const address = await AddressService.createAddress(
        userId,
        addressData,
        req.user?.userId!,
        req.auditContext
      );

      res.status(201).json({
        success: true,
        data: address,
        message: 'Address created successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error creating address',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/users/:id/addresses/:addressId
 * Update address (CLIENT only)
 */
router.put('/:id/addresses/:addressId',
  verifyTokenStandard,
  sanitizeInput(),
  validateContentType(),
  async (req: Request, res: Response) => {
    try {
      const userId = parseIntId(req.params.id);
      const addressId = parseIntId(req.params.addressId);
      const addressData: UpdateAddressRequest = req.body;

      const address = await AddressService.updateAddress(
        addressId,
        userId,
        addressData,
        req.user?.userId!,
        req.auditContext
      );

      res.json({
        success: true,
        data: address,
        message: 'Address updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error updating address',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/users/:id/addresses/:addressId
 * Delete address (CLIENT only)
 */
router.delete('/:id/addresses/:addressId',
  verifyTokenStandard,
  async (req: Request, res: Response) => {
    try {
      const userId = parseIntId(req.params.id);
      const addressId = parseIntId(req.params.addressId);

      await AddressService.deleteAddress(
        addressId,
        userId,
        req.user?.userId!,
        req.auditContext
      );

      res.json({
        success: true,
        message: 'Address deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error deleting address',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/users/:id/addresses/:addressId/default
 * Set address as default (CLIENT only)
 */
router.post('/:id/addresses/:addressId/default',
  verifyTokenStandard,
  async (req: Request, res: Response) => {
    try {
      const userId = parseIntId(req.params.id);
      const addressId = parseIntId(req.params.addressId);

      const address = await AddressService.setDefaultAddress(
        addressId,
        userId,
        req.user?.userId!
      );

      res.json({
        success: true,
        data: address,
        message: 'Default address set successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error setting default address',
        error: error.message
      });
    }
  }
);

// Error handling middleware
router.use(handleValidationErrors());

export default router;