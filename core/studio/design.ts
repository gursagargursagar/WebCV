import type { FontPairId, PageSummary, StudioDesign, StudioSite, TemplateId } from './types';

/**
 * Templates, type pairings and accents.
 *
 * A template is a layout and a default palette; the page content never
 * depends on it, which is what lets someone switch template and keep every
 * word and image — the one promise Adobe Portfolio makes that matters most.
 */

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  blurb: string;
  defaults: Pick<StudioDesign, 'mode' | 'accent' | 'fonts'>;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'atelier',
    name: 'Atelier',
    blurb: 'Centred and airy. Titles sit under each project.',
    defaults: { mode: 'light', accent: '#1f6feb', fonts: 'modern' },
  },
  {
    id: 'gallery',
    name: 'Gallery',
    blurb: 'Dark, with a side menu. The work fills the screen.',
    defaults: { mode: 'dark', accent: '#e8c27a', fonts: 'grotesk' },
  },
  {
    id: 'journal',
    name: 'Journal',
    blurb: 'Warm paper and a serif voice, for writers and illustrators.',
    defaults: { mode: 'light', accent: '#b4452f', fonts: 'editorial' },
  },
  {
    id: 'bold',
    name: 'Bold',
    blurb: 'A big name, big type and a colour that owns the page.',
    defaults: { mode: 'light', accent: '#ff4f1f', fonts: 'display' },
  },
  {
    id: 'grid',
    name: 'Grid',
    blurb: 'Tight squares, titles on hover. Minimal and quiet.',
    defaults: { mode: 'light', accent: '#111111', fonts: 'mono' },
  },
  {
    id: 'swiss',
    name: 'Swiss',
    blurb: 'Black, cyan and ruled lines, in the Swiss Cheese manner.',
    defaults: { mode: 'dark', accent: '#20c4dc', fonts: 'classic' },
  },
];

export function templateInfo(id: TemplateId): TemplateInfo {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export interface FontPair {
  id: FontPairId;
  name: string;
  head: string;
  body: string;
}

/** CSS variables the root layout defines for every self-hosted family. */
export const FONT_PAIRS: FontPair[] = [
  { id: 'modern', name: 'Modern', head: 'var(--font-inter)', body: 'var(--font-inter)' },
  {
    id: 'grotesk',
    name: 'Grotesk',
    head: 'var(--font-space-grotesk)',
    body: 'var(--font-dm-sans)',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    head: 'var(--font-fraunces)',
    body: 'var(--font-source-serif-4)',
  },
  { id: 'classic', name: 'Classic', head: 'Georgia, serif', body: 'var(--font-inter)' },
  { id: 'mono', name: 'Mono', head: 'var(--font-geist)', body: 'var(--font-geist)' },
  { id: 'display', name: 'Display', head: 'var(--font-archivo)', body: 'var(--font-archivo)' },
];

export function fontPair(id: FontPairId): FontPair {
  return FONT_PAIRS.find((f) => f.id === id) ?? FONT_PAIRS[0];
}

export const ACCENTS = [
  '#1f6feb',
  '#20c4dc',
  '#10a37f',
  '#e8c27a',
  '#ff4f1f',
  '#b4452f',
  '#c2185b',
  '#7c3aed',
  '#111111',
];

const HEX = /^#[0-9a-f]{6}$/i;

/** Text on the accent: black or white, whichever reads better. */
export function onAccent(hex: string): string {
  if (!HEX.test(hex)) return '#ffffff';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  // Whichever of the two reads better against it (WCAG contrast ratio):
  // a bright orange wants dark text even though it is not a "light" colour.
  const onWhite = 1.05 / (luminance + 0.05);
  const onDark = (luminance + 0.05) / (0.0056 + 0.05);
  return onDark >= onWhite ? '#111111' : '#ffffff';
}

export function safeAccent(hex: string): string {
  return HEX.test(hex) ? hex : '#1f6feb';
}

/** Whether a page's blocks include its top-level heading (the Intro's headline). */
export function pageHasHeading(page: { data: { content?: { type: string }[] } }): boolean {
  return (page.data.content ?? []).some((item) => item.type === 'Hero');
}

export function summaries(site: StudioSite): PageSummary[] {
  return site.pages.map(({ data: _data, ...rest }) => rest);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** A slug no other page has, so two "Untitled" pages do not share an address. */
export function uniqueSlug(site: StudioSite, wanted: string, exceptId?: string): string {
  const base = slugify(wanted) || 'page';
  const taken = new Set(site.pages.filter((p) => p.id !== exceptId).map((p) => p.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
