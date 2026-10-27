import type { MetadataRoute } from 'next';
import { getPublishedContent } from '@/core/content/read';
import { resolveSiteUrl } from '@/core/content/metadata';
import { isMultiSite } from '@/core/site/constants';

export default async function robots(): Promise<MetadataRoute.Robots> {
  // WebCV: one robots.txt for the whole domain. Crawlers only ever read the
  // root one, so it speaks for every portfolio under it as well.
  if (isMultiSite()) {
    const origin = process.env.OPB_SITE_URL?.trim().replace(/\/$/, '') || 'https://www.webcv.au';
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/wcs-render'],
      },
      sitemap: `${origin}/sitemap.xml`,
      host: origin,
    };
  }

  const content = await getPublishedContent();
  const siteUrl = resolveSiteUrl(content);

  // The `robots` field is free text in the admin; honour an explicit noindex
  // rather than quietly publishing a site somebody marked as private.
  const disallowAll = /noindex/i.test(content.seo.robots || '');

  return {
    rules: disallowAll
      ? { userAgent: '*', disallow: '/' }
      : { userAgent: '*', allow: '/', disallow: ['/admin', '/admin/'] },
    sitemap: siteUrl ? `${siteUrl}/sitemap.xml` : undefined,
  };
}

export const dynamic = 'force-dynamic';
