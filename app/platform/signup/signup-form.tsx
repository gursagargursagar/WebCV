'use client';

import { useState } from 'react';
import { normaliseSlug, useSlugCheck } from '../use-slug-check';

type Field = 'name' | 'slug' | 'email' | 'passphrase';

export function SignupForm({ initialSlug }: { initialSlug: string }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState(normaliseSlug(initialSlug));
  const [slugEdited, setSlugEdited] = useState(Boolean(initialSlug));
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: Field; message: string } | null>(null);
  const check = useSlugCheck(slug);

  const long = passphrase.length >= 12;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (check.state === 'taken' || check.state === 'invalid') {
      setError({ field: 'slug', message: check.message });
      return;
    }
    if (!long) {
      setError({ field: 'passphrase', message: 'Use at least 12 characters.' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/platform/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, email, passphrase }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        field?: Field;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError({ field: data.field, message: data.error ?? 'Something went wrong. Try again.' });
        setBusy(false);
        return;
      }
      window.location.assign('/admin');
    } catch {
      setError({ message: 'Could not reach WebCV. Check your connection and try again.' });
      setBusy(false);
    }
  }

  const invalid = (field: Field) => (error?.field === field ? true : undefined);

  return (
    <form onSubmit={submit} noValidate>
      <div className="wc-field">
        <label htmlFor="su-name">Full name</label>
        <input
          id="su-name"
          className="wc-input"
          autoComplete="name"
          required
          value={name}
          aria-invalid={invalid('name')}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(normaliseSlug(e.target.value));
          }}
        />
      </div>

      <div className="wc-field">
        <label htmlFor="su-slug">Portfolio address</label>
        <div className="wc-affix">
          <span>webcv.au/</span>
          <input
            id="su-slug"
            className="wc-input"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={slug}
            aria-invalid={invalid('slug') ?? (check.tone === 'bad' ? true : undefined)}
            aria-describedby="su-slug-hint"
            onChange={(e) => {
              setSlug(normaliseSlug(e.target.value));
              setSlugEdited(true);
            }}
          />
        </div>
        <span id="su-slug-hint" className={`wc-hint ${check.tone}`} aria-live="polite">
          {check.message}
        </span>
      </div>

      <div className="wc-field">
        <label htmlFor="su-email">Email</label>
        <input
          id="su-email"
          type="email"
          className="wc-input"
          autoComplete="email"
          required
          value={email}
          aria-invalid={invalid('email')}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="wc-field">
        <label htmlFor="su-pass">Passphrase</label>
        <div className="wc-affix">
          <input
            id="su-pass"
            type={show ? 'text' : 'password'}
            className="wc-input"
            style={{ paddingLeft: 14 }}
            autoComplete="new-password"
            required
            value={passphrase}
            aria-invalid={invalid('passphrase')}
            aria-describedby="su-pass-hint"
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <button
            type="button"
            className="wc-btn"
            style={{ minHeight: 'auto', color: 'var(--muted)', fontWeight: 500 }}
            onClick={() => setShow((v) => !v)}
            aria-pressed={show}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <span id="su-pass-hint" className={`wc-hint ${passphrase ? (long ? 'ok' : '') : ''}`}>
          {passphrase && long
            ? 'Good length.'
            : `At least 12 characters. A short sentence works well${passphrase ? ` (${passphrase.length}/12)` : ''}.`}
        </span>
      </div>

      {error ? (
        <div className="wc-error" role="alert">
          {error.message}
        </div>
      ) : null}

      <button type="submit" className="wc-btn primary lg" disabled={busy}>
        {busy ? 'Creating your portfolio…' : 'Create portfolio'}
      </button>
      <p className="wc-note" style={{ textAlign: 'center' }}>
        Your portfolio starts with sample content that only you can change.
      </p>
    </form>
  );
}
