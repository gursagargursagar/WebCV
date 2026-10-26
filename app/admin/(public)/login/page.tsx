import type { Metadata } from 'next';
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

  // WebCV: passkeys need to know which portfolio this browser signs in to,
  // and an emailed code needs a mail server. Offer neither when it would fail.
  const multi = isMultiSite();
  const showPasskey = !multi || Boolean(await currentSite());
  const showEmailCode = !multi || resolveTransport().kind !== 'none';

  return (
    <LoginForm
      showPasskey={showPasskey}
      showEmailCode={showEmailCode}
      // WebCV owners land in the Studio, where their site is.
      next={safeNext(next) ?? (multi ? '/admin/studio' : undefined)}
      demoHint={isDemoMode() ? `Demo — sign in with ${DEMO_EMAIL} and ${DEMO_PASSPHRASE}.` : null}
    />
  );
}
