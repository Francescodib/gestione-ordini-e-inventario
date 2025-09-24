/**
 * Audit Service for logging user actions and system events
 * File: src/services/auditService.ts
 */

import { AuditLog, AuditAction, ResourceType } from '../models';
import { Transaction } from 'sequelize';
import { logger } from '../config/logger';

export interface AuditLogRequest {
  userId: number;
  targetUserId?: number;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: number;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
  userAgent?: string;
}

export interface SecurityEventRequest {
  action: string;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  details?: object;
}

export class AuditService {

  /**
   * Log a user action with audit trail
   */
  static async logUserAction(
    auditData: AuditLogRequest,
    options?: { transaction?: Transaction }
  ): Promise<AuditLog> {
    try {
      return await AuditLog.create({
        userId: auditData.userId,
        targetUserId: auditData.targetUserId,
        action: auditData.action,
        resourceType: auditData.resourceType,
        resourceId: auditData.resourceId,
        oldValues: auditData.oldValues,
        newValues: auditData.newValues,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
        createdBy: auditData.userId
      }, options);
    } catch (error) {
      logger.error('Failed to log audit action:', error);
      throw error;
    }
  }

  /**
   * Log a security event (like failed login attempts)
   */
  static async logSecurityEvent(eventData: SecurityEventRequest): Promise<void> {
    try {
      // For security events without a specific user, we create a system audit log
      // You might want to create a separate security_events table for this
      logger.warn('Security Event:', {
        timestamp: new Date().toISOString(),
        action: eventData.action,
        userId: eventData.userId,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        details: eventData.details
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const { count, rows } = await AuditLog.findAndCountAll({
        where: {
          targetUserId: userId
        },
        include: [
          {
            association: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName']
          },
          {
            association: 'creator',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return {
        logs: rows,
        total: count
      };
    } catch (error) {
      logger.error('Failed to get user audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs performed by a specific user
   */
  static async getAuditLogsByUser(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const { count, rows } = await AuditLog.findAndCountAll({
        where: {
          userId: userId
        },
        include: [
          {
            association: 'targetUser',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return {
        logs: rows,
        total: count
      };
    } catch (error) {
      logger.error('Failed to get audit logs by user:', error);
      throw error;
    }
  }

  /**
   * Get all audit logs with filters
   */
  static async getAllAuditLogs(filters?: {
    action?: AuditAction;
    resourceType?: ResourceType;
    userId?: number;
    targetUserId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const where: any = {};

      if (filters?.action) where.action = filters.action;
      if (filters?.resourceType) where.resourceType = filters.resourceType;
      if (filters?.userId) where.userId = filters.userId;
      if (filters?.targetUserId) where.targetUserId = filters.targetUserId;

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            association: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName']
          },
          {
            association: 'targetUser',
            attributes: ['id', 'username', 'firstName', 'lastName']
          },
          {
            association: 'creator',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: filters?.limit || 50,
        offset: filters?.offset || 0
      });

      return {
        logs: rows,
        total: count
      };
    } catch (error) {
      logger.error('Failed to get all audit logs:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs (older than specified days)
   */
  static async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await AuditLog.destroy({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`Cleaned up ${deletedCount} audit logs older than ${daysToKeep} days`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }
}

export default AuditService;