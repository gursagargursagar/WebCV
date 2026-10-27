import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireOwner, UnauthorizedError } from '@/core/auth/guard';
import { requireSite } from '@/core/site/tenant';
import { attachPdf, DeclarationStateError, openDeclaration } from '@/core/declarations/store';

/**
 * The owner uploads the PDF myGov gave them.
 *
 * Kept privately in the database, never in the public media store, and only
 * until it is reviewed. A route handler rather than a server action because
 * server actions cap request bodies well below a PDF.
 */

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await requireOwner();
  } catch (err) {
    const status = err instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status });
  }
  const site = await requireSite();

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Choose the PDF to upload.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'That file is over 5 MB — upload the PDF exactly as myGov gave it.' },
      { status: 413 }
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const magic = new TextDecoder().decode(bytes.slice(0, 5));
  if (magic !== '%PDF-') {
    return NextResponse.json(
      { ok: false, error: 'That is not a PDF. Upload the PDF myGov gave you.' },
      { status: 415 }
    );
  }

  const open = await openDeclaration(site);
  if (!open) {
    return NextResponse.json({ ok: false, error: 'Save your facts first.' }, { status: 409 });
  }
  try {
    await attachPdf(site, open.id, bytes, file.name || 'declaration.pdf');
  } catch (err) {
    if (err instanceof DeclarationStateError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    throw err;
  }
  revalidatePath('/admin/declaration');
  return NextResponse.json({ ok: true });
}
