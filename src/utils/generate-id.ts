/**
 * ID generation utility — wrapper around crypto.randomUUID().
 */

/**
 * Generates a unique UUID v4 identifier.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
