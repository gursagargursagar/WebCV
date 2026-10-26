'use client';

import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '@/context/themeConstants';

/** The WebCV mark and wordmark. */
export function Brand() {
  return (
    <a href="/" className="wc-brand" aria-label="WebCV home">
      <span className="wc-mark" aria-hidden="true">
        CV
      </span>
      WebCV
    </a>
  );
}

/**
 * Light/dark switch, sharing the key the portfolios use so the choice follows
 * a visitor between the platform and the sites on it. With nothing stored yet
 * the platform follows the system setting.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {}
    const initial =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    apply(initial);
    setTheme(initial);
  }, []);

  function apply(next: 'light' | 'dark') {
    const el = document.documentElement;
    el.dataset.theme = next;
    el.classList.toggle('dark', next === 'dark');
    el.classList.toggle('light', next === 'light');
    el.style.colorScheme = next;
  }

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    apply(next);
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  }

  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="wc-icon-btn"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M20.2 14.6A8.3 8.3 0 0 1 9.4 3.8a8.3 8.3 0 1 0 10.8 10.8Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function TopBar() {
  return (
    <header className="wc-top">
      <div className="wc-wrap">
        <Brand />
        <nav className="wc-nav" aria-label="Main">
          <a className="wc-link hide-sm" href="/gursagar24">
            Example
          </a>
          <a className="wc-link" href="/admin/login">
            Sign in
          </a>
          <a className="wc-btn primary" href="/signup">
            Get started
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function Foot() {
  return (
    <footer className="wc-foot">
      <div className="wc-wrap">
        <span>© {new Date().getFullYear()} WebCV · webcv.au</span>
        <span>
          Built on{' '}
          <a href="https://github.com/ShadmanArafin/open_portfolio" target="_blank" rel="noopener">
            Open Portfolio
          </a>{' '}
          (MIT)
        </span>
      </div>
    </footer>
  );
}
