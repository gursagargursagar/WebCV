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

/** Puts an image on WebCV's storage and returns the address to show it at. */
export async function uploadImage(file: File, slug: string): Promise<string> {
  if (!file.type.startsWith('image/'))
    throw new Error('That is not an image. Try a JPG, PNG or WebP.');
  if (file.size > 20 * 1024 * 1024) throw new Error('That image is over 20 MB. Try a smaller one.');
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
