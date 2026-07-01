/**
 * Hook to monitor localStorage usage and provide quota warnings.
 * Listens to the custom STORAGE_QUOTA_EVENT dispatched when localStorage is full.
 */

import { useState, useEffect, useCallback } from 'react';
import { getStorageSize } from '@/utils/storage';
import { STORAGE_QUOTA_EVENT } from '@/utils/storage-persist';

export interface StorageQuota {
  usedBytes: number;
  limitBytes: number;
  percentage: number;
  isWarning: boolean;
  /** True when a QuotaExceededError was caught (localStorage is full) */
  isFull: boolean;
}

/** Estimated localStorage limit: 5MB */
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

/** Warning threshold: 80% */
const WARNING_THRESHOLD = 80;

export function useStorageQuota(): StorageQuota {
  const [quota, setQuota] = useState<StorageQuota>(() => ({ ...calculateQuota(), isFull: false }));

  const refresh = useCallback(() => {
    setQuota((prev) => ({ ...calculateQuota(), isFull: prev.isFull }));
  }, []);

  const handleQuotaExceeded = useCallback(() => {
    setQuota((prev) => ({ ...prev, isFull: true, isWarning: true }));
  }, []);

  useEffect(() => {
    // Recalculate on storage events (from other tabs)
    window.addEventListener('storage', refresh);
    // Listen to quota exceeded events from our custom storage adapter
    window.addEventListener(STORAGE_QUOTA_EVENT, handleQuotaExceeded);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(STORAGE_QUOTA_EVENT, handleQuotaExceeded);
    };
  }, [refresh, handleQuotaExceeded]);

  useEffect(() => {
    // Recalculate periodically (every 5s) to catch same-tab updates
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return quota;
}

function calculateQuota(): Omit<StorageQuota, 'isFull'> {
  const usedBytes = getStorageSize();
  const percentage = Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 100);
  return {
    usedBytes,
    limitBytes: STORAGE_LIMIT_BYTES,
    percentage,
    isWarning: percentage >= WARNING_THRESHOLD,
  };
}
