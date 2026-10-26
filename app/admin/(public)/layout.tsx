import type { Metadata } from 'next';
import { Brand } from '@/components/scai/Brand';
import { ThemeToggle } from '@/components/scai/ThemeToggle';
import { isMultiSite } from '@/core/site/constants';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin' },
  robots: { index: false, follow: false },
};

/**
 * The signed-out shell: sign in, reset.
 *
 * Separate from `(protected)` because these two pages are the only admin
 * routes a signed-out visitor may see — the guard-by-existence group cannot
 * contain them. None of the section navigation, which means nothing to
 * someone who is not signed in yet.
 *
 * In WebCV it wears the platform skin: a ruled editorial panel on the left in
 * the swisscheeseai.au manner, the form on the right, stacked on a phone.
 */
export default function PublicAdminLayout({ children }: { children: React.ReactNode }) {
  const multi = isMultiSite();
  return (
    <div className="scai flex min-h-screen flex-col bg-bg font-body text-text-primary">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-[64px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <Brand href="/" />
          <div className="flex items-center gap-3">
            {multi ? (
              <a
                href="/signup"
                className="hidden text-sm text-text-secondary no-underline hover:text-text-primary sm:inline"
              >
                New here? Create a portfolio
              </a>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 items-start gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1fr_minmax(0,440px)] md:gap-16 md:py-20">
        <aside aria-label="About the editor" className="hidden md:block">
          <p className="m-0 flex justify-between border-b border-text-primary pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
            <span>WebCV / Editor</span>
            <span>01 / Sign in</span>
          </p>
          <h2
            className="m-0 mt-8 font-display text-5xl font-semibold leading-[1.02] text-text-primary"
            style={{ letterSpacing: '-0.035em' }}
          >
            Your portfolio,
            <span className="block text-text-secondary">one sign-in away.</span>
          </h2>
          <ul className="m-0 mt-10 grid list-none gap-0 border-t border-border p-0 text-sm text-text-secondary">
            {[
              ['01', 'Edit every word and image', 'Changes stay private until you publish.'],
              ['02', 'Preview before it goes live', 'See the page exactly as visitors will.'],
              ['03', 'Publish in one click', 'Your address updates straight away.'],
            ].map(([n, title, body]) => (
              <li key={n} className="grid grid-cols-[48px_1fr] gap-4 border-b border-border py-5">
                <span className="font-mono text-[11px] text-accent">{n}</span>
                <span>
                  <strong className="block font-display text-lg font-semibold text-text-primary">
                    {title}
                  </strong>
                  {body}
                </span>
              </li>
            ))}
          </ul>
        </aside>
        <main
          className="w-full border border-border bg-surface-primary p-6 sm:p-8"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
