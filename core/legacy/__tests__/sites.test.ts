import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { parseSite } from '@/core/studio/store';
import { gursagar24Site } from '../gursagar24';
import { exampleSite } from '@/core/platform/example-site';
import { claimMatches, heldSeed, isHeldSlug } from '@/core/site/claims';
import { isValidSlug } from '@/core/site/constants';

describe('converted and code-written Studio sites', () => {
  it('turns the hand-built gursagar24 page into a valid Studio site', () => {
    const site = parseSite(gursagar24Site());
    expect(site).not.toBeNull();
    const slugs = site!.pages.map((p) => p.slug);
    expect(slugs[0]).toBe('');
    expect(slugs).toEqual(
      expect.arrayContaining(['patents', 'recommendations', 'ner', 'contact', 'internship'])
    );
    const projects = site!.pages.filter((p) => p.kind === 'project');
    expect(projects.map((p) => p.title)).toContain('Oscillating Attachment (OSCA)');
    // Every picture still comes from the page's own folder.
    for (const p of projects) expect(p.cover).toMatch(/^\/gursagar24\/img\//);
  });

  it('keeps the example portfolio valid and free of real personal details', () => {
    const site = parseSite(exampleSite());
    expect(site).not.toBeNull();
    const text = JSON.stringify(site);
    expect(text).not.toMatch(/gursagar|virdi|@gmail|\b04\d{2} ?\d{3} ?\d{3}\b/i);
    expect(site!.pages.filter((p) => p.kind === 'project').length).toBeGreaterThanOrEqual(3);
  });
});

describe('held addresses', () => {
  const env = process.env.WEBCV_SLUG_CLAIMS;
  afterEach(() => {
    process.env.WEBCV_SLUG_CLAIMS = env;
  });

  it('is a real portfolio address, but sign-up needs its claim code', () => {
    expect(isValidSlug('gursagar24')).toBe(true);
    expect(isHeldSlug('gursagar24')).toBe(true);
    expect(isHeldSlug('someone-else')).toBe(false);

    const code = 'correct horse battery';
    process.env.WEBCV_SLUG_CLAIMS = `gursagar24:${createHash('sha256').update(code).digest('hex')}`;
    expect(claimMatches('gursagar24', code)).toBe(true);
    expect(claimMatches('gursagar24', 'wrong')).toBe(false);
    expect(claimMatches('gursagar24', '')).toBe(false);
    expect(claimMatches('other', code)).toBe(false);
  });

  it('cannot be claimed at all when no code is configured', () => {
    process.env.WEBCV_SLUG_CLAIMS = '';
    expect(claimMatches('gursagar24', 'anything')).toBe(false);
  });

  it('arrives with the converted portfolio as its Studio site', () => {
    expect(heldSeed('gursagar24')?.design.siteName).toBe('Gursagar S. Virdi');
    expect(heldSeed('someone-else')).toBeNull();
  });
});
