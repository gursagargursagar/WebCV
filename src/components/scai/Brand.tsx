import Link from 'next/link';

/**
 * The WebCV mark: a square block with "CV" in mono, after the SCAI block mark,
 * beside a Georgia wordmark. Inverts with the theme (paper on black, black on
 * white) because it is drawn from the text and page colours.
 */
export function Brand({ href = '/', suffix }: { href?: string; suffix?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 text-text-primary no-underline"
    >
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center bg-text-primary font-mono text-[11px] font-bold tracking-tight text-bg"
        style={{ borderRadius: 'var(--radius-md)' }}
      >
        CV
      </span>
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
