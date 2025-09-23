/**
 * Address Service for managing user addresses
 * File: src/services/addressService.ts
 */

import { UserAddress, AddressType, User, UserRole, AuditAction, ResourceType } from '../models';
import { AuditService } from './auditService';
import { sequelize } from '../config/database';
import { Transaction, Op } from 'sequelize';

export interface CreateAddressRequest {
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  state?: string;
  addressType?: AddressType;
  isDefault?: boolean;
}

export interface UpdateAddressRequest {
  streetAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  state?: string;
  addressType?: AddressType;
  isDefault?: boolean;
}

export class AddressService {

  /**
   * Create a new address for a user (CLIENT only)
   */
  static async createAddress(
    userId: number,
    addressData: CreateAddressRequest,
    createdBy: number,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserAddress> {
    const transaction = await sequelize.transaction();

    try {
      // Verify user exists and is CLIENT
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== UserRole.CLIENT) {
        throw new Error('Only CLIENT users can have addresses');
      }

      // If setting as default, unset other defaults for this user
      if (addressData.isDefault) {
        await UserAddress.update(
          { isDefault: false },
          {
            where: {
              userId,
              addressType: addressData.addressType || AddressType.SHIPPING
            },
            transaction
          }
        );
      }

      // Create the address
      const address = await UserAddress.create({
        userId,
        streetAddress: addressData.streetAddress,
        city: addressData.city,
        postalCode: addressData.postalCode,
        country: addressData.country,
        state: addressData.state,
        addressType: addressData.addressType || AddressType.SHIPPING,
        isDefault: addressData.isDefault || false
      }, { transaction });

      // Log the action
      await AuditService.logUserAction({
        userId: createdBy,
        targetUserId: userId,
        action: AuditAction.CREATE,
        resourceType: ResourceType.ADDRESS,
        resourceId: address.id,
        newValues: {
          streetAddress: address.streetAddress,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          addressType: address.addressType
        },
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent
      }, { transaction });

      await transaction.commit();
      return address;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all addresses for a user
   */
  static async getUserAddresses(userId: number): Promise<UserAddress[]> {
    try {
      // Verify user exists and is CLIENT
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== UserRole.CLIENT) {
        return []; // Non-client users have no addresses
      }

      return await UserAddress.findAll({
        where: {
          userId,
          isActive: true
        },
        order: [
          ['isDefault', 'DESC'],
          ['addressType', 'ASC'],
          ['createdAt', 'DESC']
        ]
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a specific address
   */
  static async getAddressById(
    addressId: number,
    userId?: number
  ): Promise<UserAddress | null> {
    try {
      const where: any = {
        id: addressId,
        isActive: true
      };

      if (userId) {
        where.userId = userId;
      }

      return await UserAddress.findOne({
        where,
        include: [
          {
            association: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName', 'role']
          }
        ]
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an address
   */
  static async updateAddress(
    addressId: number,
    userId: number,
    addressData: UpdateAddressRequest,
    updatedBy: number,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserAddress> {
    const transaction = await sequelize.transaction();

    try {
      // Get the existing address
      const address = await UserAddress.findOne({
        where: {
          id: addressId,
          userId,
          isActive: true
        },
        transaction
      });

      if (!address) {
        throw new Error('Address not found');
      }

      // Store old values for audit
      const oldValues = {
        streetAddress: address.streetAddress,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        state: address.state,
        addressType: address.addressType,
        isDefault: address.isDefault
      };

      // If setting as default, unset other defaults
      if (addressData.isDefault && !address.isDefault) {
        await UserAddress.update(
          { isDefault: false },
          {
            where: {
              userId,
              addressType: addressData.addressType || address.addressType
            },
            transaction
          }
        );
      }

      // Update the address
      await address.update(addressData, { transaction });

      // Log the action
      await AuditService.logUserAction({
        userId: updatedBy,
        targetUserId: userId,
        action: AuditAction.UPDATE,
        resourceType: ResourceType.ADDRESS,
        resourceId: address.id,
        oldValues,
        newValues: addressData,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent
      }, { transaction });

      await transaction.commit();
      return address;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete (soft delete) an address
   */
  static async deleteAddress(
    addressId: number,
    userId: number,
    deletedBy: number,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const address = await UserAddress.findOne({
        where: {
          id: addressId,
          userId,
          isActive: true
        },
        transaction
      });

      if (!address) {
        throw new Error('Address not found');
      }

      // Soft delete
      await address.update({ isActive: false }, { transaction });

      // If this was the default address, set another as default
      if (address.isDefault) {
        const nextAddress = await UserAddress.findOne({
          where: {
            userId,
            addressType: address.addressType,
            isActive: true,
            id: { [Op.ne]: addressId }
          },
          order: [['createdAt', 'ASC']],
          transaction
        });

        if (nextAddress) {
          await nextAddress.update({ isDefault: true }, { transaction });
        }
      }

      // Log the action
      await AuditService.logUserAction({
        userId: deletedBy,
        targetUserId: userId,
        action: AuditAction.DELETE,
        resourceType: ResourceType.ADDRESS,
        resourceId: address.id,
        oldValues: {
          streetAddress: address.streetAddress,
          city: address.city,
          country: address.country
        },
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent
      }, { transaction });

      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get default address for a user
   */
  static async getDefaultAddress(
    userId: number,
    addressType: AddressType = AddressType.SHIPPING
  ): Promise<UserAddress | null> {
    try {
      return await UserAddress.findOne({
        where: {
          userId,
          addressType,
          isDefault: true,
          isActive: true
        }
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set an address as default
   */
  static async setDefaultAddress(
    addressId: number,
    userId: number,
    updatedBy: number
  ): Promise<UserAddress> {
    const transaction = await sequelize.transaction();

    try {
      const address = await UserAddress.findOne({
        where: {
          id: addressId,
          userId,
          isActive: true
        },
        transaction
      });

      if (!address) {
        throw new Error('Address not found');
      }

      // Unset other defaults of the same type
      await UserAddress.update(
        { isDefault: false },
        {
          where: {
            userId,
            addressType: address.addressType
          },
          transaction
        }
      );

      // Set this as default
      await address.update({ isDefault: true }, { transaction });

      // Log the action
      await AuditService.logUserAction({
        userId: updatedBy,
        targetUserId: userId,
        action: AuditAction.UPDATE,
        resourceType: ResourceType.ADDRESS,
        resourceId: address.id,
        newValues: { isDefault: true }
      }, { transaction });

      await transaction.commit();
      return address;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export default AddressService;