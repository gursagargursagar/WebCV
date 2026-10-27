import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getOwnerSession } from '@/core/auth/guard';
import { DEMO_EMAIL, DEMO_PASSPHRASE, isDemoMode } from '@/core/demo/config';
import { LoginForm } from './login-form';
import { isMultiSite } from '@/core/site/constants';
import { currentSite } from '@/core/site/tenant';
import { resolveTransport } from '@/core/email/transport';

// Request-time by nature (Cache Components may block here). Reads the address (`?next=`) and the session per request.
// (`instant = false` removed: WebCV runs without Cache Components.)

export const metadata: Metadata = { title: 'Sign in' };

/**
 * Where to land once this succeeds. The proxy writes `?next=` when it turns a
 * deep link away, but a crafted link could write it too — and "redirect to
 * wherever the query says" is how an open redirect gets born. Only paths
 * inside the admin pass.
 */
function safeNext(next: string | undefined): string | undefined {
  if (!next || next.length > 300) return undefined;
  return /^\/admin(\/|$)/.test(next) ? next : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const multi = isMultiSite();
  const destination = safeNext(next) ?? (multi ? '/admin/studio' : '/admin');

  // Already signed in to this portfolio: skip the form. A cookie that is
  // present but no longer valid falls through to it instead.
  if (await getOwnerSession()) redirect(destination);

  // WebCV: passkeys need to know which portfolio this browser signs in to,
  // and an emailed code needs a mail server. Offer neither when it would fail.
  const showPasskey = !multi || Boolean(await currentSite());
  const showEmailCode = !multi || resolveTransport().kind !== 'none';

  return (
    <LoginForm
      showPasskey={showPasskey}
      showEmailCode={showEmailCode}
      // WebCV owners land in the Studio, where their site is.
      next={destination}
      demoHint={isDemoMode() ? `Demo — sign in with ${DEMO_EMAIL} and ${DEMO_PASSPHRASE}.` : null}
    />
  );
}
