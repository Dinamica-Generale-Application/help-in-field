/**
 * Custom storage adapter for Zustand persist middleware.
 * Handles QuotaExceededError gracefully — data stays in Zustand memory,
 * user is notified via a custom event.
 */

/** Custom event name dispatched when storage quota is exceeded */
export const STORAGE_QUOTA_EVENT = 'storage-quota-exceeded';

/**
 * Dispatches a custom event to notify the UI about quota exceeded errors.
 */
function notifyQuotaExceeded(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_QUOTA_EVENT));
  }
}

/**
 * localStorage wrapper that catches QuotaExceededError on setItem.
 * When quota is exceeded, data remains in Zustand memory (not lost),
 * and a custom event is dispatched to notify the UI.
 */
export const storageWithQuotaHandling: Storage = {
  get length() {
    return localStorage.length;
  },

  key(index: number) {
    return localStorage.key(index);
  },

  getItem(name: string): string | null {
    return localStorage.getItem(name);
  },

  setItem(name: string, value: string): void {
    try {
      localStorage.setItem(name, value);
    } catch (error: unknown) {
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
          error.code === 22 ||
          error.code === 1014)
      ) {
        notifyQuotaExceeded();
        // Data stays in Zustand memory — not lost
      } else {
        throw error;
      }
    }
  },

  removeItem(name: string): void {
    localStorage.removeItem(name);
  },

  clear(): void {
    localStorage.clear();
  },
};
