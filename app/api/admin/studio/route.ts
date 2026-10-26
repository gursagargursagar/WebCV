import { NextResponse } from 'next/server';
import { requireOwner, UnauthorizedError } from '@/core/auth/guard';
import { RevisionConflictError } from '@/core/storage/contract';
import { MAX_SITE_BYTES, parseSite, readStudio, writeDraft } from '@/core/studio/store';

/**
 * The Studio's draft: read it, or autosave it.
 *
 * Owner-only, checked here — a route handler is a public endpoint whatever
 * page rendered the editor that calls it.
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

export async function GET() {
  const rejected = await guard();
  if (rejected) return rejected;
  const draft = await readStudio('draft');
  return NextResponse.json({ ok: true, site: draft?.site ?? null, revision: draft?.revision ?? 0 });
}

export async function PUT(req: Request) {
  const rejected = await guard();
  if (rejected) return rejected;

  const text = await req.text();
  if (text.length > MAX_SITE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: 'This site has grown too large to save. Remove a few blocks and try again.',
      },
      { status: 413 }
    );
  }

  let body: { revision?: unknown; site?: unknown } | null = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const site = parseSite(body?.site);
  const revision = Number(body?.revision);
  if (!site || !Number.isInteger(revision) || revision < 0) {
    return NextResponse.json(
      { ok: false, error: 'That does not look like a site.' },
      { status: 400 }
    );
  }

  try {
    const next = await writeDraft(site, revision);
    return NextResponse.json({ ok: true, revision: next });
  } catch (err) {
    if (err instanceof RevisionConflictError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    console.error('[studio] Saving the draft failed.', err);
    return NextResponse.json({ ok: false, error: 'Saving failed. Try again.' }, { status: 500 });
  }
}
