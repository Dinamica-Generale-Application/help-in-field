import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Video, X } from 'lucide-react';
import type { Attachment } from '../types';
import { generateId } from '@/utils/generate-id';
import { MAX_ATTACHMENTS } from '@/config/constants';
import { saveAttachment, getAttachmentUrl, deleteAttachment } from '@/lib/attachmentDb';
import { compressImage } from '@/utils/image';

interface AttachmentSectionProps {
  reportId: string;
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

/**
 * Sezione allegati — foto e video.
 * I file sono compressi (foto) e salvati in IndexedDB.
 * Solo i metadati vengono tenuti nello state/localStorage.
 * Max 10 allegati totali.
 */
export function AttachmentSection({ reportId, attachments, onChange }: AttachmentSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const canAdd = attachments.length < MAX_ATTACHMENTS;

  // Handle photo files (with compression)
  const handleImageFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsProcessing(true);

      const remaining = MAX_ATTACHMENTS - attachments.length;
      const filesToProcess = Array.from(files).slice(0, remaining);
      const newAttachments: Attachment[] = [];

      for (const file of filesToProcess) {
        try {
          const { dataUrl, size } = await compressImage(file, 1280, 0.7);
          const id = generateId();

          // Convert data URL to blob for IndexedDB storage
          const response = await fetch(dataUrl);
          const blob = await response.blob();

          await saveAttachment({
            id,
            reportId,
            type: 'image',
            blob,
            mimeType: 'image/jpeg',
            description: '',
            size,
            createdAt: new Date().toISOString(),
          });

          newAttachments.push({
            id,
            type: 'image',
            dataUrl,
            description: '',
            mimeType: 'image/jpeg',
            size,
          });
        } catch {
          console.warn('Compressione fallita per:', file.name);
        }
      }

      if (newAttachments.length > 0) {
        onChange([...attachments, ...newAttachments]);
      }
      setIsProcessing(false);
    },
    [attachments, onChange, reportId],
  );

  // Handle video files (no compression, just store)
  const handleVideoFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsProcessing(true);

      const remaining = MAX_ATTACHMENTS - attachments.length;
      const filesToProcess = Array.from(files).slice(0, remaining);
      const newAttachments: Attachment[] = [];

      for (const file of filesToProcess) {
        // Limit video size to 50MB
        if (file.size > 50 * 1024 * 1024) {
          alert(`Video "${file.name}" troppo grande (max 50MB).`);
          continue;
        }

        const id = generateId();

        await saveAttachment({
          id,
          reportId,
          type: 'video',
          blob: file,
          mimeType: file.type || 'video/mp4',
          description: '',
          size: file.size,
          createdAt: new Date().toISOString(),
        });

        const dataUrl = URL.createObjectURL(file);

        newAttachments.push({
          id,
          type: 'video',
          dataUrl,
          description: '',
          mimeType: file.type || 'video/mp4',
          size: file.size,
        });
      }

      if (newAttachments.length > 0) {
        onChange([...attachments, ...newAttachments]);
      }
      setIsProcessing(false);
    },
    [attachments, onChange, reportId],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      await deleteAttachment(id);
      onChange(attachments.filter((a) => a.id !== id));
    },
    [attachments, onChange],
  );

  const updateDescription = useCallback(
    (id: string, description: string) => {
      onChange(
        attachments.map((a) => (a.id === id ? { ...a, description } : a)),
      );
    },
    [attachments, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">
          Allegati ({attachments.length}/{MAX_ATTACHMENTS})
        </h3>
      </div>

      {/* Upload buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAdd || isProcessing}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <ImagePlus className="h-4 w-4" />
          Carica foto
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={!canAdd || isProcessing}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Camera className="h-4 w-4" />
          Scatta foto
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={!canAdd || isProcessing}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Video className="h-4 w-4" />
          Allega video
        </button>
        {isProcessing && (
          <span className="self-center text-xs text-muted-foreground">
            Elaborazione in corso…
          </span>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => { handleImageFiles(e.target.files); e.target.value = ''; }}
        className="hidden"
        aria-label="Carica immagini"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { handleImageFiles(e.target.files); e.target.value = ''; }}
        className="hidden"
        aria-label="Scatta foto dalla fotocamera"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => { handleVideoFiles(e.target.files); e.target.value = ''; }}
        className="hidden"
        aria-label="Allega video"
      />

      {/* Preview grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {attachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              onRemove={handleRemove}
              onDescriptionChange={updateDescription}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Sub-component ---

interface AttachmentItemProps {
  attachment: Attachment;
  onRemove: (id: string) => void;
  onDescriptionChange: (id: string, description: string) => void;
}

function AttachmentItem({ attachment, onRemove, onDescriptionChange }: AttachmentItemProps) {
  const [objectUrl, setObjectUrl] = useState<string | undefined>(attachment.dataUrl);

  // Load from IndexedDB if no dataUrl (e.g. after page reload)
  useEffect(() => {
    if (!attachment.dataUrl) {
      getAttachmentUrl(attachment.id).then((url) => {
        if (url) setObjectUrl(url);
      });
    }
    return () => {
      // Revoke blob URLs on unmount (only non-data URLs)
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachment.id, attachment.dataUrl]);

  return (
    <div className="relative rounded-lg border overflow-hidden group">
      {/* Thumbnail / Preview */}
      {attachment.type === 'video' ? (
        <div className="w-full aspect-square bg-muted flex items-center justify-center">
          {objectUrl ? (
            <video
              src={objectUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <Video className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="absolute bottom-8 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
            Video
          </div>
        </div>
      ) : (
        <img
          src={objectUrl || ''}
          alt={attachment.description || 'Allegato'}
          className="w-full aspect-square object-cover"
        />
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="absolute top-1 right-1 p-2 rounded-full bg-destructive text-destructive-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Rimuovi allegato"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Description */}
      <div className="p-1.5">
        <input
          type="text"
          value={attachment.description || ''}
          onChange={(e) => onDescriptionChange(attachment.id, e.target.value)}
          placeholder="Descrizione…"
          className="w-full text-xs border-0 border-b border-transparent focus-visible:border-input bg-transparent px-0 py-0.5"
          aria-label="Descrizione allegato"
        />
      </div>
    </div>
  );
}
