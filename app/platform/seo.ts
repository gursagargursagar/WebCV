/** WebCV's public address, for canonical links and structured data. */
export function platformUrl(path = ''): string {
  const origin = process.env.OPB_SITE_URL?.trim().replace(/\/$/, '') || 'https://www.webcv.au';
  return `${origin}${path}`;
}

/** Who WebCV is, for search engines: one definition used on every platform page. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': platformUrl('/#organization'),
    name: 'WebCV',
    url: platformUrl('/'),
    logo: platformUrl('/brand/webcv-logo.png'),
    areaServed: 'AU',
  };
}
