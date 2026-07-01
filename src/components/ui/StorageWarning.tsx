/**
 * Warning banner displayed when localStorage usage exceeds 80%
 * or when a QuotaExceededError is caught.
 */

import { useStorageQuota } from '@/hooks/useStorageQuota';
import { cn } from '@/lib/utils';

export function StorageWarning() {
  const { isWarning, isFull, percentage } = useStorageQuota();

  if (!isWarning) return null;

  return (
    <div
      role="alert"
      className={cn(
        'mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm',
        isFull
          ? 'border-red-400 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-950 dark:text-red-200'
          : 'border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-200'
      )}
    >
      <span className="text-lg" aria-hidden="true">
        {isFull ? '🚫' : '⚠️'}
      </span>
      <p>
        {isFull
          ? 'Spazio di archiviazione esaurito. I nuovi dati non vengono salvati. Esporta un backup e cancella i rapporti più vecchi.'
          : `Spazio di archiviazione quasi esaurito (${percentage}%). Esporta un backup e cancella i rapporti più vecchi.`}
      </p>
    </div>
  );
}
