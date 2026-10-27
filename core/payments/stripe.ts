import 'server-only';

/**
 * The few Stripe calls WebCV makes, over its REST API.
 *
 * A card hold rather than a charge: Checkout authorises the amount with
 * manual capture, an operator's approval captures it, and a rejection cancels
 * it — so a declaration that is turned down never needs a refund. Card holds
 * lapse after about seven days, which is the review window.
 *
 * Configured by `STRIPE_SECRET_KEY` (a test key while trying it out, a live one
 * to take money). Without it, nothing here runs and the screens say payments
 * are not switched on.
 */

export class StripeError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function stripeTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.trim().startsWith('sk_test_') ?? false;
}

function base(): string {
  // Overridable so tests can stand in for Stripe.
  return (process.env.STRIPE_API_BASE || 'https://api.stripe.com').replace(/\/$/, '');
}

/** Stripe's form encoding: nested keys as `a[b][c]`. */
export function formEncode(params: Record<string, unknown>, prefix = ''): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === 'object')
          parts.push(...formEncode(item as Record<string, unknown>, `${name}[${i}]`));
        else
          parts.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof value === 'object') {
      parts.push(...formEncode(value as Record<string, unknown>, name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function call<T>(
  method: 'GET' | 'POST',
  path: string,
  params: Record<string, unknown> = {},
  idempotencyKey?: string
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new StripeError('Payments are not switched on.');
  const body = formEncode(params).join('&');
  const url = method === 'GET' && body ? `${base()}${path}?${body}` : `${base()}${path}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  if (method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? body : undefined,
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    });
  } catch {
    // Unreachable or timed out: one error type, so every caller handles it.
    throw new StripeError('Could not reach Stripe.', 'network');
  }
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  } & T;
  if (!res.ok) {
    throw new StripeError(
      json.error?.message || `Stripe answered ${res.status}.`,
      json.error?.code
    );
  }
  return json;
}

export interface PaymentIntent {
  id: string;
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'requires_capture'
    | 'canceled'
    | 'succeeded';
  amount: number;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  status: 'open' | 'complete' | 'expired' | null;
  client_reference_id: string | null;
  metadata?: Record<string, string>;
  payment_intent: PaymentIntent | string | null;
}

/** A Checkout page that authorises `cents` on a card without taking it. */
export function createHoldCheckout(input: {
  reference: string;
  site: string;
  email: string;
  cents: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  return call<CheckoutSession>(
    'POST',
    '/v1/checkout/sessions',
    {
      mode: 'payment',
      // Only cards can be held and captured later.
      payment_method_types: ['card'],
      customer_email: input.email,
      client_reference_id: input.reference,
      metadata: { declaration: input.reference, site: input.site },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'aud',
            unit_amount: input.cents,
            product_data: process.env.STRIPE_DECLARATION_PRODUCT
              ? undefined
              : { name: 'Statutory declaration badge (WebCV)' },
            product: process.env.STRIPE_DECLARATION_PRODUCT || undefined,
          },
        },
      ],
      payment_intent_data: {
        capture_method: 'manual',
        description: input.description,
        statement_descriptor_suffix: 'WEBCV',
        metadata: { declaration: input.reference, site: input.site },
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }
    // No idempotency key: a second attempt after backing out of Checkout
    // should get a fresh page, and an unused one simply expires.
  );
}

export function retrieveCheckout(id: string): Promise<CheckoutSession> {
  return call<CheckoutSession>('GET', `/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    expand: ['payment_intent'],
  });
}

export function capturePayment(id: string): Promise<PaymentIntent> {
  return call<PaymentIntent>(
    'POST',
    `/v1/payment_intents/${encodeURIComponent(id)}/capture`,
    {},
    `capture-${id}`
  );
}

export function cancelPayment(id: string): Promise<PaymentIntent> {
  return call<PaymentIntent>(
    'POST',
    `/v1/payment_intents/${encodeURIComponent(id)}/cancel`,
    {},
    `cancel-${id}`
  );
}
