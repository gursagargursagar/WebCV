import 'server-only';
import { declaredLink } from './badge';

/** The declaration link under a classic portfolio's footer. */
export async function DeclaredBadge({ site }: { site: string | null }) {
  if (!site) return null;
  const link = await declaredLink(site);
  if (!link) return null;
  return (
    <p className="m-0 px-6 pb-6 text-center text-sm text-text-secondary">
      <a href={link.href} className="underline underline-offset-4">
        {link.label}
      </a>
    </p>
  );
}
