/**
 * User service with Sequelize ORM
 * File: src/services/userService.ts
 */

import { User, UserRole, UserAddress, AddressType, AuditLog, Order } from '../models';
import { AuditService } from './auditService';
import { AuditAction, ResourceType } from '../models';
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
  phone?: string;
  address?: {
    streetAddress: string;
    city: string;
    postalCode: string;
    country: string;
    state?: string;
    addressType?: 'SHIPPING' | 'BILLING';
  };
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  phone?: string;
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
  phone?: string;
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
  static async createUser(
    userData: CreateUserRequest,
    createdBy?: number,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<User> {
    const transaction = await sequelize.transaction();

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user with all fields including phone
      const user = await User.create({
        username: userData.username.toLowerCase().trim(),
        email: userData.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        role: userData.role || UserRole.CLIENT,
        phone: userData.phone || undefined
      }, { transaction });

      // Create address in separate table if user is CLIENT and address provided
      if ((userData.role || UserRole.CLIENT) === UserRole.CLIENT && userData.address) {
        await UserAddress.create({
          userId: user.id,
          addressType: (userData.address.addressType as AddressType) || AddressType.SHIPPING,
          streetAddress: userData.address.streetAddress,
          city: userData.address.city,
          postalCode: userData.address.postalCode,
          country: userData.address.country,
          state: userData.address.state,
          isDefault: true
        }, { transaction });
      }

      // Log user creation
      if (createdBy) {
        await AuditService.logUserAction({
          userId: createdBy,
          targetUserId: user.id,
          action: AuditAction.CREATE,
          resourceType: ResourceType.USER,
          resourceId: user.id,
          newValues: {
            username: user.username,
            email: user.email,
            role: user.role
          },
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent
        }, { transaction });
      }

      await transaction.commit();
      return user;
    } catch (error: any) {
      await transaction.rollback();

      // Handle unique constraint violations
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.fields && error.fields.length > 0 ? error.fields[0] : 'field';
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
      if (userData.phone !== undefined) {
        updateData.phone = userData.phone || null;
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
        const field = error.fields ? Object.keys(error.fields)[0] : undefined;
        const fieldName = field || 'field';
        throw new Error(`User with this ${fieldName} already exists`);
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
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const [total, active, inactive, byRole, newThisMonth] = await Promise.all([
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
      }),
      User.count({
        where: {
          createdAt: {
            [Op.gte]: firstDayOfMonth
          }
        }
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
      newThisMonth: newThisMonth,
      adminUsers: roleStats.admin || 0,
      managerUsers: roleStats.manager || 0,
      clientUsers: roleStats.client || 0
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

    let where: WhereOptions = { [Op.or]: conditions };

    if (excludeId) {
      where = {
        [Op.and]: [
          { [Op.or]: conditions },
          { id: { [Op.ne]: excludeId } }
        ]
      };
    }

    const existingUsers = await User.findAll({
      where,
      attributes: ['email', 'username']
    });

    const emailExists = email ? existingUsers.some(user => user.email === email.toLowerCase().trim()) : false;
    const usernameExists = username ? existingUsers.some(user => user.username === username.toLowerCase().trim()) : false;

    return { emailExists, usernameExists };
  }

  /**
   * Get inactive users (users who haven't logged in for a specified period)
   */
  static async getInactiveUsers(inactiveDays: number = 90): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    return await User.findAll({
      where: {
        [Op.or]: [
          { lastLogin: { [Op.lt]: cutoffDate } },
          { lastLogin: { [Op.is]: null } }
        ],
        isActive: false
      },
      order: [['lastLogin', 'ASC']]
    });
  }

  /**
   * Check user dependencies before safe deletion
   */
  static async checkUserDependencies(userId: number): Promise<{
    canDelete: boolean;
    dependencies: {
      orders: number;
      auditLogs: number;
      createdUsers: number;
      addresses: number;
    };
    warnings: string[];
  }> {
    const [orders, auditLogs, addresses] = await Promise.all([
      Order.count({ where: { userId } }),
      AuditLog.count({ where: { [Op.or]: [{ userId }, { targetUserId: userId }] } }),
      UserAddress.count({ where: { userId } })
    ]);

    // Set createdUsers to 0 since User model doesn't have createdBy field
    const createdUsers = 0;

    const warnings = [];
    let canDelete = true;

    if (orders > 0) {
      warnings.push(`L'utente ha ${orders} ordini associati`);
      canDelete = false;
    }

    if (auditLogs > 0) {
      warnings.push(`L'utente ha ${auditLogs} log di audit associati`);
    }

    if (createdUsers > 0) {
      warnings.push(`L'utente ha creato ${createdUsers} altri utenti`);
      canDelete = false;
    }

    if (addresses > 0) {
      warnings.push(`L'utente ha ${addresses} indirizzi associati`);
    }

    // Never allow deletion of ADMIN users
    const user = await User.findByPk(userId);
    if (user?.role === 'ADMIN') {
      warnings.push('Non è possibile eliminare utenti con ruolo ADMIN');
      canDelete = false;
    }

    return {
      canDelete,
      dependencies: {
        orders,
        auditLogs,
        createdUsers,
        addresses
      },
      warnings
    };
  }

  /**
   * Safely delete inactive users with dependency checks
   */
  static async safeDeleteInactiveUsers(
    userIds: number[],
    performedBy: number
  ): Promise<{
    deleted: number[];
    skipped: { userId: number; reasons: string[] }[];
    errors: { userId: number; error: string }[];
  }> {
    const deleted: number[] = [];
    const skipped: { userId: number; reasons: string[] }[] = [];
    const errors: { userId: number; error: string }[] = [];

    for (const userId of userIds) {
      try {
        const dependencyCheck = await this.checkUserDependencies(userId);

        if (!dependencyCheck.canDelete) {
          skipped.push({
            userId,
            reasons: dependencyCheck.warnings
          });
          continue;
        }

        // Perform the deletion in a transaction
        await sequelize.transaction(async (transaction) => {
          const user = await User.findByPk(userId, { transaction });
          if (!user) {
            throw new Error('Utente non trovato');
          }

          // Create audit log
          await AuditLog.create({
            userId: performedBy,
            targetUserId: userId,
            action: AuditAction.DELETE,
            resourceType: ResourceType.USER,
            resourceId: userId,
            createdBy: performedBy,
            oldValues: {
              username: user.username,
              email: user.email,
              role: user.role,
              isActive: user.isActive
            }
          }, { transaction });

          // Delete associated addresses first (cascade)
          await UserAddress.destroy({
            where: { userId },
            transaction
          });

          // Delete the user
          await user.destroy({ transaction });
        });

        deleted.push(userId);
      } catch (error: any) {
        errors.push({
          userId,
          error: error.message || 'Errore durante l\'eliminazione'
        });
      }
    }

    return { deleted, skipped, errors };
  }

  /**
   * Export users to CSV format
   */
  static async exportUsersToCSV(includeInactive: boolean = false): Promise<string> {
    const whereClause = includeInactive ? {} : { isActive: true };

    const users = await User.findAll({
      where: whereClause,
      attributes: [
        'id', 'username', 'firstName', 'lastName', 'email', 'role',
        'isActive', 'emailVerified', 'lastLogin', 'createdAt', 'updatedAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    const headers = [
      'ID', 'Username', 'Nome', 'Cognome', 'Email', 'Ruolo',
      'Attivo', 'Email Verificata', 'Ultimo Login', 'Data Registrazione', 'Ultimo Aggiornamento'
    ];

    const rows = users.map(user => [
      user.id,
      user.username,
      user.firstName || '',
      user.lastName || '',
      user.email,
      user.role,
      user.isActive ? 'Sì' : 'No',
      user.emailVerified ? 'Sì' : 'No',
      user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('it-IT') : 'Mai',
      new Date(user.createdAt).toLocaleDateString('it-IT'),
      new Date(user.updatedAt).toLocaleDateString('it-IT')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}