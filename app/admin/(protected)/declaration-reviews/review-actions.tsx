'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveDeclarationAction, rejectDeclarationAction } from '../_actions/declaration-reviews';

const INPUT = 'rounded-xl border border-border bg-surface-primary px-3 text-text-primary';

const REASONS = [
  'The QR code did not verify in the myGov app.',
  'The statements in the PDF do not match the ones WebCV prepared.',
  'The name in the PDF does not match the name you entered.',
  'The file is not a myGov digital statutory declaration.',
];

/** Approve (takes the held payment) or reject (releases it), with what each needs. */
export function ReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [ref, setRef] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: () => ReturnType<typeof approveDeclarationAction>) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      if (result.ok) router.refresh();
      else setMessage(result.error);
    } catch {
      setMessage('That did not go through. Reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">myGov document reference</span>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className={INPUT}
            style={{ minHeight: 44 }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Date declared</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={INPUT}
            style={{ minHeight: 44 }}
          />
        </label>
      </div>
      <div>
        <button
          type="button"
          disabled={busy || !ref || !date}
          onClick={() =>
            run(() => approveDeclarationAction({ id, mygovRef: ref, declaredOn: date }))
          }
          className="rounded-full bg-text-primary px-4 text-sm font-semibold text-bg disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          Approve and take payment
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Or reject because</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={INPUT}
            style={{ minHeight: 44 }}
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => rejectDeclarationAction({ id, reason }))}
          className="rounded-full border border-border px-4 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          Reject and release the hold
        </button>
      </div>
      {message ? (
        <p role="alert" className="m-0 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
