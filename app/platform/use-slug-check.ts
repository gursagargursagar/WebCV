'use client';

import { useEffect, useState } from 'react';

/** What a person can type into an address: lowercase, digits, inner hyphens. */
export function normaliseSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 32);
}

type CheckState =
  'idle' | 'short' | 'checking' | 'free' | 'taken' | 'invalid' | 'unavailable' | 'error';

/**
 * Live "is webcv.au/<slug> free", debounced, as the visitor types.
 *
 * Every state says what to do next rather than only what is wrong, and a
 * failure to check never blocks: the server checks again on submit.
 */
/** `claim` opens an address held for someone (core/site/claims.ts). */
export function useSlugCheck(slug: string, claim = '') {
  const [state, setState] = useState<CheckState>('idle');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!slug) {
      setState('idle');
      return;
    }
    if (slug.length < 3) {
      setState('short');
      return;
    }
    setState('checking');
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const query = `slug=${encodeURIComponent(slug)}${claim ? `&claim=${encodeURIComponent(claim)}` : ''}`;
        const res = await fetch(`/api/platform/check?${query}`, {
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({}))) as {
          available?: boolean;
          reason?: string;
        };
        if (res.status === 503) {
          setReason(data.reason ?? 'Sign-ups open shortly.');
          setState('unavailable');
        } else if (!res.ok) {
          setState('error');
        } else if (data.available) {
          setState('free');
        } else {
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
  }, [slug, claim]);

  const message = {
    idle: 'Lowercase letters, numbers and hyphens.',
    short: 'At least 3 characters.',
    checking: 'Checking…',
    free: `webcv.au/${slug} is free.`,
    taken: `${reason} Try adding your surname or a number.`,
    invalid: reason,
    unavailable: reason,
    error: 'Could not check right now. You can still continue.',
  }[state];
  const tone =
    state === 'free'
      ? 'ok'
      : state === 'taken' || state === 'invalid' || state === 'short'
        ? 'bad'
        : '';
  return { state, message, tone };
}
