/**
 * Enhanced User Routes with RBAC and Address Management
 * File: src/routes/userRoutes.ts
 */

import express, { Request, Response } from 'express';
import { UserService, CreateUserRequest, UpdateUserRequest, LoginRequest, UserResponse } from '../services/userService';
import { AddressService, CreateAddressRequest, UpdateAddressRequest } from '../services/addressService';
import { AuthService } from '../services/authService';
import { verifyToken, requireAdmin, requireManagerOrAdmin, requireSelfOrAdmin } from '../middleware/auth';
import { logger } from '../config/logger';

const router = express.Router();


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
router.get('/me', verifyToken, async (req: Request, res: Response) => {
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
  verifyToken,
  requireManagerOrAdmin,
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
router.get('/search', verifyToken, requireManagerOrAdmin, async (req: Request, res: Response) => {
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
router.get('/stats', verifyToken, requireAdmin, async (req: Request, res: Response) => {
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
  verifyToken,
  requireManagerOrAdmin,
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
 * GET /api/users/inactive
 * Get inactive users (Admin/Manager only)
 */
router.get('/inactive', verifyToken, requireManagerOrAdmin, async (req: Request, res: Response) => {
  try {
    const inactiveDays = req.query.days ? parseInt(req.query.days as string) : 90;
    const inactiveUsers = await UserService.getInactiveUsers(inactiveDays);

    res.json({
      success: true,
      data: inactiveUsers,
      message: `Found ${inactiveUsers.length} inactive users`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching inactive users',
      error: error.message
    });
  }
});

/**
 * POST /api/users/check-dependencies
 * Check user dependencies before deletion (Admin/Manager only)
 */
router.post('/check-dependencies', verifyToken, requireManagerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userIds }: { userIds: number[] } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required'
      });
    }

    const results = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        ...(await UserService.checkUserDependencies(userId))
      }))
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error checking user dependencies',
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/cleanup-inactive
 * Safely delete inactive users (Admin/Manager only)
 */
router.delete('/cleanup-inactive', verifyToken, requireManagerOrAdmin, async (req: Request, res: Response) => {
  try {
    const { userIds }: { userIds: number[] } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required'
      });
    }

    const result = await UserService.safeDeleteInactiveUsers(userIds, req.user?.userId!);

    res.json({
      success: true,
      data: result,
      message: `Processed ${userIds.length} users: ${result.deleted.length} deleted, ${result.skipped.length} skipped, ${result.errors.length} errors`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error during inactive users cleanup',
      error: error.message
    });
  }
});

/**
 * GET /api/users/export/csv
 * Export users to CSV (Admin/Manager only)
 */
router.get('/export/csv', verifyToken, requireManagerOrAdmin, async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const csvContent = await UserService.exportUsersToCSV(includeInactive);

    const filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error exporting users to CSV',
      error: error.message
    });
  }
});

/**
 * GET /api/users/:id
 * Get specific user (self access or admin/manager)
 */
router.get('/:id',
  verifyToken,
  requireManagerOrAdmin,
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
  verifyToken,
  requireSelfOrAdmin,
  async (req: Request, res: Response) => {
    try {
      let userData: UpdateUserRequest = req.body;

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
      const currentUserId = req.user?.userId;

      // Se non è admin e sta modificando il proprio profilo, rimuovi campi sensibili
      if (req.user?.role !== 'ADMIN' && currentUserId === userId) {
        // Gli utenti non-admin possono modificare solo alcuni campi del proprio profilo
        const allowedFields = ['firstName', 'lastName', 'phone', 'currentPassword', 'newPassword'];
        const filteredUserData: any = {};

        for (const key of allowedFields) {
          if (userData.hasOwnProperty(key)) {
            filteredUserData[key] = (userData as any)[key];
          }
        }

        userData = filteredUserData as UpdateUserRequest;
      }

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
router.delete('/:id', verifyToken, requireAdmin, async (req: Request, res: Response) => {
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
  verifyToken,
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
  verifyToken,
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
  verifyToken,
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
  verifyToken,
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
  verifyToken,
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


export default router;