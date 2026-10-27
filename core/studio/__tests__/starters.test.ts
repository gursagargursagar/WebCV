import { describe, expect, it } from 'vitest';
import { looksLikeStarter, starterSite } from '../starters';
import { parseSite } from '../store';

describe('starter sites', () => {
  it('are recognised while they still carry the sample projects', () => {
    const site = starterSite('atelier', 'Riley');
    expect(looksLikeStarter(site.pages.map((p) => p.slug))).toBe(true);
  });

  it('stop counting as starters once the projects are the owner’s own', () => {
    expect(looksLikeStarter(['', 'about', 'contact', 'bridge-retrofit', 'solar-car'])).toBe(false);
  });

  it('produce a site the server accepts', () => {
    for (const template of ['atelier', 'gallery', 'journal', 'bold', 'grid', 'swiss'] as const) {
      const parsed = parseSite(JSON.parse(JSON.stringify(starterSite(template, 'Riley'))));
      expect(parsed?.pages[0].slug).toBe('');
      expect(parsed?.design.template).toBe(template);
    }
  });
});
