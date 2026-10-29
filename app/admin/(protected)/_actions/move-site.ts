'use server';

import { requireOwner } from '@/core/auth/guard';
import { requireSite } from '@/core/site/tenant';
import { heldAddressFor, moveToHeldAddress, SiteMoveError } from '@/core/site/move';

/**
 * Moves the signed-in owner's portfolio to the address held for them. Checks
 * the session itself; the email that decides it comes from that session.
 */
export async function moveToHeldAddressAction(): Promise<
  { ok: true; slug: string } | { ok: false; error: string }
> {
  const session = await requireOwner();
  const site = await requireSite();
  const to = await heldAddressFor(session.email, site);
  if (!to) return { ok: false, error: 'There is no address waiting for this account.' };
  try {
    await moveToHeldAddress(site, session.email, to);
  } catch (err) {
    if (err instanceof SiteMoveError) return { ok: false, error: err.message };
    throw err;
  }
  return { ok: true, slug: to };
}
