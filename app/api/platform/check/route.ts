import { NextResponse } from 'next/server';
import { isMultiSite, isValidSlug, RESERVED_SLUGS } from '@/core/site/constants';
import { siteBySlug } from '@/core/site/registry';
import { hasDatabase } from '@/core/storage/adapters/webcv';

/** Whether `webcv.au/<slug>` is free, for the sign-up form's live hint. */
export async function GET(req: Request) {
  if (!isMultiSite()) return NextResponse.json({ ok: false }, { status: 404 });
  const slug = (new URL(req.url).searchParams.get('slug') ?? '').trim().toLowerCase();
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ ok: true, available: false, reason: 'That address is reserved.' });
  }
  if (!isValidSlug(slug)) {
    return NextResponse.json({
      ok: true,
      available: false,
      reason: 'Use 3–32 lowercase letters, numbers or hyphens.',
    });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, reason: 'Sign-ups open shortly.' }, { status: 503 });
  }
  const taken = Boolean(await siteBySlug(slug));
  return NextResponse.json(
    { ok: true, available: !taken, reason: taken ? 'That address is taken.' : undefined },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
