/**
 * User service with Prisma ORM
 * File: src/services/userService.ts
 */

import { User, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';

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

/**
 * User service class with Prisma
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
      
      const user = await prisma.user.create({
        data: {
          username: userData.username.toLowerCase().trim(),
          email: userData.email.toLowerCase().trim(),
          password: hashedPassword,
          firstName: userData.firstName.trim(),
          lastName: userData.lastName.trim(),
          role: userData.role || UserRole.USER
        }
      });

      return user;
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
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
    
    return prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        password: false // Exclude password
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      return prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          password: false
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
      return prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          password: includePassword
        }
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
      return prisma.user.findUnique({
        where: { username: username.toLowerCase().trim() },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          password: false
        }
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user
   */
  static async updateUser(id: string, userData: UpdateUserRequest): Promise<User | null> {
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

      return prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          password: false
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new Error(`User with this ${field} already exists`);
      }
      if (error.code === 'P2025') {
        return null; // User not found
      }
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(id: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: { isActive: false }
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        return false; // User not found
      }
      return false;
    }
  }

  /**
   * Hard delete user
   */
  static async hardDeleteUser(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id }
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        return false; // User not found
      }
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
      const user = await prisma.user.findUnique({
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
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
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
    return prisma.user.findMany({
      where: { 
        role, 
        isActive: true 
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        password: false
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
    });
  }

  /**
   * Search users
   */
  static async searchUsers(searchTerm: string): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { username: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        password: false
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
    });
  }

  /**
   * Get user statistics
   */
  static async getUserStats() {
    const [total, active, inactive, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      })
    ]);

    const roleStats = byRole.reduce((acc, item) => {
      acc[item.role.toLowerCase()] = item._count.role;
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
    excludeId?: string
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

    const where: any = { OR: conditions };
    
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const existingUsers = await prisma.user.findMany({
      where,
      select: { email: true, username: true }
    });

    const emailExists = email ? existingUsers.some(user => user.email === email.toLowerCase().trim()) : false;
    const usernameExists = username ? existingUsers.some(user => user.username === username.toLowerCase().trim()) : false;

    return { emailExists, usernameExists };
  }
}