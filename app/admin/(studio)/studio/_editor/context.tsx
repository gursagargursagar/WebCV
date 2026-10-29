'use client';

import { createContext, useContext } from 'react';
import type { StudioDesign, StudioPage } from '@/core/studio/types';

/**
 * What the editor's pieces share: the site's address (for uploads), toasts,
 * and the few site-level edits a block can make.
 *
 * Context rather than props because many of these pieces render inside Puck's
 * preview frame — a React portal, so context reaches them while props from
 * the editor around it cannot.
 */
export interface StudioContextValue {
  slug: string;
  upload(file: File): Promise<string | null>;
  notify(message: string, tone?: 'info' | 'error'): void;
  openPage(id: string): void;
  updatePage(id: string, patch: Partial<Omit<StudioPage, 'id' | 'data'>>): void;
  setDesign(patch: Partial<StudioDesign>): void;
  pageCover(id: string): string | undefined;
}

export const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error('useStudio outside the Studio');
  return value;
}

/** Vercel refuses request bodies over 4.5 MB; this leaves room for the form framing. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Widest first: 2560 px is more than any layout shows, even on a dense screen. */
const EDGES = [2560, 1920, 1440];
const QUALITIES = [0.85, 0.7];

/**
 * A phone photo is often 5–12 MB and 4000 px wide: shrunk in the browser to
 * something the server will accept, as large and sharp as still fits.
 * Animated GIFs and SVGs are left alone.
 */
async function shrink(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES || !/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type))
    return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const canvas = document.createElement('canvas');
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  try {
    for (const edge of EDGES) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of QUALITIES) {
        // WebP keeps transparency; a browser that cannot write it hands back
        // PNG, which would be no smaller, so JPEG then.
        let blob = await encode('image/webp', quality);
        if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', quality);
        if (blob && blob.size <= MAX_UPLOAD_BYTES) {
          const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
          const name = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
          return new File([blob], name, { type: blob.type });
        }
      }
    }
  } finally {
    bitmap.close();
  }
  return file;
}

/** Puts an image on WebCV's storage and returns the address to show it at. */
export async function uploadImage(original: File, slug: string): Promise<string> {
  if (!original.type.startsWith('image/'))
    throw new Error('That is not an image. Try a JPG, PNG or WebP.');
  if (original.size > 40 * 1024 * 1024)
    throw new Error('That image is over 40 MB. Try a smaller one.');
  const file = await shrink(original);
  if (file.size > MAX_UPLOAD_BYTES)
    throw new Error('That image is still over 4 MB after resizing. Try a JPG or PNG.');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/admin/media', { method: 'POST', body: form });
  const body = (await res.json().catch(() => null)) as
    { ok: true; media: { url: string } } | { ok: false; error?: string } | null;
  if (!res.ok || !body?.ok) {
    throw new Error(
      (body && !body.ok && body.error) || 'The upload did not go through. Try again.'
    );
  }
  // Addressed through the portfolio, so the image resolves to this site's
  // storage for any visitor, whatever page or app links to it.
  return `/${slug}${body.media.url}`;
}
