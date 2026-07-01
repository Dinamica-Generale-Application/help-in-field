import { useCallback, useRef } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import type { Attachment } from '../types';
import { useImageCompression } from '../hooks/useImageCompression';
import { generateId } from '@/utils/generate-id';
import { MAX_ATTACHMENTS } from '@/config/constants';

interface AttachmentSectionProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

/**
 * Sezione allegati foto — upload multiplo + cattura fotocamera,
 * griglia preview, rimozione, descrizione, compressione automatica.
 * Max 10 allegati.
 */
export function AttachmentSection({ attachments, onChange }: AttachmentSectionProps) {
  const { isCompressing, compress } = useImageCompression();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const canAdd = attachments.length < MAX_ATTACHMENTS;

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remaining = MAX_ATTACHMENTS - attachments.length;
      const filesToProcess = Array.from(files).slice(0, remaining);
      const newAttachments: Attachment[] = [];

      for (const file of filesToProcess) {
        try {
          const { dataUrl, size } = await compress(file);
          newAttachments.push({
            id: generateId(),
            dataUrl,
            description: '',
            originalSize: file.size,
            compressedSize: size,
          });
        } catch {
          // Skip files that fail compression
          console.warn('Compressione fallita per:', file.name);
        }
      }

      if (newAttachments.length > 0) {
        onChange([...attachments, ...newAttachments]);
      }
    },
    [attachments, compress, onChange],
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCameraClick = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const removeAttachment = useCallback(
    (id: string) => {
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
          Allegati Foto ({attachments.length}/{MAX_ATTACHMENTS})
        </h3>
      </div>

      {/* Upload buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={!canAdd || isCompressing}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <ImagePlus className="h-4 w-4" />
          Carica foto
        </button>
        <button
          type="button"
          onClick={handleCameraClick}
          disabled={!canAdd || isCompressing}
          className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Camera className="h-4 w-4" />
          Scatta foto
        </button>
        {isCompressing && (
          <span className="self-center text-xs text-muted-foreground">
            Compressione in corso…
          </span>
        )}
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
        aria-label="Carica immagini"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
        aria-label="Scatta foto dalla fotocamera"
      />

      {/* Preview grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {attachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              onRemove={removeAttachment}
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
  return (
    <div className="relative rounded-lg border overflow-hidden group">
      {/* Thumbnail */}
      <img
        src={attachment.dataUrl}
        alt={attachment.description || 'Allegato'}
        className="w-full aspect-square object-cover"
      />

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
          aria-label={`Descrizione per allegato`}
        />
      </div>
    </div>
  );
}
