'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/core/auth/guard';
import { requireSite } from '@/core/site/tenant';
import { checkFacts, checkName } from '@/core/declarations/facts';
import { formatAud, priceFor } from '@/core/declarations/price';
import {
  approvedCounts,
  DeclarationStateError,
  discardDraft,
  liveDeclaration,
  openDeclaration,
  saveFacts,
  setCheckout,
  withdraw,
} from '@/core/declarations/store';
import { extractFacts, ExtractError, type ExtractedFact } from '@/core/declarations/extract';
import { createHoldCheckout, stripeConfigured, StripeError } from '@/core/payments/stripe';

/**
 * The owner's side of a statutory declaration. Every action checks the
 * session itself; the site is the one the owner is signed in to.
 */

export interface DeclarationActionResult {
  ok: boolean;
  error?: string;
  errors?: string[];
}

const PATH = '/admin/declaration';

export async function saveDeclarationFactsAction(input: {
  name: string;
  facts: unknown[];
}): Promise<DeclarationActionResult> {
  await requireOwner();
  const site = await requireSite();
  const name = checkName(input.name);
  const checked = checkFacts(input.facts);
  const errors = [...(name.error ? [name.error] : []), ...checked.errors];
  if (errors.length) return { ok: false, errors };
  try {
    await saveFacts(site, name.name, checked.facts);
  } catch (err) {
    if (err instanceof DeclarationStateError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function extractFactsAction(
  cvText: string
): Promise<{ ok: true; facts: ExtractedFact[] } | { ok: false; error: string }> {
  await requireOwner();
  const site = await requireSite();
  try {
    return { ok: true, facts: await extractFacts(site, String(cvText ?? '')) };
  } catch (err) {
    if (err instanceof ExtractError) return { ok: false, error: err.message };
    throw err;
  }
}

/** Where Stripe sends the owner back to: the configured site, or this request's own origin. */
async function adminOrigin(): Promise<string> {
  const configured = process.env.OPB_SITE_URL?.trim().replace(/\/$/, '');
  if (configured && process.env.NODE_ENV === 'production') return configured;
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return host ? `${proto}://${host}` : (configured ?? 'http://localhost:3000');
}

export async function startCheckoutAction(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const session = await requireOwner();
  const site = await requireSite();
  if (!stripeConfigured()) return { ok: false, error: 'Payments are not switched on yet.' };
  const open = await openDeclaration(site);
  if (!open || open.status !== 'ready') {
    return { ok: false, error: 'Upload your myGov PDF first.' };
  }
  const counts = await approvedCounts(site);
  const price = priceFor({ approvedForSite: counts.site, approvedTotal: counts.total });
  const origin = await adminOrigin();
  const back = `${origin}/api/admin/declaration/return`;
  try {
    const checkout = await createHoldCheckout({
      reference: open.id,
      site,
      email: session.email,
      cents: price.cents,
      description: `WebCV statutory declaration check for webcv.au/${site} (${formatAud(price.cents)})`,
      successUrl: `${back}?d=${encodeURIComponent(open.id)}`,
      cancelUrl: `${back}?cancelled=1`,
    });
    if (!checkout.url) return { ok: false, error: 'Stripe did not return a payment page.' };
    await setCheckout(open.id, checkout.id, price.cents, price.kind);
    return { ok: true, url: checkout.url };
  } catch (err) {
    if (err instanceof StripeError) {
      console.error('[webcv] Could not start Checkout.', err.message);
      return { ok: false, error: 'The payment page could not be opened. Try again in a minute.' };
    }
    throw err;
  }
}

export async function discardDeclarationAction(): Promise<DeclarationActionResult> {
  await requireOwner();
  const site = await requireSite();
  const open = await openDeclaration(site);
  if (open && (open.status === 'draft' || open.status === 'ready')) {
    await discardDraft(site, open.id);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function withdrawDeclarationAction(): Promise<DeclarationActionResult> {
  await requireOwner();
  const site = await requireSite();
  const live = await liveDeclaration(site);
  if (live) await withdraw(site, live.id);
  revalidatePath(PATH);
  return { ok: true };
}
