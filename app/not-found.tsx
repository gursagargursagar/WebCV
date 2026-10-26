import Link from 'next/link';
import { getPublishedContent } from '@/core/content/read';
import { isMultiSite } from '@/core/site/constants';
import { siteBySlug } from '@/core/site/registry';
import { currentSite } from '@/core/site/tenant';
import { Brand } from '@/components/scai/Brand';

/**
 * A real 404. The previous build redirected every unknown URL to the homepage,
 * which hid broken links from visitors and told search engines the page
 * existed. Copy comes from the microcopy settings, which already had fields for
 * this and had never been wired to anything.
 */
export default async function NotFound() {
  if (isMultiSite()) {
    const site = await currentSite();
    // On WebCV the usual 404 is an address nobody has claimed yet — which is
    // an offer, not a dead end. Anything else gets the plain version.
    if (site && !(await siteBySlug(site).catch(() => true))) {
      return <UnclaimedAddress slug={site} />;
    }
    return <PlatformNotFound />;
  }
  const content = await getPublishedContent();
  const { notFoundTitle, notFoundBody } = content.microcopy;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">404</p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium text-text-primary">
          {notFoundTitle || 'Not found'}
        </h1>
        <p className="text-text-secondary font-body">
          {notFoundBody || 'That page may have been renamed or removed.'}
        </p>
        <Link
          href="/"
          className="inline-flex h-[42px] items-center rounded-full bg-text-primary px-6 font-body text-xs font-medium uppercase tracking-wider text-bg transition-opacity hover:opacity-90"
        >
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}

function PlatformFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="scai flex min-h-screen flex-col bg-bg font-body text-text-primary">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-[64px] max-w-[1200px] items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-[1200px] flex-1 content-center px-4 py-16 sm:px-6">
        <div className="max-w-[640px]">{children}</div>
      </main>
    </div>
  );
}

function UnclaimedAddress({ slug }: { slug: string }) {
  return (
    <PlatformFrame>
      <p className="m-0 border-b border-text-primary pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
        404 / Free address
      </p>
      <h1 className="m-0 mt-8 font-display text-5xl font-semibold leading-[1.02]">
        Nobody has webcv.au/{slug} yet.
      </h1>
      <p className="m-0 mt-5 text-lg text-text-secondary">
        If you were sent this link, the portfolio may have moved or the address may be misspelt. If
        it is your name, it can be yours.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={`/signup?slug=${encodeURIComponent(slug)}`}
          className="inline-flex min-h-[46px] items-center bg-text-primary px-5 text-sm font-bold text-bg no-underline"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          Claim webcv.au/{slug}
        </a>
        <a
          href="/"
          className="inline-flex min-h-[46px] items-center border border-border px-5 text-sm font-bold text-text-primary no-underline hover:border-border-hover"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          What is WebCV?
        </a>
      </div>
    </PlatformFrame>
  );
}

function PlatformNotFound() {
  return (
    <PlatformFrame>
      <p className="m-0 border-b border-text-primary pb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
        404 / Not found
      </p>
      <h1 className="m-0 mt-8 font-display text-5xl font-semibold leading-[1.02]">
        That page is not here.
      </h1>
      <p className="m-0 mt-5 text-lg text-text-secondary">
        It may have been renamed or removed. Check the address, or start from the front page.
      </p>
      <div className="mt-8">
        <a
          href="/"
          className="inline-flex min-h-[46px] items-center bg-text-primary px-5 text-sm font-bold text-bg no-underline"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          Go to the front page
        </a>
      </div>
    </PlatformFrame>
  );
}
