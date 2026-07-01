/**
 * Attachment Repository — gestione allegati multimediali.
 * Salva i metadati in SQLite e mantiene il riferimento all'URI originale.
 */

import { generateId } from '../utils/generate-id';
import { getDatabase } from './database';
import { AppErrorCode } from '../types/errors';
import type { Attachment, AttachmentType } from '../types/report';

const MAX_ATTACHMENTS_PER_REPORT = 20;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export interface AttachmentInput {
  uri: string;
  type: 'image' | 'video';
  description?: string;
  mimeType: string;
  fileSize: number;
}

export class AttachmentError extends Error {
  code: AppErrorCode;
  recoverable: boolean;
  technicalDetail?: string;

  constructor(code: AppErrorCode, message: string, technicalDetail?: string, recoverable = false) {
    super(message);
    this.name = 'AttachmentError';
    this.code = code;
    this.recoverable = recoverable;
    this.technicalDetail = technicalDetail;
  }
}

function validateFileSize(type: AttachmentType, fileSize: number): void {
  if (type === 'image' && fileSize > MAX_IMAGE_SIZE) {
    throw new AttachmentError(
      AppErrorCode.ATTACHMENT_TOO_LARGE,
      "L'immagine supera la dimensione massima consentita di 10MB.",
      `Image size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB, max: 10MB`,
    );
  }
  if (type === 'video' && fileSize > MAX_VIDEO_SIZE) {
    throw new AttachmentError(
      AppErrorCode.ATTACHMENT_TOO_LARGE,
      'Il video supera la dimensione massima consentita di 50MB.',
      `Video size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB, max: 50MB`,
    );
  }
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
  };
  return mimeToExt[mimeType] || '.bin';
}

export const attachmentRepository = {
  async add(reportId: string, input: AttachmentInput): Promise<Attachment> {
    validateFileSize(input.type, input.fileSize);

    const currentCount = await this.getCount(reportId);
    if (currentCount >= MAX_ATTACHMENTS_PER_REPORT) {
      throw new AttachmentError(
        AppErrorCode.ATTACHMENT_LIMIT_REACHED,
        `Raggiunto il limite massimo di ${MAX_ATTACHMENTS_PER_REPORT} allegati per rapporto.`,
      );
    }

    const attachmentId = generateId();
    const extension = getExtensionFromMimeType(input.mimeType);
    const fileName = `${attachmentId}${extension}`;

    // Store the original URI directly — no file copying needed.
    // expo-image-picker returns URIs that persist in the app's cache.
    const filePath = input.uri;

    const { sqliteDb } = getDatabase();
    const now = new Date().toISOString();

    await sqliteDb.runAsync(
      `INSERT INTO attachments (id, report_id, type, file_path, file_name, mime_type, file_size, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attachmentId,
        reportId,
        input.type,
        filePath,
        fileName,
        input.mimeType,
        input.fileSize,
        input.description ?? null,
        now,
      ]
    );

    return {
      id: attachmentId,
      reportId,
      type: input.type,
      filePath,
      fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      description: input.description,
      createdAt: now,
    };
  },

  async remove(attachmentId: string): Promise<void> {
    const { sqliteDb } = getDatabase();
    // Just remove from DB — the cached file will be cleaned up by the OS eventually
    await sqliteDb.runAsync('DELETE FROM attachments WHERE id = ?', [attachmentId]);
  },

  async getByReportId(reportId: string): Promise<Attachment[]> {
    const { sqliteDb } = getDatabase();
    const rows = await sqliteDb.getAllAsync<{
      id: string;
      report_id: string;
      type: string;
      file_path: string;
      file_name: string;
      mime_type: string;
      file_size: number;
      description: string | null;
      created_at: string;
    }>(
      'SELECT id, report_id, type, file_path, file_name, mime_type, file_size, description, created_at FROM attachments WHERE report_id = ? ORDER BY created_at ASC',
      [reportId]
    );

    return rows.map((row) => ({
      id: row.id,
      reportId: row.report_id,
      type: row.type as AttachmentType,
      filePath: row.file_path,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      description: row.description ?? undefined,
      createdAt: row.created_at,
    }));
  },

  async getCount(reportId: string): Promise<number> {
    const { sqliteDb } = getDatabase();
    const result = await sqliteDb.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM attachments WHERE report_id = ?',
      [reportId]
    );
    return result?.count ?? 0;
  },
};
