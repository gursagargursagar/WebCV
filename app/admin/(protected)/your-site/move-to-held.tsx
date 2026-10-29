'use client';

import { useState } from 'react';
import { moveToHeldAddressAction } from '../_actions/move-site';

/** One button: move this portfolio to the address held for its owner. */
export function MoveToHeld({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const result = await moveToHeldAddressAction();
              if (result.ok) window.location.assign('/admin/studio');
              else {
                setError(result.error);
                setBusy(false);
              }
            } catch {
              setError('That did not go through. Reload and try again.');
              setBusy(false);
            }
          }}
          className="rounded-full bg-text-primary px-4 text-sm font-semibold text-bg disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {busy ? 'Moving…' : `Move to webcv.au/${slug}`}
        </button>
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
