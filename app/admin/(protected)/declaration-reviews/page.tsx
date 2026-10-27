import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { statements } from '@/core/declarations/facts';
import { formatAud } from '@/core/declarations/price';
import { HOLD_DAYS, recentlyReviewed, reviewQueue } from '@/core/declarations/store';
import { NotOperatorError, requireOperator, syncCheckout } from '@/core/declarations/service';
import { ReviewActions } from './review-actions';

export const metadata: Metadata = {
  title: 'Declaration reviews',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The operator's queue: every submitted declaration, oldest card hold first.
 *
 * The check is a person with the myGov app — the QR code's key stays with
 * myGov, so nothing here can verify it automatically. Approving takes the
 * held payment and deletes the PDF; rejecting releases the hold and deletes it.
 */

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function DeclarationReviewsPage() {
  try {
    await requireOperator();
  } catch (err) {
    if (err instanceof NotOperatorError) notFound();
    throw err;
  }

  // A Checkout the owner closed before coming back still held their card.
  const first = await reviewQueue();
  await Promise.all(first.unconfirmed.map(syncCheckout));
  const { waiting } = first.unconfirmed.length ? await reviewQueue() : first;
  const reviewed = await recentlyReviewed();

  return (
    <div className="grid gap-6" style={{ maxWidth: 'var(--measure)' }}>
      <div>
        <p className="m-0 font-mono text-xs uppercase tracking-widest text-text-muted">WebCV</p>
        <h1 className="font-display m-0 mt-1 text-3xl">Declaration reviews</h1>
        <p className="m-0 mt-1 text-text-secondary">
          {waiting.length === 0
            ? 'Nothing waiting.'
            : `${waiting.length} waiting. Card holds lapse after about seven days — review within ${HOLD_DAYS}.`}
        </p>
      </div>

      <section
        aria-label="How to check one"
        className="grid gap-2 rounded-2xl border border-border bg-surface-secondary p-4"
      >
        <ol className="m-0 grid list-decimal gap-1 pl-6 text-sm text-text-secondary">
          <li>Open the PDF and scan its QR code with the myGov app.</li>
          <li>
            Check the app shows a valid declaration with the same name, and that its statements
            match the list here word for word.
          </li>
          <li>Enter the document reference and the date it was declared, then approve.</li>
        </ol>
      </section>

      {waiting.map((d) => {
        const due = d.submittedAt
          ? new Date(new Date(d.submittedAt).getTime() + HOLD_DAYS * 86_400_000).toISOString()
          : null;
        return (
          <section
            key={d.id}
            aria-label={`Declaration by ${d.name}`}
            className="grid gap-3 rounded-2xl border border-border p-4"
          >
            <div>
              <h2 className="m-0 text-xl">{d.name}</h2>
              <p className="m-0 text-sm text-text-secondary">
                webcv.au/{d.site} · {formatAud(d.priceCents)} held
                {d.submittedAt ? ` · submitted ${dateLabel(d.submittedAt)}` : ''}
                {due ? ` · review by ${dateLabel(due)}` : ''}
              </p>
            </div>
            <ol className="m-0 grid list-decimal gap-1 pl-6 text-sm">
              {statements(d.facts).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {d.hasPdf ? (
              <div>
                <a
                  href={`/api/admin/declaration-reviews/${d.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border px-4 text-sm text-text-secondary no-underline"
                  style={{ display: 'inline-flex', minHeight: 44, alignItems: 'center' }}
                >
                  Open the PDF
                </a>
              </div>
            ) : null}
            <ReviewActions id={d.id} />
          </section>
        );
      })}

      {reviewed.length ? (
        <section
          aria-label="Recently reviewed"
          className="grid gap-3 rounded-2xl border border-border p-4"
        >
          <h2 className="m-0 text-xl">Recently reviewed</h2>
          <ul className="m-0 grid list-none gap-2 p-0 text-sm">
            {reviewed.map((d) => (
              <li key={d.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {d.name} · webcv.au/{d.site}
                </span>
                <span className="text-text-secondary">
                  {d.status}
                  {d.reviewedAt ? ` · ${dateLabel(d.reviewedAt)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
