import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_COOKIE_SECURE } from '@/core/auth/constants';
import { DEMO_SESSION_COOKIE, DEMO_TTL_SECONDS } from '@/core/demo/config';
import { arrivedOverHttps, plainHttpContentSecurityPolicy } from '@/core/security/csp';
import { SITE_COOKIE, SITE_HEADER, isMultiSite, isValidSlug } from '@/core/site/constants';

/** Paths of a portfolio. Reached without a `/<slug>` in front, they lost it somewhere. */
const SITE_SECTIONS = new Set([
  'about', 'work', 'writing', 'contact', 'cv', 'share', 'search', 'newsletter', 'case-studies',
]);

/** API routes a visitor reaches from someone's public portfolio, not from the admin. */
const PUBLIC_API = /^\/api\/(contact|newsletter|spam|media)(\/|$)/;

function slugFromReferer(req: NextRequest): string | null {
  const referer = req.headers.get('referer');
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.host !== req.nextUrl.host) return null;
    const first = url.pathname.split('/')[1];
    return isValidSlug(first) ? first : null;
  } catch {
    return null;
  }
}

/**
 * WebCV routing: `/<slug>/...` is that person's portfolio.
 *
 * The slug is stripped and the request rewritten to the ordinary single-site
 * route, with the slug in `SITE_HEADER`. The inbound header is always removed
 * first, so a visitor cannot pick a site by sending it. `/admin` and the APIs
 * it calls take the site from the owner's `wc_site` cookie instead; that
 * cookie only *selects* a store, and the session inside that store is still
 * what authorizes anything (`requireOwner`).
 */
