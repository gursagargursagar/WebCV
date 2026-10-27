import { siteNow } from '@/core/content/now';
import type { MetadataRoute } from 'next';
import { getPublishedContent, getPublishedProjects } from '@/core/content/read';
import { resolveSiteUrl } from '@/core/content/metadata';
import { getIndexablePages } from '@/core/pages/read';
import { getPublicWriting, getWritingSettings } from '@/core/writing/read';
import { isMultiSite } from '@/core/site/constants';
import { currentSite } from '@/core/site/tenant';
import { publishedSites } from '@/core/site/registry';
import { readStudio } from '@/core/studio/store';
import { looksLikeStarter } from '@/core/studio/starters';
import { PLATFORM_PAGES } from '@/core/platform/seo-pages';

function platformOrigin(): string {
  return process.env.OPB_SITE_URL?.trim().replace(/\/$/, '') || 'https://www.webcv.au';
}

/**
 * WebCV's own sitemap, at www.webcv.au/sitemap.xml: the platform's pages and
 * every published portfolio. Search engines learn about a new portfolio from
 * here rather than waiting to stumble on a link to it.
 */
async function platformSitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = platformOrigin();
  const now = new Date();
  const platform: MetadataRoute.Sitemap = [
    { url: origin, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${origin}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ...PLATFORM_PAGES.map((page) => ({
      url: `${origin}${page.path}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${origin}/gursagar24`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  let sites: Awaited<ReturnType<typeof publishedSites>> = [];
  try {
    sites = await publishedSites();
  } catch (err) {
    // No database yet: the platform pages are still worth listing.
    console.warn('[sitemap] Could not list portfolios.', (err as Error).message);
  }

  const portfolios: MetadataRoute.Sitemap = sites.flatMap((site) => {
    if (site.studioSlugs) {
      if (looksLikeStarter(site.studioSlugs)) return [];
      const lastModified = site.studioUpdatedAt ? new Date(site.studioUpdatedAt) : now;
      return site.studioSlugs.map((slug) => ({
        url: slug ? `${origin}/${site.slug}/${slug}` : `${origin}/${site.slug}`,
        lastModified,
        priority: slug ? 0.4 : 0.6,
      }));
    }
    if (site.classicUpdatedAt && !site.classicNoindex) {
      return [
        {
          url: `${origin}/${site.slug}`,
          lastModified: new Date(site.classicUpdatedAt),
          priority: 0.5,
        },
      ];
    }
    return [];
  });

  return [...platform, ...portfolios];
}

/** One portfolio built in the Studio: its pages, under its own address. */
async function studioSitemap(site: string): Promise<MetadataRoute.Sitemap | null> {
  const published = await readStudio('published').catch(() => null);
  if (!published) return null;
  if (looksLikeStarter(published.site.pages.map((p) => p.slug))) return [];
  const origin = platformOrigin();
  const lastModified = new Date(published.updatedAt);
  return published.site.pages.map((page) => ({
    url: page.slug ? `${origin}/${site}/${page.slug}` : `${origin}/${site}`,
    lastModified,
    priority: page.slug ? 0.6 : 1,
  }));
}

/**
 * A sitemap needs absolute URLs, so it can only be generated once the site
 * knows its own address. Until a domain is set in Settings this returns
 * nothing, which is correct — a sitemap full of localhost URLs is worse than
 * no sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isMultiSite()) {
    const site = await currentSite();
    if (!site) return platformSitemap();
    const studio = await studioSitemap(site);
    if (studio) return studio;
  }

  const content = await getPublishedContent();
  const siteUrl = resolveSiteUrl(content);
  if (!siteUrl) return [];

  const lastModified = content.lastPublishedAt
    ? new Date(content.lastPublishedAt)
    : await siteNow();

  const staticRoutes = ['', '/work', '/about', '/contact'].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    priority: path === '' ? 1 : 0.7,
  }));

  const [projects, pages, writingSettings, writing] = await Promise.all([
    // `projects` is the unified work collection. Legacy case studies are folded
    // in by the read layer, so there is one entry per work record and no
    // redirecting `/case-studies/…` URL in the sitemap.
    getPublishedProjects(),
    // Published and not marked noindex. A page the owner deliberately kept out
    // of search results must not be advertised in the sitemap either.
    getIndexablePages(),
    getWritingSettings('published'),
    getPublicWriting('published'),
  ]);

  const writingRoutes = writingSettings.enabled
    ? [
        { url: `${siteUrl}/writing`, lastModified, priority: 0.7 },
        ...writing
          .filter((entry) => !entry.seo.noindex)
          .map((entry) => ({
            url: `${siteUrl}/writing/${entry.slug}`,
            lastModified: new Date(entry.publishedAt ?? entry.updatedAt),
            priority: 0.6,
          })),
      ]
    : [];

  return [
    ...staticRoutes,
    ...writingRoutes,
    ...pages.map((page) => ({
      url: `${siteUrl}/${page.slug}`,
      lastModified: page.updatedAt ? new Date(page.updatedAt) : lastModified,
      priority: 0.6,
    })),
    ...projects.map((p) => ({ url: `${siteUrl}/work/${p.slug}`, lastModified, priority: 0.8 })),
  ];
}

export const dynamic = 'force-dynamic';
