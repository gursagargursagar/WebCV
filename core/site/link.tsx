'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, type ComponentProps } from 'react';
import { withSitePrefix, withoutSitePrefix } from './constants';

/**
 * The public site's view of which portfolio it is.
 *
 * Routes render as if they were the only site (`/about`), and the browser sits
 * at `/<slug>/about`. These keep the two in step: links gain the slug, and the
 * address loses it wherever code compares it with a route.
 */

const SiteContext = createContext<string | null>(null);

export function SiteProvider({ site, children }: { site: string | null; children: React.ReactNode }) {
  return (
    <SiteContext.Provider value={site}>
      <StrayLinkGuard site={site} />
      {children}
    </SiteContext.Provider>
  );
}

export function useSite(): string | null {
  return useContext(SiteContext);
}

export function useSiteHref(href: string): string {
  return withSitePrefix(useSite(), href);
}

/** `usePathname()` without the slug: `/guru/about` → `/about`. */
export function useSitePathname(): string {
  return withoutSitePrefix(useSite(), usePathname() ?? '/');
}

/** `next/link`, with the portfolio's slug in front of every internal path. */
export default function SiteLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const site = useSite();
  const resolved = typeof href === 'string' ? withSitePrefix(site, href) : href;
  return <NextLink href={resolved} {...props} />;
}

const PLATFORM_PATHS = /^\/(admin|api|_next|platform|signup|login|gursagar24)(\/|$)/;

/**
 * A safety net for links written as plain paths — in owner-written content,
 * in a block, anywhere this layer did not reach. A click on one is sent to the
 * same path under this portfolio rather than off the site.
 */
function StrayLinkGuard({ site }: { site: string | null }) {
  useEffect(() => {
    if (!site) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return;
      const raw = anchor.getAttribute('href') ?? '';
      if (!raw.startsWith('/') || raw.startsWith('//')) return;
      const url = new URL(raw, window.location.origin);
      if (PLATFORM_PATHS.test(url.pathname)) return;
      const fixed = withSitePrefix(site, url.pathname);
      if (fixed === url.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(fixed + url.search + url.hash);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [site]);
  return null;
}
