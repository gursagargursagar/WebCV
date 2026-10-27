/**
 * What a declaration costs, as the Swiss Cheese AI council set it
 * (debate ef03933d, 27 Oct 2026): A$19, A$15 for the first hundred approved,
 * A$9 to declare again after a change or to renew a licence claim.
 *
 * WebCV charges for preparing the text, checking the document and showing the
 * badge; making the declaration in myGov is free, and every screen says so.
 */

export const PRICE_CENTS = 1900;
export const FOUNDING_PRICE_CENTS = 1500;
export const FOUNDING_LIMIT = 100;
export const REDECLARE_PRICE_CENTS = 900;

export type PriceKind = 'standard' | 'founding' | 'redeclare';

export function priceFor(input: {
  /** Approved declarations this portfolio already has. */
  approvedForSite: number;
  /** Approved declarations across WebCV, for the founding offer. */
  approvedTotal: number;
}): { cents: number; kind: PriceKind } {
  if (input.approvedForSite > 0) return { cents: REDECLARE_PRICE_CENTS, kind: 'redeclare' };
  if (input.approvedTotal < FOUNDING_LIMIT)
    return { cents: FOUNDING_PRICE_CENTS, kind: 'founding' };
  return { cents: PRICE_CENTS, kind: 'standard' };
}

export function formatAud(cents: number): string {
  return `A$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}
