/**
 * Helper utility functions
 */

/**
 * Parse string ID to integer with validation
 * @param id - String ID to parse
 * @returns Parsed integer ID
 * @throws Error if ID is invalid
 */
export function parseIntId(id: string): number {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid ID format: must be a positive integer');
  }
  return parsed;
}

/**
 * Convert string IDs to numbers in an array
 * @param ids - Array of string IDs
 * @returns Array of number IDs
 */
export function parseIntIds(ids: string[]): number[] {
  return ids.map(parseIntId);
}

/**
 * Safely parse ID that might be string or number
 * @param id - ID to parse
 * @returns Number ID
 */
export function ensureIntId(id: string | number): number {
  if (typeof id === 'number') {
    if (id <= 0 || !Number.isInteger(id)) {
      throw new Error('Invalid ID: must be a positive integer');
    }
    return id;
  }
  return parseIntId(id);
}