import { NextResponse, after } from 'next/server';
import { requireOwner, UnauthorizedError } from '@/core/auth/guard';
import { clientKey, rateLimit } from '@/core/auth/ratelimit';
import { currentSite } from '@/core/site/tenant';
import { publishDraft, readStudio, unpublish } from '@/core/studio/store';
import { pingIndexNow } from '@/core/seo/indexnow';

/**
 * Publishing the Studio: the saved draft becomes what visitors see.
 *
 * Publishes what is stored, never what the request carries, so the live site
 * is always a version that passed the draft's validation — and the caller
 * names the revision it saw, so a stale tab cannot publish over newer work.
 */

async function guard(): Promise<NextResponse | null> {
  try {
    await requireOwner();
    return null;
  } catch (err) {
    const status = err instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status });
  }
}

export async function POST(req: Request) {
  const rejected = await guard();
  if (rejected) return rejected;

  const limit = await rateLimit(`studio-publish:${await clientKey()}`, 120, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'That is a lot of publishing. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const body = (await req.json().catch(() => null)) as { revision?: unknown } | null;
  const draft = await readStudio('draft');
  if (!draft) {
    return NextResponse.json(
      { ok: false, error: 'There is nothing to publish yet.' },
      { status: 400 }
    );
  }
  if (body?.revision !== undefined && Number(body.revision) !== draft.revision) {
    return NextResponse.json(
      { ok: false, error: 'Your site changed in another tab. Reload, then publish.' },
      { status: 409 }
    );
  }

  const published = await publishDraft(draft.site);
  const site = await currentSite();
  // Tell the search engines that listen (Bing and friends) once the response
  // is on its way; Google picks the change up from the sitemap.
  if (site && published) {
    const paths = published.pages.map((p) => (p.slug ? `/${site}/${p.slug}` : `/${site}`));
    after(() => pingIndexNow(paths));
  }
  return NextResponse.json({ ok: true, site });
}

/** Takes the Studio site down, so the address shows the classic site again. */
export async function DELETE() {
  const rejected = await guard();
  if (rejected) return rejected;
  await unpublish();
  return NextResponse.json({ ok: true });
}
