import { getOwnerSession } from '@/core/auth/guard';
import { currentSite } from '@/core/site/tenant';
import { openDeclaration } from '@/core/declarations/store';
import { syncCheckout } from '@/core/declarations/service';

/**
 * Where Stripe Checkout sends the owner back to.
 *
 * Arriving from stripe.com is a cross-site navigation, which the admin's
 * same-origin check rightly refuses — so this answers with a page that moves
 * on to the admin itself, a same-origin step. On the way it asks Stripe
 * whether the card was held; that only reads Stripe's record of the payment,
 * so it needs a session but not the same-origin check.
 */

export const dynamic = 'force-dynamic';

function onward(note: string): Response {
  const target = `/admin/declaration${note ? `?${note}` : ''}`;
  const html = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${target}"><title>Back to WebCV</title><p style="font:16px system-ui;padding:24px"><a href="${target}">Back to your declaration</a></p>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('cancelled')) return onward('checkout=cancelled');

  const session = await getOwnerSession();
  const site = await currentSite();
  if (session && site) {
    const open = await openDeclaration(site);
    if (open && open.id === url.searchParams.get('d')) await syncCheckout(open);
  }
  return onward('');
}
