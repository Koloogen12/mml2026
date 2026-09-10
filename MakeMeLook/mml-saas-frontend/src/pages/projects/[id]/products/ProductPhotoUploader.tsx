import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Image,
  Info,
  GripVertical,
  X,
  Plus,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { productsApi } from '@/shared/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoSlotData {
  id: number;
  url?: string;
  serverId?: number;
  uploading?: boolean;
}

export interface PhotoUploadSnapshot {
  isUploading: boolean;
  photoIds: number[];
}

const EMPTY_SLOTS: PhotoSlotData[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
}));

// ─── PhotoSlot ────────────────────────────────────────────────────────────────

interface PhotoSlotProps {
  slot: PhotoSlotData;
  isMain: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onRemove: (id: number) => void;
  onClick: () => void;
  onDragStart: (id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDrop: (targetId: number) => void;
  onDragEnd: () => void;
  onView: (id: number) => void;
}

const PhotoSlot: FC<PhotoSlotProps> = ({
  slot,
  isMain,
  isDragging,
  isDragOver,
  onRemove,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onView,
}) => {
  const locale = useLocale();
  if (slot.url) {
    return (
      <div
        draggable={!slot.uploading}
        onDragStart={() => !slot.uploading && onDragStart(slot.id)}
        onDragOver={(e) => onDragOver(e, slot.id)}
        onDrop={() => onDrop(slot.id)}
        onDragEnd={onDragEnd}
        className={cn(
          'relative aspect-[2/3] rounded-lg overflow-hidden border group cursor-grab transition-all duration-150',
          isDragging && 'opacity-40 scale-95',
          isDragOver && 'ring-2 ring-primary ring-offset-1',
          slot.uploading && 'cursor-default',
        )}
      >
        <img
          src={slot.url}
          alt=""
          draggable={false}
          className={cn(
            'w-full h-full object-cover',
            slot.uploading ? 'opacity-40' : 'cursor-zoom-in',
          )}
          onClick={(e) => {
            if (slot.uploading) return;
            e.stopPropagation();
            onView(slot.id);
          }}
        />
        {slot.uploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin drop-shadow" />
          </div>
        )}
        {!slot.uploading && isMain && (
          <div className="absolute top-1.5 left-1.5">
            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded font-medium">
              {t(locale, 'products.photoMain')}
            </span>
          </div>
        )}
        {!slot.uploading && (
          <>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <div className="w-6 h-6 rounded bg-white/90 flex items-center justify-center cursor-grab">
                <GripVertical className="h-3.5 w-3.5 text-gray-600" />
              </div>
              <button
                type="button"
                className="w-6 h-6 rounded bg-white/90 flex items-center justify-center hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(slot.id);
                }}
              >
                <X className="h-3.5 w-3.5 text-gray-600 hover:text-red-600" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => onDragOver(e, slot.id)}
      onDrop={() => onDrop(slot.id)}
      className={cn(
        'aspect-[2/3] rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-muted-foreground/40 hover:border-primary/40 hover:text-primary/40 transition-colors cursor-pointer',
        isDragOver && 'border-primary/60 bg-primary/5 text-primary/40',
      )}
      onClick={onClick}
    >
      <Plus className="h-6 w-6" />
    </div>
  );
};

// ─── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  photos: PhotoSlotData[];
  initialIndex: number;
  onClose: () => void;
}

