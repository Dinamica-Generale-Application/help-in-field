/**
 * Hook to monitor localStorage usage and provide quota warnings.
 */

import { useState, useEffect, useCallback } from 'react';
import { getStorageSize } from '@/utils/storage';

export interface StorageQuota {
  usedBytes: number;
  limitBytes: number;
  percentage: number;
  isWarning: boolean;
}

/** Estimated localStorage limit: 5MB */
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

/** Warning threshold: 80% */
const WARNING_THRESHOLD = 80;

export function useStorageQuota(): StorageQuota {
  const [quota, setQuota] = useState<StorageQuota>(() => calculateQuota());

  const refresh = useCallback(() => {
    setQuota(calculateQuota());
  }, []);

  useEffect(() => {
    // Recalculate on storage events (from other tabs)
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [refresh]);

  useEffect(() => {
    // Recalculate periodically (every 5s) to catch same-tab updates
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return quota;
}

function calculateQuota(): StorageQuota {
  const usedBytes = getStorageSize();
  const percentage = Math.round((usedBytes / STORAGE_LIMIT_BYTES) * 100);
  return {
    usedBytes,
    limitBytes: STORAGE_LIMIT_BYTES,
    percentage,
    isWarning: percentage >= WARNING_THRESHOLD,
  };
}
