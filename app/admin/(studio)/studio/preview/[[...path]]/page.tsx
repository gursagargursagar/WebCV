import '@/core/studio/site.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudioPageView } from '@/core/studio/render';
import { metaFor, pageAt } from '@/core/studio/serve';
import { readStudio } from '@/core/studio/store';

export const metadata: Metadata = { title: 'Preview' };
export const dynamic = 'force-dynamic';

/**
 * The saved draft, rendered by the same code as the live site, for the
 * Studio's Preview. Links stay inside the preview; the contact form is shown
 * but cannot send.
 */
export default async function StudioPreviewPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const draft = await readStudio('draft');
  if (!draft) notFound();
  const page = pageAt(draft.site, (await params).path);
  if (!page) notFound();
  return (
    <StudioPageView
      data={page.data}
      meta={metaFor(draft.site, page, '/admin/studio/preview', null)}
    />
  );
}
