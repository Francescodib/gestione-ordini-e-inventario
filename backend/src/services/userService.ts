/**
 * User service with Sequelize ORM
 * File: src/services/userService.ts
 */

import { User, UserRole } from '../models';
import { sequelize } from '../config/database';
import bcrypt from 'bcryptjs';
import { Op, WhereOptions, fn, col } from 'sequelize';

/**
 * Interfaces for requests
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User service class with Sequelize
 */
export class UserService {

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = await User.create({
        username: userData.username.toLowerCase().trim(),
        email: userData.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        role: userData.role || UserRole.USER
      });

      return user;
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.fields && Object.keys(error.fields)[0] || 'field';
        throw new Error(`User with this ${field} already exists`);
      }
      throw error;
    }
  }

  /**
   * Get all users
   */
  static async getAllUsers(includeInactive: boolean = false): Promise<User[]> {
    const where = includeInactive ? {} : { isActive: true };
    
    return User.findAll({
      where,
      attributes: {
        exclude: ['password']
      },
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: number): Promise<User | null> {
    try {
      return User.findByPk(id, {
        attributes: {
          exclude: ['password']
        }
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string, includePassword: boolean = false): Promise<User | null> {
    try {
      const attributes = includePassword ? undefined : { exclude: ['password'] };
      
      return User.findOne({
        where: { email: email.toLowerCase().trim() },
        attributes
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      return User.findOne({
        where: { username: username.toLowerCase().trim() },
        attributes: {
          exclude: ['password']
        }
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user
   */
  static async updateUser(id: number, userData: UpdateUserRequest): Promise<User | null> {
    try {
      const updateData: any = {};
      
      if (userData.username) {
        updateData.username = userData.username.toLowerCase().trim();
      }
      if (userData.email) {
        updateData.email = userData.email.toLowerCase().trim();
      }
      if (userData.firstName) {
        updateData.firstName = userData.firstName.trim();
      }
      if (userData.lastName) {
        updateData.lastName = userData.lastName.trim();
      }
      if (userData.role) {
        updateData.role = userData.role;
      }
      if (typeof userData.isActive === 'boolean') {
        updateData.isActive = userData.isActive;
      }

      const [affectedRows] = await User.update(updateData, {
        where: { id },
        returning: true
      });

      if (affectedRows === 0) {
        return null; // User not found
      }

      // Get the updated user without password
      return User.findByPk(id, {
        attributes: {
          exclude: ['password']
        }
      });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.fields && Object.keys(error.fields)[0] || 'field';
        throw new Error(`User with this ${field} already exists`);
      }
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(id: number): Promise<boolean> {
    try {
      const [affectedRows] = await User.update(
        { isActive: false },
        { where: { id } }
      );
      return affectedRows > 0;
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Hard delete user
   */
  static async hardDeleteUser(id: number): Promise<boolean> {
    try {
      const deletedRows = await User.destroy({
        where: { id }
      });
      return deletedRows > 0;
    } catch (error: any) {
      return false;
    }
  }

  // ==========================================
  // AUTHENTICATION OPERATIONS
  // ==========================================

  /**
   * Authenticate user for login
   */
  static async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      // Find user with password
      const user = await User.findOne({
        where: { 
          email: email.toLowerCase().trim(),
          isActive: true 
        }
      });

      if (!user) {
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      // Update last login
      await User.update(
        { lastLogin: new Date() },
        { where: { id: user.id } }
      );

      // Return user without password
      const { password: _, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword as User;
    } catch (error) {
      return null;
    }
  }

  // ==========================================
  // ADVANCED QUERIES
  // ==========================================

  /**
   * Find users by role
   */
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    return User.findAll({
      where: { 
        role, 
        isActive: true 
      },
      attributes: {
        exclude: ['password']
      },
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
  }

  /**
   * Search users
   */
  static async searchUsers(searchTerm: string): Promise<User[]> {
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) {
      return [];
    }

    const normalizedSearch = trimmedSearch.toLowerCase();

    return User.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          sequelize.where(
            sequelize.fn('lower', sequelize.col('firstName')),
            { [Op.like]: `%${normalizedSearch}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('lastName')),
            { [Op.like]: `%${normalizedSearch}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('email')),
            { [Op.like]: `%${normalizedSearch}%` }
          ),
          sequelize.where(
            sequelize.fn('lower', sequelize.col('username')),
            { [Op.like]: `%${normalizedSearch}%` }
          )
        ]
      },
      attributes: {
        exclude: ['password']
      },
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
  }

  /**
   * Get user statistics
   */
  static async getUserStats() {
    const [total, active, inactive, byRole] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { isActive: false } }),
      User.findAll({
        attributes: [
          'role',
          [fn('COUNT', col('role')), 'count']
        ],
        group: ['role'],
        raw: true
      })
    ]);

    const roleStats = (byRole as any[]).reduce((acc, item) => {
      acc[item.role.toLowerCase()] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers: total,
      activeUsers: active,
      inactiveUsers: inactive,
      adminUsers: roleStats.admin || 0,
      managerUsers: roleStats.manager || 0,
      regularUsers: roleStats.user || 0
    };
  }

  /**
   * Check if user exists by email or username
   */
  static async checkUserExists(
    email?: string, 
    username?: string, 
    excludeId?: number
  ): Promise<{ emailExists: boolean; usernameExists: boolean }> {
    const conditions: any[] = [];
    
    if (email) {
      conditions.push({ email: email.toLowerCase().trim() });
    }
    
    if (username) {
      conditions.push({ username: username.toLowerCase().trim() });
    }

    if (conditions.length === 0) {
      return { emailExists: false, usernameExists: false };
    }

    const where: WhereOptions = { [Op.or]: conditions };
    
    if (excludeId) {
      where[Op.not] = { id: excludeId };
    }

    const existingUsers = await User.findAll({
      where,
      attributes: ['email', 'username']
    });

    const emailExists = email ? existingUsers.some(user => user.email === email.toLowerCase().trim()) : false;
    const usernameExists = username ? existingUsers.some(user => user.username === username.toLowerCase().trim()) : false;

    return { emailExists, usernameExists };
  }
}