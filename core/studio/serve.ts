import type { Metadata } from 'next';
import { pageHasHeading, summaries } from './design';
import type { StudioMeta, StudioPage, StudioSite } from './types';

/** The page at a path inside a Studio site: `[]` is home, `['about']` is About. */
export function pageAt(site: StudioSite, path: string[] | undefined): StudioPage | null {
  const segments = (path ?? []).filter(Boolean);
  if (segments.length > 1) return null;
  const slug = segments[0] ? decodeURIComponent(segments[0]).toLowerCase() : '';
  return site.pages.find((p) => p.slug === slug) ?? null;
}

export function metaFor(
  site: StudioSite,
  page: StudioPage,
  base: string,
  contactEndpoint: string | null
): StudioMeta {
  return {
    design: site.design,
    pages: summaries(site),
    pageId: page.id,
    hasHeading: pageHasHeading(page),
    hrefFor: (slug) => (slug ? `${base}/${slug}` : base || '/'),
    contactEndpoint,
  };
}

function firstImage(page: StudioPage): string | undefined {
  if (page.cover) return page.cover;
  for (const item of page.data.content ?? []) {
    const props = item.props as Record<string, unknown>;
    if (typeof props.src === 'string' && props.src) return props.src;
  }
  return undefined;
}

/** Title, description and sharing card for a published Studio page. */
export function studioMetadata(site: StudioSite, page: StudioPage, url: string): Metadata {
  const name = site.design.siteName || 'Portfolio';
  const title =
    page.slug === ''
      ? site.design.tagline
        ? `${name} — ${site.design.tagline}`
        : name
      : `${page.title} — ${name}`;
  const description =
    (page.kind === 'project' ? page.subtitle : undefined) ||
    site.design.tagline ||
    `${name}’s portfolio`;
  const image = firstImage(page);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: name,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description },
  };
}
