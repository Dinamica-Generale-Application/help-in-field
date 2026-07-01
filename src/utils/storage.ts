/**
 * localStorage helpers — typed get/set, size calculation, quota check.
 */

/**
 * Retrieves a typed value from localStorage.
 * Returns null if the key doesn't exist or JSON parsing fails.
 */
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Stores a typed value in localStorage as JSON.
 * Throws QuotaExceededError if storage is full.
 */
export function setItem<T>(key: string, value: T): void {
  const json = JSON.stringify(value);
  localStorage.setItem(key, json);
}

/**
 * Calculates the approximate size (in bytes) of all data in localStorage.
 * Each character in localStorage is stored as UTF-16 (2 bytes).
 */
export function getStorageSize(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) ?? '';
      // key + value, each char = 2 bytes (UTF-16)
      total += (key.length + value.length) * 2;
    }
  }
  return total;
}

/**
 * Checks if a QuotaExceededError would likely occur.
 * Tests by attempting to write a small value and catching any error.
 */
export function isQuotaExceeded(): boolean {
  const testKey = '__storage_quota_test__';
  try {
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return false;
  } catch {
    return true;
  }
}
