/**
 * IndexedDB storage for attachments (photos + videos).
 *
 * Solves the localStorage 5MB limit — IndexedDB can store hundreds of MB.
 * Each attachment is stored as a Blob with metadata.
 * Reports in localStorage only keep attachment IDs, not the actual data.
 */

const DB_NAME = 'help-in-field-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

interface AttachmentRecord {
  id: string;
  reportId: string;
  type: 'image' | 'video';
  blob: Blob;
  mimeType: string;
  description: string;
  size: number;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('reportId', 'reportId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an attachment blob to IndexedDB.
 */
export async function saveAttachment(record: AttachmentRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get a single attachment by ID.
 */
export async function getAttachment(id: string): Promise<AttachmentRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all attachments for a specific report.
 */
export async function getAttachmentsByReportId(reportId: string): Promise<AttachmentRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('reportId');
    const request = index.getAll(reportId);
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a single attachment.
 */
export async function deleteAttachment(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete all attachments for a report.
 */
export async function deleteAttachmentsByReportId(reportId: string): Promise<void> {
  const records = await getAttachmentsByReportId(reportId);
  if (records.length === 0) return;

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const record of records) {
      store.delete(record.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get a Blob URL for displaying an attachment.
 * Remember to call URL.revokeObjectURL() when done.
 */
export async function getAttachmentUrl(id: string): Promise<string | null> {
  const record = await getAttachment(id);
  if (!record) return null;
  return URL.createObjectURL(record.blob);
}

/**
 * Get total size of all attachments in IndexedDB (approximate).
 */
export async function getTotalAttachmentsSize(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const total = (request.result as AttachmentRecord[]).reduce((sum, r) => sum + r.size, 0);
      resolve(total);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all attachments (used by "Cancella tutti i dati").
 */
export async function clearAllAttachments(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
