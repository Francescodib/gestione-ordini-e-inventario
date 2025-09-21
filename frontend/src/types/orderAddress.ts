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
}