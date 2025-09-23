export interface OrderAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// Unified Address interface for consistency across User and Order models
export interface UnifiedAddress {
  firstName?: string;
  lastName?: string;
  company?: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export class AddressUtils {
  static validate(obj: any): obj is OrderAddress {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.firstName === 'string' &&
      typeof obj.lastName === 'string' &&
      typeof obj.address1 === 'string' &&
      typeof obj.city === 'string' &&
      typeof obj.state === 'string' &&
      typeof obj.postalCode === 'string' &&
      typeof obj.country === 'string'
    );
  }

  static validateUnified(obj: any): obj is UnifiedAddress {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.streetAddress === 'string' &&
      typeof obj.city === 'string' &&
      typeof obj.postalCode === 'string' &&
      typeof obj.country === 'string'
    );
  }

  static fromJson(addressString: string): OrderAddress | null {
    try {
      const parsed = JSON.parse(addressString);
      return this.validate(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  static format(address: OrderAddress): string {
    const parts = [
      `${address.firstName} ${address.lastName}`,
      address.company,
      address.address1,
      address.address2,
      `${address.city} ${address.postalCode}`,
      address.country
    ].filter(part => part && part.trim());

    return parts.join('\n');
  }

  static getFullName(address: OrderAddress): string {
    return `${address.firstName} ${address.lastName}`.trim();
  }

  static getShortFormat(address: OrderAddress): string {
    return `${address.city}, ${address.country}`;
  }

  static getCustomerInfo(addressOrString: string | OrderAddress): { name: string; subtitle: string } {
    let address: OrderAddress | null = null;

    if (typeof addressOrString === 'string') {
      address = this.fromJson(addressOrString);
    } else if (typeof addressOrString === 'object') {
      address = this.validate(addressOrString) ? addressOrString : null;
    }

    if (address) {
      return {
        name: this.getFullName(address),
        subtitle: this.getShortFormat(address)
      };
    }

    return {
      name: 'N/A',
      subtitle: ''
    };
  }

  // Unified Address conversion methods
  static fromUnifiedToLegacy(unifiedAddr: UnifiedAddress): OrderAddress {
    return {
      firstName: unifiedAddr.firstName || '',
      lastName: unifiedAddr.lastName || '',
      company: unifiedAddr.company,
      address1: unifiedAddr.streetAddress,
      city: unifiedAddr.city,
      state: '', // Not used in unified format
      postalCode: unifiedAddr.postalCode,
      country: unifiedAddr.country,
      phone: unifiedAddr.phone
    };
  }

  static fromLegacyToUnified(orderAddr: OrderAddress): UnifiedAddress {
    return {
      firstName: orderAddr.firstName,
      lastName: orderAddr.lastName,
      company: orderAddr.company,
      streetAddress: [orderAddr.address1, orderAddr.address2].filter(Boolean).join(', '),
      city: orderAddr.city,
      postalCode: orderAddr.postalCode,
      country: orderAddr.country,
      phone: orderAddr.phone
    };
  }

  static formatUnified(address: UnifiedAddress): string {
    const parts = [];
    if (address.firstName || address.lastName) {
      parts.push(`${address.firstName || ''} ${address.lastName || ''}`.trim());
    }
    if (address.company) {
      parts.push(address.company);
    }
    parts.push(address.streetAddress);
    parts.push(`${address.city} ${address.postalCode}`);
    parts.push(address.country);
    return parts.filter(Boolean).join('\n');
  }

  static parseAddressString(addressString: string): UnifiedAddress | null {
    try {
      const parsed = JSON.parse(addressString);
      if (parsed.address1) {
        // Legacy format
        return this.fromLegacyToUnified(parsed);
      } else if (this.validateUnified(parsed)) {
        // Unified format
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}