'use client';

import { useEffect, useState } from 'react';

export function normaliseSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 32);
}

type CheckState = 'idle' | 'checking' | 'free' | 'taken' | 'invalid' | 'error';

/** Live "is webcv.au/<slug> free" as the visitor types, debounced. */
export function useSlugCheck(slug: string) {
  const [state, setState] = useState<CheckState>('idle');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!slug) {
      setState('idle');
      return;
    }
    setState('checking');
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/platform/check?slug=${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { available?: boolean; reason?: string };
        if (data.available) setState('free');
        else {
          setReason(data.reason ?? 'That address is not available.');
          setState(data.reason?.startsWith('Use') ? 'invalid' : 'taken');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setState('error');
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  const message =
    state === 'idle'
      ? 'Lowercase letters, numbers and hyphens.'
      : state === 'checking'
        ? 'Checking…'
        : state === 'free'
          ? `webcv.au/${slug} is available.`
          : state === 'error'
            ? 'Could not check right now. You can still continue.'
            : reason;
  const tone = state === 'free' ? 'ok' : state === 'taken' || state === 'invalid' ? 'bad' : '';
  return { state, message, tone };
}
