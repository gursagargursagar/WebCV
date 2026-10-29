import 'server-only';
import { cookies } from 'next/headers';
import { getStorageAdapter } from '@/core/storage/registry';
import { copySiteMedia, sitesSql } from '@/core/storage/adapters/webcv';
import { moveSiteRows, SiteMoveError } from '@/core/storage/adapters/_shared/postgres-sites';
import { shouldUseSecureCookies } from '@/core/auth/session';
import { heldSeed, isHeldSlug } from './claims';
import { SITE_COOKIE } from './constants';
import { siteBySlug } from './registry';
import { runWithSite } from './tenant';

/**
 * Moving an existing account onto an address held for its owner.
 *
 * Sign-up opens a held address with its claim code, but sign-up also makes a
 * new account, and an email can own only one portfolio. Someone who already
 * has a WebCV account moves it instead: `WEBCV_SLUG_OWNERS` names the owner of
 * each held address (`slug:email`, comma-separated), and being signed in to
 * an account with that email is the proof — a password, not a header.
 */

export { SiteMoveError };

function owners(): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (process.env.WEBCV_SLUG_OWNERS ?? '').split(',')) {
    const [slug, email] = pair.trim().split(':');
    if (slug && email && isHeldSlug(slug)) map.set(slug, email.trim().toLowerCase());
  }
  return map;
}

/** The held address this email may move to, if it is still free. */
export async function heldAddressFor(email: string, currentSlug: string): Promise<string | null> {
  const normal = email.trim().toLowerCase();
  for (const [slug, owner] of owners()) {
    if (owner !== normal || slug === currentSlug) continue;
    if (!(await siteBySlug(slug))) return slug;
  }
  return null;
}

/**
 * Moves the signed-in owner's portfolio to their held address and gives it
 * the portfolio prepared for that address. Whatever was in their Studio is
 * kept, as `studio/backup-draft` and `studio/backup-published`.
 */
export async function moveToHeldAddress(from: string, email: string, to: string): Promise<void> {
  if ((await heldAddressFor(email, from)) !== to) {
    throw new SiteMoveError('That address is not held for this account.');
  }
  await getStorageAdapter();
  // Files first: if copying fails, nothing has moved yet. A failed database
  // move after it only leaves spare copies behind.
  await copySiteMedia(from, to);
  await moveSiteRows(sitesSql(), from, to);

  await runWithSite(to, async () => {
    const adapter = await getStorageAdapter();

    // Addresses written into the content follow the portfolio.
    for (const channel of ['draft', 'published'] as const) {
      const meta = await adapter.readSnapshotMeta(channel);
      if (!meta) continue;
      const state = structuredClone(meta.state);
      const fix = (url: string) => url.replace(new RegExp(`/${from}(?=$|/)`), `/${to}`);
      if (state.settings?.siteUrl) state.settings.siteUrl = fix(state.settings.siteUrl);
      if (state.seo?.canonicalUrl) state.seo.canonicalUrl = fix(state.seo.canonicalUrl);
      await adapter.writeSnapshot(channel, state);
    }

    const seed = heldSeed(to);
    if (seed) {
      for (const channel of ['draft', 'published'] as const) {
        const old = await adapter.records.get('studio', channel);
        if (old) await adapter.records.put('studio', `backup-${channel}`, old.data);
      }
      await adapter.records.put('studio', 'draft', seed);
      await adapter.records.put('studio', 'published', seed);
    }
  });

  // This browser now manages the portfolio at its new address. The session
  // moved with it, so the owner stays signed in.
  (await cookies()).set(SITE_COOKIE, to, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
