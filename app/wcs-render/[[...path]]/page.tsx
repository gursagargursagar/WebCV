import '@/core/studio/site.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { currentSite } from '@/core/site/tenant';
import { StudioPageView } from '@/core/studio/render';
import { metaFor, pageAt, studioMetadata } from '@/core/studio/serve';
import { readStudio } from '@/core/studio/store';

/**
 * A published Studio page, at `/<site>/<page>`.
 *
 * Never reached by that address directly: the proxy rewrites a portfolio's
 * address here when the portfolio has a published Studio site with a page at
 * that path, and to the classic routes otherwise. The site comes from the
 * proxy's header, like every other public page.
 */

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ path?: string[] }> };

async function load(path: string[] | undefined) {
  const site = await currentSite();
  if (!site) return null;
  const published = await readStudio('published');
  if (!published) return null;
  const page = pageAt(published.site, path);
  if (!page) return null;
  return { site, studio: published.site, page };
}

function origin(): string {
  return process.env.OPB_SITE_URL?.trim().replace(/\/$/, '') || 'https://www.webcv.au';
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await load((await params).path);
  if (!found) return { title: 'Not found' };
  const { site, studio, page } = found;
  return studioMetadata(studio, page, `${origin()}/${site}${page.slug ? `/${page.slug}` : ''}`);
}

export default async function StudioPublicPage({ params }: Params) {
  const found = await load((await params).path);
  if (!found) notFound();
  const { site, studio, page } = found;
  return (
    <StudioPageView
      data={page.data}
      meta={metaFor(studio, page, `/${site}`, `/${site}/api/contact`)}
    />
  );
}
