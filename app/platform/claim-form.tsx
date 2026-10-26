'use client';

import { useState } from 'react';
import { useSlugCheck, normaliseSlug } from './use-slug-check';

/** The front page's address check. Hands the slug on to the sign-up form. */
export function ClaimForm() {
  const [slug, setSlug] = useState('');
  const check = useSlugCheck(slug);

  return (
    <form
      action="/signup"
      method="get"
      onSubmit={(e) => {
        if (check.state === 'taken' || check.state === 'invalid') e.preventDefault();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div className="wc-field">
        <label htmlFor="claim-slug">Your address</label>
        <div className="wc-affix">
          <span>webcv.au/</span>
          <input
            id="claim-slug"
            name="slug"
            className="wc-input"
            placeholder="your-name"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={slug}
            onChange={(e) => setSlug(normaliseSlug(e.target.value))}
            aria-describedby="claim-hint"
          />
        </div>
        <span id="claim-hint" className={`wc-hint ${check.tone}`} aria-live="polite">
          {check.message}
        </span>
      </div>
      <button type="submit" className="wc-btn primary">
        Continue
      </button>
    </form>
  );
}
