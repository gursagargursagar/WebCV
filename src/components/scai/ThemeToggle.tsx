'use client';

import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '@/context/themeConstants';

type Mode = 'light' | 'dark';

function apply(mode: Mode) {
  const el = document.documentElement;
  el.dataset.theme = mode;
  el.classList.toggle('dark', mode === 'dark');
  el.classList.toggle('light', mode === 'light');
  el.style.colorScheme = mode;
}

/**
 * Light/dark, for WebCV's own screens. Shares the key the portfolios use, so
 * one choice follows a person from the editor to their published site.
 *
 * The button names the mode it switches *to*, which is what a person is
 * deciding when they press it; `aria-pressed` would describe a state, and a
 * theme is not on or off.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Storage blocked: stay on the painted default.
    }
    // Dark unless chosen otherwise — SCAI is a dark site, and it is what the
    // root layout's blocking script already painted, so nothing flashes.
    const initial: Mode = stored === 'light' ? 'light' : 'dark';
    setMode(initial);
  }, []);

  const next: Mode = mode === 'light' ? 'dark' : 'light';
  return (
    <button
      type="button"
      onClick={() => {
        apply(next);
        setMode(next);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Not remembered, but still applied for this visit.
        }
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`grid h-10 w-10 place-items-center border border-border text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary ${className}`}
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      {mode === 'light' ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20.2 14.6A8.3 8.3 0 0 1 9.4 3.8a8.3 8.3 0 1 0 10.8 10.8Z" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="4.2" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
