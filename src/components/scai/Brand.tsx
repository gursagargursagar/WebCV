import Link from 'next/link';

/**
 * The WebCV mark: the cheese-block logo (`public/brand/`) beside a Georgia
 * wordmark. The logo carries its own pink ground, so it reads the same on the
 * dark and light themes; the wordmark follows the text colour.
 */
export function Brand({ href = '/', suffix }: { href?: string; suffix?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-text-primary no-underline">
      {/* The cheese-block logo: a CV on a Swiss cheese cube, on its own pink. */}
      <img
        src="/brand/webcv-mark.png"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0"
        style={{ borderRadius: 'var(--radius-md)' }}
      />
      <span className="font-display text-lg font-bold" style={{ letterSpacing: '-0.035em' }}>
        WebCV
      </span>
      {suffix ? (
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted sm:inline">
          / {suffix}
        </span>
      ) : null}
    </Link>
  );
}
