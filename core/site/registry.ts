import 'server-only';
import { getStorageAdapter } from '@/core/storage/registry';
import { sitesSql } from '@/core/storage/adapters/webcv';
import {
  countSites,
  findSiteByEmail,
  findSiteBySlug,
  insertSite,
  listPublishedSites,
  type PublishedSiteRow,
  type SiteRow,
} from '@/core/storage/adapters/_shared/postgres-sites';
import { isMultiSite } from './constants';
import { cache } from 'react';
import { currentSite, runWithSite } from './tenant';

/**
 * The list of portfolios, for the platform pages and sign-in.
 *
 * Every function provisions first (through `getStorageAdapter`), so the
 * sign-up page works on a database nobody has touched yet.
 */

async function ready() {
  await getStorageAdapter();
  return sitesSql();
}

export async function siteBySlug(slug: string): Promise<SiteRow | null> {
  return findSiteBySlug(await ready(), slug);
}

/** Whether the portfolio this request is for has been registered. Once per request. */
export const currentSiteExists = cache(async (): Promise<boolean> => {
  const site = await currentSite();
  if (!site) return false;
  try {
    return Boolean(await siteBySlug(site));
  } catch (err) {
    // An unreachable database is an outage, not a missing page.
    console.error('[webcv] Could not look up the site.', err);
    throw err;
  }
});

export async function siteByEmail(email: string): Promise<SiteRow | null> {
  return findSiteByEmail(await ready(), email.trim().toLowerCase());
}

export async function registerSite(slug: string, email: string) {
  return insertSite(await ready(), slug, email.trim().toLowerCase());
}

/** Portfolios a search engine should know about; see `listPublishedSites`. */
export async function publishedSites(): Promise<PublishedSiteRow[]> {
  return listPublishedSites(await ready());
}

export async function siteCount(): Promise<number> {
  return countSites(await ready());
}

/**
 * A store no portfolio owns. Sign-in for an email nobody registered runs here,
 * so the handler takes its ordinary "that is not right" path — same wording,
 * same timing — instead of failing in a way that says the account is missing.
 */
const NOBODY = '_nobody';

/**
 * Wraps an auth route whose body names an email: runs it against the site that
 * email owns. Outside multi-site mode the handler runs exactly as before.
 */
export function bySiteOfEmail(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (!isMultiSite()) return handler(req);
    const body = (await req
      .clone()
      .json()
      .catch(() => null)) as { email?: unknown } | null;
    const email = typeof body?.email === 'string' ? body.email : '';
    const site = email ? await siteByEmail(email) : null;
    return runWithSite(site?.slug ?? NOBODY, () => handler(req));
  };
}
