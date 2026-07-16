'use client';

import { upload } from '@vercel/blob/client';
import { registerUpload, type MediaItem } from '@/server/actions/media';

// Client-side compression: re-encode large raster images to WebP on a canvas
// before uploading. Keeps the Blob free tier comfortable and pages fast
// without routing bytes through a server function.
const MAX_DIMENSION = 2560;
const WEBP_QUALITY = 0.82;
const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp'];

async function compressImage(
  file: File,
): Promise<{ blob: Blob; filename: string; width: number | null; height: number | null }> {
  if (!COMPRESSIBLE.includes(file.type)) {
    // SVG/GIF/AVIF pass through untouched; try to read dimensions anyway.
    const dims = await readDimensions(file).catch(() => null);
    return { blob: file, filename: file.name, width: dims?.width ?? null, height: dims?.height ?? null };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
    );
    if (!blob) throw new Error('encode failed');

    // Only keep the re-encode when it actually shrank the file.
    if (blob.size >= file.size) {
      return { blob: file, filename: file.name, width: bitmap.width || width, height: bitmap.height || height };
    }
    const filename = file.name.replace(/\.[a-z0-9]+$/i, '') + '.webp';
    return { blob, filename, width, height };
  } catch {
    const dims = await readDimensions(file).catch(() => null);
    return { blob: file, filename: file.name, width: dims?.width ?? null, height: dims?.height ?? null };
  }
}

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable image'));
    };
    img.src = url;
  });
}

/** Compress → direct upload to Blob → register a media row. */
export async function uploadFile(file: File, folderId: string | null): Promise<MediaItem> {
  const { blob, filename, width, height } = await compressImage(file);

  const result = await upload(filename, blob, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  });

  const registered = await registerUpload({
    url: result.url,
    filename,
    mimeType: blob.type || file.type,
    sizeBytes: blob.size,
    width,
    height,
    folderId,
  });
  return registered.item;
}
