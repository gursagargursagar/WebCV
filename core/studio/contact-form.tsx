'use client';

import { useState } from 'react';

/**
 * The Contact block's form. Messages go to the owner's Messages screen through
 * the same endpoint the classic site uses. With no endpoint — in the editor —
 * it is a picture of the form that cannot be sent.
 */
export function ContactForm({ endpoint }: { endpoint: string | null }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!endpoint) return;
    const form = new FormData(event.currentTarget);
    setState('sending');
    setError('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          message: form.get('message'),
          website: form.get('website'),
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && body?.ok) {
        setState('sent');
        return;
      }
      setError(body?.error ?? 'That did not send. Please try again.');
      setState('error');
    } catch {
      setError('You seem to be offline. Please try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p className="wcs-form-done" role="status">
        Thank you — your message is on its way.
      </p>
    );
  }

  return (
    <form className="wcs-form" onSubmit={submit} noValidate={!endpoint}>
      <label>
        <span>Name</span>
        <input name="name" autoComplete="name" required disabled={!endpoint} />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required disabled={!endpoint} />
      </label>
      <label className="wcs-form-wide">
        <span>Message</span>
        <textarea name="message" rows={5} required disabled={!endpoint} />
      </label>
      {/* For bots only; people never see it. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="wcs-trap"
        aria-hidden="true"
      />
      {state === 'error' ? (
        <p className="wcs-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="wcs-btn solid" disabled={!endpoint || state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
