import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getContentForChannel } from '@/core/content/read';
import { currentSite } from '@/core/site/tenant';
import { readStudio } from '@/core/studio/store';
import { ALL_FONT_VARIABLES } from '@/core/theme/fonts';
import { StudioLoader } from './_editor/loader';

export const metadata: Metadata = { title: 'Edit your site' };
export const dynamic = 'force-dynamic';

/**
 * The Studio: the portfolio, edited where it stands.
 *
 * The server hands the client its draft and what is live; everything after
 * that is the client island talking to `/api/admin/studio`. A portfolio with
 * no Studio draft yet starts at the template picker.
 */
export default async function StudioPage() {
  const [draft, published, content, slug, h] = await Promise.all([
    readStudio('draft'),
    readStudio('published'),
    getContentForChannel('draft'),
    currentSite(),
    headers(),
  ]);

  const origin =
    process.env.OPB_SITE_URL?.trim().replace(/\/$/, '') ||
    `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host') ?? 'www.webcv.au'}`;
  const site = slug ?? '';
  const name = content.settings?.fullName?.trim() ?? '';

  return (
    <StudioLoader
      initial={draft?.site ?? null}
      revision={draft?.revision ?? 0}
      published={published?.site ?? null}
      slug={site}
      siteUrl={site ? `${origin}/${site}` : origin}
      defaultName={name && !/^your name$/i.test(name) ? name : ''}
      fontClass={ALL_FONT_VARIABLES}
    />
  );
}
