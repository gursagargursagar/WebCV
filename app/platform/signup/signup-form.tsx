'use client';

import { useId, useRef, useState } from 'react';
import { normaliseSlug, useSlugCheck } from '../use-slug-check';

type Field = 'name' | 'slug' | 'email' | 'passphrase';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * A rough strength for the meter: length matters most for passphrases, and
 * several words or mixed kinds of character help. The server's own check
 * (length and breached-password lookup) is what actually decides.
 */
function strength(value: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!value) return { score: 0, label: 'At least 12 characters. A short sentence works well.' };
  if (value.length < 12) return { score: 1, label: `Too short: ${value.length} of 12 characters.` };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  const words = value.trim().split(/\s+/).length;
  if (value.length >= 20 || (value.length >= 16 && (words >= 3 || kinds >= 3))) {
    return { score: 4, label: 'Very strong.' };
  }
  if (value.length >= 16 || kinds >= 3 || words >= 3) return { score: 3, label: 'Strong.' };
  return { score: 2, label: 'Good. Longer is stronger.' };
}

export function SignupForm({ initialSlug }: { initialSlug: string }) {
  const id = useId();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState(normaliseSlug(initialSlug));
  const [slugEdited, setSlugEdited] = useState(Boolean(initialSlug));
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const check = useSlugCheck(slug);
  const meter = strength(passphrase);

  function validate(): Partial<Record<Field, string>> {
    const found: Partial<Record<Field, string>> = {};
    if (!name.trim()) found.name = 'Enter your name as you want it shown.';
    if (slug.length < 3) found.slug = 'Choose an address of at least 3 characters.';
    else if (check.state === 'taken' || check.state === 'invalid') found.slug = check.message;
    if (!EMAIL.test(email.trim())) found.email = 'Enter an email address like you@example.com.';
    if (passphrase.length < 12) found.passphrase = 'Use at least 12 characters.';
    return found;
  }

  function focusFirst(found: Partial<Record<Field, string>>) {
    // First field in reading order that has a problem, so a screen-reader
    // user lands on it and hears its message.
    const order: [Field, React.RefObject<HTMLInputElement | null>][] = [
      ['name', nameRef],
      ['slug', slugRef],
      ['email', emailRef],
      ['passphrase', passRef],
    ];
    order.find(([field]) => found[field])?.[1].current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirst(found);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/platform/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug, email: email.trim(), passphrase }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        field?: Field;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        const message = data.error ?? 'Something went wrong on our side. Please try again.';
        if (data.field) {
          const next = { [data.field]: message };
          setErrors(next);
          focusFirst(next);
        } else {
          setFormError(message);
        }
        setBusy(false);
        return;
      }
      window.location.assign('/admin');
    } catch {
      setFormError('Could not reach WebCV. Check your connection and try again.');
      setBusy(false);
    }
  }

  const slugHint = errors.slug ?? check.message;
  const slugTone = errors.slug ? 'bad' : check.tone;

  return (
    <form className="wc-form" onSubmit={submit} noValidate>
      <div className="wc-field">
        <label htmlFor={`${id}-name`}>Full name</label>
        <input
          ref={nameRef}
          id={`${id}-name`}
          className="wc-input"
          autoComplete="name"
          required
          value={name}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-err` : undefined}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
            if (!slugEdited) setSlug(normaliseSlug(e.target.value));
          }}
        />
        {errors.name ? (
          <span id={`${id}-name-err`} className="wc-hint bad">
            {errors.name}
          </span>
        ) : null}
      </div>

      <div className="wc-field">
        <label htmlFor={`${id}-slug`}>Portfolio address</label>
        <div className="wc-affix mono" data-invalid={slugTone === 'bad' || undefined}>
          <span aria-hidden>webcv.au/</span>
          <input
            ref={slugRef}
            id={`${id}-slug`}
            className="wc-input"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={slug}
            aria-invalid={slugTone === 'bad' || undefined}
            aria-describedby={`${id}-slug-hint`}
            onChange={(e) => {
              setSlug(normaliseSlug(e.target.value));
              setSlugEdited(true);
              if (errors.slug) setErrors((x) => ({ ...x, slug: undefined }));
            }}
          />
        </div>
        <span id={`${id}-slug-hint`} className={`wc-hint ${slugTone}`} aria-live="polite">
          {slugHint}
        </span>
      </div>

      <div className="wc-field">
        <label htmlFor={`${id}-email`}>Email</label>
        <input
          ref={emailRef}
          id={`${id}-email`}
          type="email"
          inputMode="email"
          className="wc-input"
          autoComplete="email"
          required
          value={email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={`${id}-email-hint`}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
          }}
        />
        <span id={`${id}-email-hint`} className={`wc-hint ${errors.email ? 'bad' : ''}`}>
          {errors.email ?? 'You sign in with this. It is not shown on your portfolio.'}
        </span>
      </div>

      <div className="wc-field">
        <label htmlFor={`${id}-pass`}>Passphrase</label>
        <div className="wc-affix" data-invalid={errors.passphrase ? true : undefined}>
          <input
            ref={passRef}
            id={`${id}-pass`}
            type={show ? 'text' : 'password'}
            className="wc-input"
            autoComplete="new-password"
            required
            value={passphrase}
            aria-invalid={errors.passphrase ? true : undefined}
            aria-describedby={`${id}-pass-hint`}
            onChange={(e) => {
              setPassphrase(e.target.value);
              if (errors.passphrase) setErrors((x) => ({ ...x, passphrase: undefined }));
            }}
          />
          <button
            type="button"
            className="wc-reveal"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide passphrase' : 'Show passphrase'}
            aria-controls={`${id}-pass`}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="wc-meter" data-score={meter.score} aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </div>
        <span
          id={`${id}-pass-hint`}
          className={`wc-hint ${errors.passphrase ? 'bad' : meter.score >= 3 ? 'ok' : ''}`}
          aria-live="polite"
        >
          {errors.passphrase ?? meter.label}
        </span>
      </div>

      {formError ? (
        <div className="wc-alert" role="alert">
          {formError}
        </div>
      ) : null}

      <button type="submit" className="wc-button wc-button-solid wc-button-block" disabled={busy}>
        {busy ? 'Creating your portfolio…' : 'Create portfolio'}
      </button>
      <p className="wc-note-small">Nothing is public until you choose to publish.</p>
    </form>
  );
}
