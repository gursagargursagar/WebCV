import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { StudioSite } from '@/core/studio/types';
import { gursagar24Site } from '@/core/legacy/gursagar24';

/**
 * Addresses held for a particular person.
 *
 * A held address is a valid portfolio address that sign-up refuses unless the
 * request carries its claim code. Sign-up does not verify email, so the code —
 * not the email — is what proves it is theirs. `WEBCV_SLUG_CLAIMS` lists
 * `slug:sha256(code)` pairs, comma-separated; only the hash is ever stored.
 * Once claimed, the address is simply taken.
 */

const HELD: Record<string, { seed: () => StudioSite }> = {
  gursagar24: { seed: gursagar24Site },
};

export function isHeldSlug(slug: string): boolean {
  return Object.hasOwn(HELD, slug);
}

function claimHash(slug: string): Buffer | null {
  for (const pair of (process.env.WEBCV_SLUG_CLAIMS ?? '').split(',')) {
    const [s, hash] = pair.trim().split(':');
    if (s === slug && /^[0-9a-f]{64}$/.test(hash ?? '')) return Buffer.from(hash, 'hex');
  }
  return null;
}

export function claimMatches(slug: string, code: string): boolean {
  const expected = claimHash(slug);
  if (!expected || !code) return false;
  const given = createHash('sha256').update(code.trim()).digest();
  return timingSafeEqual(given, expected);
}

/** The site a held address starts with, in place of the starter. */
export function heldSeed(slug: string): StudioSite | null {
  return isHeldSlug(slug) ? HELD[slug].seed() : null;
}
