'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { publishDraftAction } from '../_actions/publish';

const CONTROL = 'inline-flex items-center gap-2 border px-3 text-sm transition-colors';
const SQUARE = { minHeight: 40, borderRadius: 'var(--radius-md)' } as const;

/**
 * Whether the site matches the draft, on every screen, with the button that
 * fixes it.
 *
 * Before, the only Publish lived on the dashboard: a person editing a project
 * saved, opened their site, saw nothing change and had no way to know why
 * without going back to the dashboard. Saved-but-not-live is the single most
 * confusing state in a draft/publish editor, so it is now stated where every
 * save happens.
 */
export function PublishStatus({
  unpublished,
  expectedRevision,
}: {
  unpublished: boolean;
  expectedRevision: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!unpublished) {
    return (
      <span
        className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted md:inline-flex"
        role="status"
      >
        <span aria-hidden className="h-1.5 w-1.5 bg-accent" />
        Live · up to date
      </span>
    );
  }

  const publish = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await publishDraftAction(expectedRevision);
      if (result.ok) router.refresh();
      else setError(result.error ?? 'The publish did not go through.');
    } catch {
      setError('The publish did not go through. Reload and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted xl:inline">
        Unpublished changes
      </span>
      <button
        type="button"
        onClick={() => void publish()}
        disabled={busy}
        className={`${CONTROL} border-transparent bg-text-primary font-semibold text-bg hover:opacity-90 disabled:opacity-60`}
        style={SQUARE}
        aria-describedby={error ? 'publish-error' : undefined}
      >
        {busy ? 'Publishing…' : 'Publish'}
      </button>
      {error ? (
        <span id="publish-error" role="alert" className="max-w-[16rem] text-xs text-danger">
          {error}{' '}
          <Link href="/admin" className="underline">
            Details
          </Link>
        </span>
      ) : null}
    </span>
  );
}

/** The owner's public address, one click to open and one to copy. */
export function SiteLink({ site }: { site: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/${site}`;
  return (
    <span className="inline-flex items-stretch">
      <a
        href={path}
        target="_blank"
        rel="noopener"
        className={`${CONTROL} border-border text-text-primary no-underline hover:border-border-hover`}
        style={{ ...SQUARE, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        title="Open your portfolio in a new tab"
      >
        <span className="hidden font-mono text-xs sm:inline">webcv.au/{site}</span>
        <span className="sm:hidden">Site</span>
        <span aria-hidden>↗</span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}${path}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            // Clipboard refused (insecure context, permissions): the link
            // beside it still works.
          }
        }}
        className={`${CONTROL} -ml-px border-border text-text-secondary hover:border-border-hover hover:text-text-primary`}
        style={{ ...SQUARE, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        aria-label={copied ? 'Link copied' : 'Copy link to your portfolio'}
        title="Copy link"
      >
        <span aria-live="polite" className="text-xs">
          {copied ? 'Copied' : 'Copy'}
        </span>
      </button>
    </span>
  );
}

export function SignOut() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
          window.location.assign('/admin/login');
        }
      }}
      className={`${CONTROL} border-border text-text-secondary hover:border-border-hover hover:text-text-primary`}
      style={SQUARE}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
