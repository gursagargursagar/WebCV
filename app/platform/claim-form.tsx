'use client';

import { useState } from 'react';
import { normaliseSlug, useSlugCheck } from './use-slug-check';

/**
 * The hero's address check, laid out as SCAI's endpoint bar: label, the
 * address being typed, and one black button. Hands the slug to sign-up.
 */
export function ClaimForm() {
  const [slug, setSlug] = useState('');
  const check = useSlugCheck(slug);
  const blocked = check.state === 'taken' || check.state === 'invalid';

  return (
    <form
      className="wc-claim"
      action="/signup"
      method="get"
      onSubmit={(e) => {
        if (blocked) e.preventDefault();
      }}
    >
      <label htmlFor="claim-slug">Claim your address</label>
      <div className="wc-claim-field">
        <span aria-hidden>webcv.au/</span>
        <input
          id="claim-slug"
          name="slug"
          placeholder="your-name"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={slug}
          onChange={(e) => setSlug(normaliseSlug(e.target.value))}
          aria-describedby="claim-hint"
          aria-invalid={blocked || undefined}
        />
      </div>
      <button type="submit" className="wc-button" disabled={blocked}>
        Continue <span aria-hidden>→</span>
      </button>
      <p id="claim-hint" className={`wc-claim-hint ${check.tone}`} aria-live="polite">
        {slug ? check.message : 'Lowercase letters, numbers and hyphens. You can check it now.'}
      </p>
    </form>
  );
}
