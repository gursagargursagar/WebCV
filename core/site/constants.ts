/**
 * WebCV multi-site constants, with no dependencies.
 *
 * Kept apart from `./tenant` for the same reason as `core/auth/constants`: the
 * proxy runs before the storage layer exists and must not import it.
 *
 * One deployment serves many portfolios, each at `/<slug>`. The proxy strips
 * the slug from the address, rewrites to the ordinary single-site routes, and
 * passes the slug along in `SITE_HEADER`. Everything below the proxy reads the
 * site from that header and never from the URL, so the routes themselves did
 * not have to learn about slugs.
 */

/** Request header carrying the site a request is for. Set only by the proxy. */
export const SITE_HEADER = 'x-webcv-site';

/** The site the signed-in owner manages. Chooses the store for `/admin` and `/api`. */
export const SITE_COOKIE = 'wc_site';

/** Turns multi-site mode on. Off, the app behaves exactly as upstream. */
export function isMultiSite(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.WEBCV_MULTI_SITE === '1';
}

/**
 * First path segments that are the platform's, never a portfolio's.
 *
 * Anything else that looks like a slug is treated as one; whether that site
 * exists is the storage layer's question, not the proxy's.
 */
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'setup',
  'platform',
  'signup',
  'login',
  'logout',
  'pricing',
  'about',
  'help',
  'docs',
  'terms',
  'privacy',
  'contact',
  'work',
  'writing',
  'share',
  'search',
  'newsletter',
  'cv',
  'static',
  'assets',
  'fonts',
  'images',
  'img',
  'media',
  'www',
  'webcv',
  // The example portfolio (app/platform/example).
  'example',
  // The Studio's editor and the route its published pages render through.
  'studio',
  'wcs-render',
  'wcs-declaration',
  'wcs-example',
  // Platform landing pages (proxy.ts).
  'templates',
  'for',
  // Folders in `public/`, served as files at the top level.
  'demo',
  'llms.txt',
  'robots.txt',
  'sitemap.xml',
  'manifest.webmanifest',
  'opengraph-image',
  'favicon.ico',
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

/** 3–32 characters, lowercase letters, digits and inner hyphens. */
export function isValidSlug(value: string | null | undefined): value is string {
  return Boolean(value && SLUG_PATTERN.test(value) && !RESERVED_SLUGS.has(value));
}

/** `/about` under site `guru` → `/guru/about`. Leaves anchors and external links alone. */
export function withSitePrefix(site: string | null | undefined, href: string): string {
  if (!site || !href.startsWith('/') || href.startsWith('//')) return href;
  if (href === `/${site}` || href.startsWith(`/${site}/`)) return href;
  return href === '/' ? `/${site}` : `/${site}${href}`;
}

/** The inverse, for code that compares the address bar with a site path. */
export function withoutSitePrefix(site: string | null | undefined, pathname: string): string {
  if (!site) return pathname;
  if (pathname === `/${site}`) return '/';
  if (pathname.startsWith(`/${site}/`)) return pathname.slice(site.length + 1);
  return pathname;
}
