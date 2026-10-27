import '@/core/studio/site.css';
import '../example.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudioPageView } from '@/core/studio/render';
import { metaFor, pageAt, studioMetadata } from '@/core/studio/serve';
import { EXAMPLE_NAME, EXAMPLE_SLUG, exampleSite } from '@/core/platform/example-site';

/**
 * The example portfolio, at `/example/<page>` (the proxy rewrites it here).
 *
 * A fictional person's site, written in code: it shows what WebCV makes
 * without putting anyone's real details on display. Said plainly on every
 * page, and kept out of search results.
 */

export const dynamic = 'force-static';

const site = exampleSite();
const base = `/${EXAMPLE_SLUG}`;

type Params = { params: Promise<{ path?: string[] }> };

export function generateStaticParams() {
  return site.pages.map((p) => ({ path: p.slug ? [p.slug] : [] }));
}

function origin(): string {
  return process.env.OPB_SITE_URL?.trim().replace(/\/$/, '') || 'https://www.webcv.au';
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = pageAt(site, (await params).path);
  if (!page) return { title: 'Not found' };
  const meta = studioMetadata(site, page, `${origin()}${base}${page.slug ? `/${page.slug}` : ''}`);
  return {
    ...meta,
    title: `${typeof meta.title === 'string' ? meta.title : EXAMPLE_NAME} (example)`,
    // A made-up person: never a search result.
    robots: { index: false, follow: true },
  };
}

export default async function ExamplePage({ params }: Params) {
  const page = pageAt(site, (await params).path);
  if (!page) notFound();
  return (
    <>
      <aside className="wcx-banner" aria-label="About this example">
        <p>
          <strong>Example portfolio.</strong> {EXAMPLE_NAME} is a fictional person, the projects are
          invented, and it is not affiliated with Apple.
        </p>
        <a href="/signup">Make yours, free</a>
      </aside>
      <StudioPageView data={page.data} meta={metaFor(site, page, base, null)} />
    </>
  );
}
