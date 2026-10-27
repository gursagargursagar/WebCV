import '@/core/studio/site.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { currentSite } from '@/core/site/tenant';
import { StudioPageView } from '@/core/studio/render';
import { metaFor, pageAt, studioMetadata } from '@/core/studio/serve';
import { readStudio } from '@/core/studio/store';
import { looksLikeStarter } from '@/core/studio/starters';
import { JsonLd } from '@/core/content/json-ld-script';
import type { StudioPage, StudioSite } from '@/core/studio/types';

/**
 * Who the portfolio belongs to, for search engines: the home page is the
 * person's profile, every other page is their work. This is what lets a search
 * for someone's name find their portfolio.
 */
function portfolioJsonLd(site: string, studio: StudioSite, page: StudioPage) {
  const home = `${origin()}/${site}`;
  const url = page.slug ? `${home}/${page.slug}` : home;
  const person = {
    '@type': 'Person',
    '@id': `${home}#person`,
    name: studio.design.siteName || site,
    url: home,
    description: studio.design.tagline || undefined,
  };
  if (!page.slug) {
    return { '@context': 'https://schema.org', '@type': 'ProfilePage', url, mainEntity: person };
  }
  return {
    '@context': 'https://schema.org',
    '@type': page.kind === 'project' ? 'CreativeWork' : 'WebPage',
    name: page.title,
    url,
    description: page.subtitle || undefined,
    author: person,
    image: page.cover && /^https:/.test(page.cover) ? page.cover : undefined,
  };
}

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
  const meta = studioMetadata(
    studio,
    page,
    `${origin()}/${site}${page.slug ? `/${page.slug}` : ''}`
  );
  // Still the starter's sample content: identical on every such site, so keep
  // it out of search results until the owner makes it theirs.
  if (looksLikeStarter(studio.pages.map((p) => p.slug)))
    meta.robots = { index: false, follow: true };
  return meta;
}

export default async function StudioPublicPage({ params }: Params) {
  const found = await load((await params).path);
  if (!found) notFound();
  const { site, studio, page } = found;
  return (
    <>
      <JsonLd data={portfolioJsonLd(site, studio, page)} />
      <StudioPageView
        data={page.data}
        meta={metaFor(studio, page, `/${site}`, `/${site}/api/contact`)}
      />
    </>
  );
}
