import { NextResponse } from 'next/server';
import { requireOwner, UnauthorizedError } from '@/core/auth/guard';
import { isOperatorEmail } from '@/core/declarations/service';
import { readPdf } from '@/core/declarations/store';

/** An uploaded declaration PDF, for the operator checking it. Never cached. */

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  let email: string;
  try {
    email = (await requireOwner()).email;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: 'Not allowed.' }, { status: 403 });
    }
    throw err;
  }
  if (!isOperatorEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Not allowed.' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const pdf = await readPdf(id);
  if (!pdf) return NextResponse.json({ ok: false, error: 'No PDF waiting.' }, { status: 404 });
  return new Response(new Uint8Array(pdf.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${pdf.name.replace(/[^\w.-]/g, '_')}"`,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
