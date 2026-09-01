'use client';

// "Choose a 3D model" control for the case-study gallery editor.
//
// Deliberately not PickerDialog: that dialog renders a thumbnail grid, which
// shows nothing but broken images for .glb/.fbx files. Models are picked by
// uploading (or by re-picking an already-uploaded model shown by filename),
// with a progress bar because these files are large.

import { useRef, useState } from 'react';
import { Box, Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { MODEL_ACCEPT, uploadFile } from './upload';
import { isModelFilename } from '@/db/schema/media';
import type { PickedMedia } from './MediaPicker';
import { Button } from '../ui';

const MAX_MB = 100;

export function ModelPicker({
  value,
  onChange,
}: {
  value: PickedMedia | null;
  onChange: (media: PickedMedia | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    // Validate before touching the network so the editor gets an instant answer.
    if (!isModelFilename(file.name)) {
      toast.error(`Unsupported format — use ${MODEL_ACCEPT}.`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Model is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_MB}MB.`);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const item = await uploadFile(file, null, setProgress);
      onChange({ id: item.id, url: item.url, alt: item.alt });
      toast.success('Model uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      // Allow re-picking the same file after a failure.
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const filename = value ? decodeURIComponent(value.url.split('/').pop() ?? '') : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-dashed border-white/15 text-white/30">
          <Box className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {value ? (
            <p className="truncate text-xs text-white/70" title={filename ?? undefined}>
              {filename}
            </p>
          ) : (
            <p className="text-xs text-white/40">No model selected — {MODEL_ACCEPT}, max {MAX_MB}MB.</p>
          )}
          <div className="mt-1.5 flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" /> {value ? 'Replace' : 'Upload model'}
                </>
              )}
            </Button>
            {value && !uploading ? (
              <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                <X className="h-3.5 w-3.5" /> Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {uploading ? (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Model upload progress"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <input
        ref={fileInput}
        type="file"
        accept={MODEL_ACCEPT}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
