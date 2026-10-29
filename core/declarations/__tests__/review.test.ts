import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Approving a declaration after the review record failed to save once: the
 * card was charged on the first try, so a retry must approve, never lapse.
 */

const store = vi.hoisted(() => ({
  getDeclaration: vi.fn(),
  finishReview: vi.fn(),
  markSubmitted: vi.fn(),
}));
const stripe = vi.hoisted(() => ({
  capturePayment: vi.fn(),
  retrievePayment: vi.fn(),
  cancelPayment: vi.fn(),
  retrieveCheckout: vi.fn(),
}));

vi.mock('../store', () => store);
vi.mock('@/core/auth/guard', () => ({ requireOwner: vi.fn() }));
vi.mock('@/core/payments/stripe', async () => {
  const actual =
    await vi.importActual<typeof import('@/core/payments/stripe')>('@/core/payments/stripe');
  return { ...actual, ...stripe };
});

const { approveDeclaration, syncCheckout } = await import('../service');
const { StripeError } = await import('@/core/payments/stripe');

const submitted = { id: 'd1', status: 'submitted', paymentId: 'pi_1', priceCents: 1900 };

beforeEach(() => {
  vi.clearAllMocks();
  store.getDeclaration.mockResolvedValue(submitted);
});

describe('approveDeclaration', () => {
  it('approves when a second capture finds the payment already taken', async () => {
    stripe.capturePayment.mockRejectedValue(
      new StripeError(
        'This PaymentIntent has already been captured.',
        'payment_intent_unexpected_state'
      )
    );
    stripe.retrievePayment.mockResolvedValue({ id: 'pi_1', status: 'succeeded', amount: 1900 });

    const outcome = await approveDeclaration('d1', 'op@example.com', 'REF', '2026-10-01');

    expect(outcome).toEqual({ ok: true, status: 'approved' });
    expect(store.finishReview).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ status: 'approved' }),
      'op@example.com'
    );
  });

  it('lapses when the hold was cancelled by expiry', async () => {
    stripe.capturePayment.mockRejectedValue(
      new StripeError('Unexpected state.', 'payment_intent_unexpected_state')
    );
    stripe.retrievePayment.mockResolvedValue({ id: 'pi_1', status: 'canceled', amount: 1900 });

    const outcome = await approveDeclaration('d1', 'op@example.com', 'REF', '2026-10-01');

    expect(outcome).toEqual({ ok: true, status: 'lapsed' });
  });

  it('reports an error, and changes nothing, when Stripe cannot say what happened', async () => {
    stripe.capturePayment.mockRejectedValue(
      new StripeError('Unexpected state.', 'payment_intent_unexpected_state')
    );
    stripe.retrievePayment.mockRejectedValue(new StripeError('Could not reach Stripe.', 'network'));

    const outcome = await approveDeclaration('d1', 'op@example.com', 'REF', '2026-10-01');

    expect(outcome.ok).toBe(false);
    expect(store.finishReview).not.toHaveBeenCalled();
  });
});

describe('syncCheckout', () => {
  it('dates the review window from when the card was held', async () => {
    const ready = { id: 'd1', status: 'ready', checkoutId: 'cs_1', priceCents: 1900 };
    stripe.retrieveCheckout.mockResolvedValue({
      id: 'cs_1',
      client_reference_id: 'd1',
      payment_intent: {
        id: 'pi_1',
        status: 'requires_capture',
        amount: 1900,
        created: 1_790_000_000,
      },
    });

    await syncCheckout(ready as never);

    expect(store.markSubmitted).toHaveBeenCalledWith('d1', 'pi_1', new Date(1_790_000_000_000));
  });
});
