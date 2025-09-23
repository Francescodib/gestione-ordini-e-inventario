/**
 * AuditLog Sequelize Model
 * File: src/models/AuditLog.ts
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET = 'PASSWORD_RESET'
}

export enum ResourceType {
  USER = 'USER',
  ORDER = 'ORDER',
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  ADDRESS = 'ADDRESS'
}

export interface AuditLogAttributes {
  id: number;
  userId: number;
  targetUserId?: number;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: number;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  createdBy: number;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'targetUserId' | 'resourceId' | 'oldValues' | 'newValues' | 'ipAddress' | 'userAgent' | 'createdAt'> {}

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: number;
  declare userId: number;
  declare targetUserId?: number;
  declare action: AuditAction;
  declare resourceType: ResourceType;
  declare resourceId?: number;
  declare oldValues?: object;
  declare newValues?: object;
  declare ipAddress?: string;
  declare userAgent?: string;
  declare readonly createdAt: Date;
  declare createdBy: number;

  // Helper methods
  public getActionDescription(): string {
    const actionDescriptions = {
      [AuditAction.CREATE]: 'Created',
      [AuditAction.UPDATE]: 'Updated',
      [AuditAction.DELETE]: 'Deleted',
      [AuditAction.ROLE_CHANGE]: 'Changed role for',
      [AuditAction.LOGIN]: 'Logged in',
      [AuditAction.LOGOUT]: 'Logged out',
      [AuditAction.PASSWORD_RESET]: 'Reset password for'
    };

    return actionDescriptions[this.action] || this.action;
  }

  public hasChanges(): boolean {
    return !!(this.oldValues || this.newValues);
  }
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM(...Object.values(AuditAction)),
      allowNull: false
    },
    resourceType: {
      type: DataTypes.ENUM(...Object.values(ResourceType)),
      allowNull: false
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    oldValues: {
      type: DataTypes.JSON,
      allowNull: true
    },
    newValues: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45), // IPv6 support
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: false, // We only need createdAt
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['targetUserId']
      },
      {
        fields: ['action']
      },
      {
        fields: ['resourceType']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['createdBy']
      }
    ]
  }
);

export default AuditLog;