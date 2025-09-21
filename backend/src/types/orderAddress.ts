/**
 * Standard Address Format for Orders
 * File: src/types/orderAddress.ts
 *
 * Questo è il formato unificato per tutti gli indirizzi degli ordini
 * nel sistema, utilizzato da seed, API, frontend e database.
 */

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

/**
 * Standard Order Creation Request Format
 */
export interface StandardOrderRequest {
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice?: number;
  }>;
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress; // Se non fornito, usa shippingAddress
  notes?: string;
  currency?: string; // Default: EUR
}

/**
 * Helper functions per gestire gli indirizzi
 */
export class AddressUtils {
  /**
   * Converte un indirizzo in stringa JSON per il database
   */
  static toJson(address: OrderAddress): string {
    return JSON.stringify(address);
  }

  /**
   * Converte una stringa JSON in oggetto indirizzo
   */
  static fromJson(addressString: string): OrderAddress | null {
    try {
      const parsed = JSON.parse(addressString);
      return this.validate(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Valida che un oggetto abbia la struttura corretta di OrderAddress
   */
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

  /**
   * Formatta un indirizzo per la visualizzazione
   */
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

  /**
   * Restituisce il nome completo del cliente
   */
  static getFullName(address: OrderAddress): string {
    return `${address.firstName} ${address.lastName}`.trim();
  }

  /**
   * Restituisce una versione breve dell'indirizzo (città, paese)
   */
  static getShortFormat(address: OrderAddress): string {
    return `${address.city}, ${address.country}`;
  }
}