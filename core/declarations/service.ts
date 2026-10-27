import 'server-only';
import { requireOwner } from '@/core/auth/guard';
import {
  cancelPayment,
  capturePayment,
  retrieveCheckout,
  StripeError,
} from '@/core/payments/stripe';
import { finishReview, getDeclaration, markSubmitted, type Declaration } from './store';

/**
 * Who reviews declarations: the WebCV operators, named by the email they sign
 * in to their own portfolio with (`WEBCV_OPERATOR_EMAILS`, comma-separated).
 * The email comes from a valid owner session, never from a header.
 */
export function operatorEmails(): string[] {
  return (process.env.WEBCV_OPERATOR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOperatorEmail(email: string | null | undefined): boolean {
  return Boolean(email) && operatorEmails().includes(email!.trim().toLowerCase());
}

export class NotOperatorError extends Error {
  constructor() {
    super('Only WebCV operators can review declarations.');
    this.name = 'NotOperatorError';
  }
}

/** Throws unless the caller is signed in and is an operator. Returns their email. */
export async function requireOperator(): Promise<string> {
  const session = await requireOwner();
  if (!isOperatorEmail(session.email)) throw new NotOperatorError();
  return session.email;
}

/**
 * Brings a declaration up to date with Stripe: a Checkout that ended in a
 * card hold moves it into the queue. Safe to call any number of times.
 */
export async function syncCheckout(declaration: Declaration): Promise<Declaration> {
  if (declaration.status !== 'ready' || !declaration.checkoutId) return declaration;
  try {
    const session = await retrieveCheckout(declaration.checkoutId);
    const intent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
    if (
      session.client_reference_id === declaration.id &&
      intent?.status === 'requires_capture' &&
      intent.amount === declaration.priceCents
    ) {
      await markSubmitted(declaration.id, intent.id);
      return (await getDeclaration(declaration.id)) ?? declaration;
    }
  } catch (err) {
    if (!(err instanceof StripeError)) throw err;
    console.error('[webcv] Could not check a Checkout session.', err.message);
  }
  return declaration;
}

export type ReviewOutcome =
  { ok: true; status: 'approved' | 'rejected' | 'lapsed' } | { ok: false; error: string };

/** Approve: take the held payment, then publish the badge and delete the PDF. */
export async function approveDeclaration(
  id: string,
  reviewer: string,
  mygovRef: string,
  declaredOn: string
): Promise<ReviewOutcome> {
  const declaration = await getDeclaration(id);
  if (!declaration || declaration.status !== 'submitted' || !declaration.paymentId) {
    return { ok: false, error: 'That declaration is no longer waiting for review.' };
  }
  try {
    const intent = await capturePayment(declaration.paymentId);
    if (intent.status !== 'succeeded') {
      return { ok: false, error: `The payment could not be taken (it is ${intent.status}).` };
    }
  } catch (err) {
    if (!(err instanceof StripeError)) throw err;
    const expired =
      err.code === 'charge_expired_for_capture' || err.code === 'payment_intent_unexpected_state';
    if (!expired) return { ok: false, error: `Stripe said: ${err.message}` };
    // An authorisation that has run out cannot be captured. Nobody was
    // charged; tell the owner to submit again.
    await finishReview(
      id,
      {
        status: 'lapsed',
        reason: 'The card hold expired before the check was finished. You were not charged.',
      },
      reviewer
    );
    return { ok: true, status: 'lapsed' };
  }
  await finishReview(id, { status: 'approved', mygovRef, declaredOn }, reviewer);
  return { ok: true, status: 'approved' };
}

/** Reject: release the hold, delete the PDF, keep the reason for the owner. */
export async function rejectDeclaration(
  id: string,
  reviewer: string,
  reason: string
): Promise<ReviewOutcome> {
  const declaration = await getDeclaration(id);
  if (!declaration || declaration.status !== 'submitted') {
    return { ok: false, error: 'That declaration is no longer waiting for review.' };
  }
  if (declaration.paymentId) {
    try {
      await cancelPayment(declaration.paymentId);
    } catch (err) {
      if (!(err instanceof StripeError)) throw err;
      // Already cancelled or expired: either way nothing was taken.
    }
  }
  await finishReview(id, { status: 'rejected', reason }, reviewer);
  return { ok: true, status: 'rejected' };
}