function routeMultiSite(req: NextRequest): NextResponse | 'admin' | null {
  const { pathname } = req.nextUrl;
  const headers = new Headers(req.headers);
  headers.delete(SITE_HEADER);
  const first = pathname.split('/')[1] ?? '';

  const rewrite = (to: string, site: string | null) => {
    if (site) headers.set(SITE_HEADER, site);
    const url = req.nextUrl.clone();
    url.pathname = to;
    return NextResponse.rewrite(url, { request: { headers } });
  };
  const redirect = (to: string) => {
    const url = req.nextUrl.clone();
    url.pathname = to;
    return NextResponse.redirect(url);
  };

  // The platform's own pages.
  if (pathname === '/') return rewrite('/platform', null);
  if (pathname === '/signup' || pathname === '/setup') return rewrite('/platform/signup', null);
  if (pathname === '/login') return redirect('/admin/login');

  // Gursagar's original hand-built portfolio, kept exactly where it was.
  if (pathname === '/gursagar24' || pathname === '/gursagar24/') {
    return rewrite('/gursagar24/index.html', null);
  }

  if (isValidSlug(first)) {
    const rest = pathname.slice(first.length + 1) || '/';
    if (rest === '/admin' || rest.startsWith('/admin/')) {
      // Selects which store the admin opens; signing in is still required.
      const res = redirect(rest);
      res.cookies.set(SITE_COOKIE, first, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return res;
    }
    return rewrite(rest, first);
  }

  const cookieSite = req.cookies.get(SITE_COOKIE)?.value;
  const ownerSite = isValidSlug(cookieSite) ? cookieSite : null;

  if (first === 'api') {
    const site = PUBLIC_API.test(pathname) ? (slugFromReferer(req) ?? ownerSite) : ownerSite;
    if (site) headers.set(SITE_HEADER, site);
    return NextResponse.next({ request: { headers } });
  }

  if (first === 'admin') {
    if (ownerSite) headers.set(SITE_HEADER, ownerSite);
    return 'admin';
  }

  // A portfolio path that arrived without its slug: send it back under the
  // portfolio the visitor was just on, or to the front page.
  if (SITE_SECTIONS.has(first)) {
    const site = slugFromReferer(req);
    return redirect(site ? `/${site}${pathname}` : '/');
  }

  return NextResponse.next({ request: { headers } });
}


/**
 * Routing convenience for the admin, and nothing more.
 *
 * This checks only whether a session cookie is *present* — it cannot validate
 * it, because middleware runs before the storage layer is reachable. Treating
 * that check as the authorization boundary would be a serious mistake, and
 * Next has shipped middleware-bypass advisories more than once. The real
 * boundary is `requireOwner()` inside every route handler and server action;
 * this only saves a signed-out visitor from watching the admin shell load
 * before it redirects them.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Every response carries the request id it was served under, so a log line
  // and a bug report can be joined without guessing. Respect an inbound id
  // from a proxy (truncated, it is correlation not auth); otherwise mint one.
  const inbound = req.headers.get('x-request-id')?.slice(0, 64);
  const requestId = inbound && /^[A-Za-z0-9_-]+$/.test(inbound) ? inbound : crypto.randomUUID();

  const plainHttp = !arrivedOverHttps(req.nextUrl, req.headers.get('x-forwarded-proto'));
  const withId = (res: NextResponse): NextResponse => {
    res.headers.set('x-request-id', requestId);
    // See core/security/csp.ts: upgrading a plain-http site's own addresses
    // to https breaks them, the admin's preview frame first.
    if (plainHttp) res.headers.set('Content-Security-Policy', plainHttpContentSecurityPolicy);
    return res;
  };

  const hasSessionCookie = Boolean(
    req.cookies.get(SESSION_COOKIE_SECURE)?.value ?? req.cookies.get(SESSION_COOKIE)?.value
  );

  /*
   * Demo mode: give each visitor their own sandbox.
   *
   * The proxy is the only place this can happen, because it is the only thing
   * that runs before a cached page is served — a cookie set from inside a route
   * would never be issued to the visitors who most need it, the ones landing on
   * the prerendered home page.
   *
   * `crypto.randomUUID` rather than anything cleverer: this identifies a
   * throwaway sandbox, not a person, and it must never look like a session
   * token to anybody reading the code later.
   */
  if (process.env.OPB_DEMO_MODE === '1' && !req.cookies.get(DEMO_SESSION_COOKIE)?.value) {
    const response = NextResponse.next();
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set(DEMO_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: DEMO_TTL_SECONDS,
    });
    return withId(response);
  }

  let adminHeaders: Headers | null = null;
  if (isMultiSite()) {
    const routed = routeMultiSite(req);
    if (routed !== 'admin') return withId(routed ?? NextResponse.next());
    adminHeaders = new Headers(req.headers);
    adminHeaders.delete(SITE_HEADER);
    const site = req.cookies.get(SITE_COOKIE)?.value;
    if (isValidSlug(site)) adminHeaders.set(SITE_HEADER, site);
  }

  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';
    // A mailed reset link is opened cold — no session cookie exists yet — so
    // it needs the same exemption as the login page itself. Losing this would
    // not just be inconvenient: the redirect below rewrites the whole URL,
    // which drops the `?token=` query string the link depends on entirely.
    const isResetPage = pathname === '/admin/reset';

    if (!hasSessionCookie && !isLoginPage && !isResetPage) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      // Where to return to once they are signed in.
      url.searchParams.set('next', pathname);
      return withId(NextResponse.redirect(url));
    }

    if (hasSessionCookie && isLoginPage) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      url.search = '';
      return withId(NextResponse.redirect(url));
    }
  }

  if (adminHeaders) return withId(NextResponse.next({ request: { headers: adminHeaders } }));
  return withId(NextResponse.next());
}

export const config = {
  /*
   * `/admin` for the redirect, and everything else for the demo sandbox cookie.
   *
   * The matcher used to be `/admin` alone, which meant the demo cookie was
   * never issued to anybody arriving at the public site — that is, to everybody.
   * They all shared the anonymous sandbox and each other's edits.
   *
   * Static assets are excluded: issuing a cookie alongside a favicon is pure
   * overhead, and `_next/static` is served from a CDN that should never see one.
   */
  matcher: [
    '/admin/:path*',
    // Static files (images, the hand-built /gursagar24 page's assets) never need the proxy.
    '/((?!_next/static|_next/image|favicon.ico|gursagar24/img/|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?)$).*)',
  ],
};
