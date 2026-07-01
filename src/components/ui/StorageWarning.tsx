/**
 * Warning banner displayed when localStorage usage exceeds 80%.
 */

import { useStorageQuota } from '@/hooks/useStorageQuota';
import { cn } from '@/lib/utils';

export function StorageWarning() {
  const { isWarning, percentage } = useStorageQuota();

  if (!isWarning) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2 rounded-md border px-4 py-3 text-sm',
        'border-yellow-400 bg-yellow-50 text-yellow-800',
        'dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-200'
      )}
    >
      <span className="text-lg" aria-hidden="true">
        ⚠️
      </span>
      <p>
        Spazio di archiviazione quasi esaurito ({percentage}%).{' '}
        Esporta un backup e cancella i rapporti più vecchi.
      </p>
    </div>
  );
}