const Lightbox: FC<LightboxProps> = ({ photos, initialIndex, onClose }) => {
  const filled = photos.filter((p) => Boolean(p.url));
  const [index, setIndex] = useState(initialIndex);
  const current = filled[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(filled.length - 1, i + 1));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [filled.length, onClose]);

  if (!current?.url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </button>
      {index > 0 && (
        <button
          type="button"
          className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => i - 1);
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <img
        src={current.url}
        alt=""
        className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {index < filled.length - 1 && (
        <button
          type="button"
          className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((i) => i + 1);
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      {filled.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
          {index + 1} / {filled.length}
        </div>
      )}
    </div>
  );
};

// ─── ProductPhotoUploader ─────────────────────────────────────────────────────

export interface ProductPhotoUploaderProps {
  projectId: number;
  /** Pre-existing photos for edit mode */
  initialPhotos?: Array<{ url: string; id: number }>;
  onChange: (snapshot: PhotoUploadSnapshot) => void;
}

export const ProductPhotoUploader: FC<ProductPhotoUploaderProps> = ({
  projectId,
  initialPhotos,
  onChange,
}) => {
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoSlotData[]>(() => {
    if (!initialPhotos?.length) return EMPTY_SLOTS.map((s) => ({ ...s }));
    return EMPTY_SLOTS.map((s, i) => {
      const p = initialPhotos[i];
      return p ? { id: s.id, url: p.url, serverId: p.id } : { ...s };
    });
  });

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Notify parent whenever photos change.
  useEffect(() => {
    onChange({
      isUploading: photos.some((p) => p.uploading),
      photoIds: photos
        .filter((p) => p.serverId !== undefined)
        .map((p) => p.serverId!),
    });
  }, [photos, onChange]);

  const filledPhotos = photos.filter((p) => Boolean(p.url));

  const handleView = (slotId: number) => {
    const idx = filledPhotos.findIndex((p) => p.id === slotId);
    if (idx !== -1) setLightboxIndex(idx);
  };

  const removePhoto = (slotId: number) => {
    const slot = photos.find((s) => s.id === slotId);
    if (slot?.url && !slot.serverId) URL.revokeObjectURL(slot.url);
    setPhotos((prev) => prev.map((s) => (s.id === slotId ? { id: s.id } : s)));
  };

  const handleFilesSelected = useCallback(
    async (files: FileList) => {
      const emptySlots = photos.filter((s) => !s.url && !s.uploading);
      if (emptySlots.length === 0) return;

      const filesToProcess = Array.from(files)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, emptySlots.length);

      if (filesToProcess.length === 0) return;

      const assignments = filesToProcess.map((file, i) => ({
        slotId: emptySlots[i].id,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setPhotos((prev) => {
        const next = [...prev];
        for (const { slotId, previewUrl } of assignments) {
          const idx = next.findIndex((s) => s.id === slotId);
          if (idx !== -1) {
            next[idx] = { id: slotId, url: previewUrl, uploading: true };
          }
        }
        return next;
      });

      await Promise.all(
        assignments.map(async ({ slotId, previewUrl, file }) => {
          try {
            const uploaded = await productsApi.uploadProjectPhoto(
              projectId,
              file,
            );
            URL.revokeObjectURL(previewUrl);
            setPhotos((prev) =>
              prev.map((s) =>
                s.id === slotId
                  ? { id: slotId, url: uploaded.url, serverId: uploaded.id }
                  : s,
              ),
            );
          } catch {
            URL.revokeObjectURL(previewUrl);
            toast.error(t(locale, 'products.photoUploadFailed'));
            setPhotos((prev) =>
              prev.map((s) => (s.id === slotId ? { id: s.id } : s)),
            );
          }
        }),
      );
    },
    [photos, projectId],
  );

  const handleDragStart = (id: number) => setDraggedId(id);

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    setPhotos((prev) => {
      const draggedIndex = prev.findIndex((s) => s.id === draggedId);
      const targetIndex = prev.findIndex((s) => s.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox
          photos={filledPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-0.5">{t(locale, 'products.photosTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t(locale, 'products.photosDescription')}
          </p>
        </div>

        {/* Upload zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
              void handleFilesSelected(e.dataTransfer.files);
            }
          }}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
        >
          <Image className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">{t(locale, 'products.dragDropUpload')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t(locale, 'products.photoFormats')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              if (e.target.files) void handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* Photo grid — only filled slots */}
        {photos.some((p) => p.url) && (
          <div className="grid grid-cols-3 gap-2">
            {photos
              .filter((slot) => slot.url)
              .map((slot, index) => (
                <PhotoSlot
                  key={slot.id}
                  slot={slot}
                  isMain={index === 0}
                  isDragging={draggedId === slot.id}
                  isDragOver={dragOverId === slot.id}
                  onRemove={removePhoto}
                  onClick={() => fileInputRef.current?.click()}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onView={handleView}
                />
              ))}
          </div>
        )}

        {/* Requirements hint */}
        <Card className="p-3 bg-muted/40 border-muted">
          <div className="flex gap-2.5">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">
                {t(locale, 'products.photoRequirements')}
              </p>
              <p>{t(locale, 'products.photoReqResolution')}</p>
              <p>{t(locale, 'products.photoReqBackground')}</p>
              <p>{t(locale, 'products.photoReqCenter')}</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};
