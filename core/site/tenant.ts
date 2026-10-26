import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { headers } from 'next/headers';
import { SITE_HEADER, isValidSlug } from './constants';

/**
 * Which portfolio this request is for.
 *
 * Normally the proxy's header. `runWithSite` overrides it for the few places
 * that learn the site some other way — signing in by email, signing up — and
 * then need the storage layer to act on that site before any cookie exists.
 */

const override = new AsyncLocalStorage<string>();

export function runWithSite<T>(site: string, fn: () => Promise<T>): Promise<T> {
  return override.run(site, fn);
}

/** The current site, or null outside a request or on a platform page. */
export async function currentSite(): Promise<string | null> {
  const forced = override.getStore();
  if (forced) return forced;
  try {
    const value = (await headers()).get(SITE_HEADER);
    return isValidSlug(value) ? value : null;
  } catch {
    // Outside a request: a build step, a test. There is no site there.
    return null;
  }
}

export class NoSiteError extends Error {
  constructor() {
    super('No portfolio is selected for this request.');
    this.name = 'NoSiteError';
  }
}

export async function requireSite(): Promise<string> {
  const site = await currentSite();
  if (!site) throw new NoSiteError();
  return site;
}
