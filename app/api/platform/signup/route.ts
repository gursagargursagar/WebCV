import { NextResponse } from 'next/server';
import { INITIAL_CMS_STATE } from '@/cms/data/initialData';
import type { CMSState } from '@/cms/types/cms';
import { assertSameOrigin } from '@/core/auth/guard';
import { checkPassphraseStrength, hashPassphrase, isBreachedPassphrase } from '@/core/auth/passphrase';
import { clientKey, rateLimit } from '@/core/auth/ratelimit';
import { createSession } from '@/core/auth/session';
import { MAX_EMAIL_LENGTH } from '@/core/email/send';
import { isMultiSite, isValidSlug } from '@/core/site/constants';
import { registerSite, siteByEmail, siteBySlug } from '@/core/site/registry';
import { runWithSite } from '@/core/site/tenant';
import { WEBCV_THEME_ID } from '@/core/theme/presets';
import { getStorageAdapter } from '@/core/storage/registry';
import { hasDatabase } from '@/core/storage/adapters/webcv';

/** Where platform-wide counters live; not a valid slug, so no portfolio can be it. */
const PLATFORM = '_platform';

function siteUrlFor(req: Request, slug: string): string {
  const configured = process.env.OPB_SITE_URL?.trim().replace(/\/$/, '');
  const origin = configured || new URL(req.url).origin;
  return `${origin}/${slug}`;
}

/**
 * Creates a portfolio: the site row, its owner, and a first copy of the
 * content, then signs the new owner in. The order matters — the site row is
 * the claim on the address, so two people racing for one slug are settled by
 * its primary key before either gets an owner record.
 */
export async function POST(req: Request) {
  if (!isMultiSite()) return NextResponse.json({ ok: false }, { status: 404 });

  try {
    await assertSameOrigin();
  } catch {
    return NextResponse.json({ ok: false, error: 'Request rejected.' }, { status: 403 });
  }

  // Said plainly rather than as a generic failure: the form is otherwise fine,
  // and a visitor should know to come back rather than retry.
  if (!hasDatabase()) {
    return NextResponse.json(
      { ok: false, error: 'Sign-ups open shortly. WebCV is still being connected to its database.' },
      { status: 503 }
    );
  }

  const limit = await runWithSite(PLATFORM, async () =>
    rateLimit(`signup:${await clientKey()}`, 10, 60 * 60)
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many sign-ups from here. Try again in an hour.' },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String(body?.name ?? '').trim().slice(0, 80);
  const slug = String(body?.slug ?? '').trim().toLowerCase();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const passphrase = String(body?.passphrase ?? '');

  const fail = (field: string, error: string, status = 400) =>
    NextResponse.json({ ok: false, field, error }, { status });

  if (!name) return fail('name', 'Enter your name.');
  if (!isValidSlug(slug)) {
    return fail('slug', 'Use 3–32 lowercase letters, numbers or hyphens, not a reserved word.');
  }
  if (!email || email.length > MAX_EMAIL_LENGTH || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return fail('email', 'That does not look like an email address.');
  }
  const strength = checkPassphraseStrength(passphrase);
  if (!strength.ok) return fail('passphrase', strength.reason ?? 'Choose a stronger passphrase.');
  if ((await isBreachedPassphrase(passphrase)).breached) {
    return fail('passphrase', 'That passphrase has appeared in a data breach. Choose another.');
  }

  if (await siteBySlug(slug)) return fail('slug', 'That address is taken.', 409);
  if (await siteByEmail(email)) {
    return fail('email', 'That email already has a portfolio. Sign in instead.', 409);
  }

  const claimed = await registerSite(slug, email);
  if (claimed === 'slug-taken') return fail('slug', 'That address was just taken.', 409);
  if (claimed === 'email-taken') return fail('email', 'That email already has a portfolio.', 409);

  await runWithSite(slug, async () => {
    const adapter = await getStorageAdapter();
    const now = new Date().toISOString();
    const seed: CMSState = structuredClone(INITIAL_CMS_STATE);
    seed.settings = { ...seed.settings, fullName: name, email, siteUrl: siteUrlFor(req, slug) };
    // New portfolios start on WebCV's own look; the owner can change it in Appearance.
    seed.appearance = { ...seed.appearance, themeId: WEBCV_THEME_ID };
    // WebCV knows the address and the owner's name, so the search-engine basics
    // start filled in rather than as dashboard warnings.
    seed.seo = {
      ...seed.seo,
      canonicalUrl: siteUrlFor(req, slug),
      siteTitle: `${name} — Portfolio`,
      author: name,
    };
    seed.lastSavedAt = now;
    seed.lastPublishedAt = now;

    await adapter.writeOwner({
      email,
      passphraseHash: await hashPassphrase(passphrase),
      createdAt: now,
      sessionEpoch: 1,
    });
    await adapter.writeSnapshot('published', seed);
    await adapter.writeSnapshot('draft', structuredClone(seed));
    await createSession(email, 1);
  });

  return NextResponse.json({ ok: true, slug });
}
