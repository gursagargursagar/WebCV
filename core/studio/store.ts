import 'server-only';
import type { Data } from '@puckeditor/core';
import { getStorageAdapter } from '@/core/storage/registry';
import { BLOCK_INFO } from './blocks';
import { FONT_PAIRS, TEMPLATES } from './design';
import type { StudioPage, StudioSite } from './types';

/**
 * Where a Studio site is kept: two records per portfolio, `draft` (what the
 * editor autosaves) and `published` (what visitors get), in the records
 * collection every storage backend already has. The draft carries a revision,
 * so a second tab cannot silently overwrite the first.
 */

const COLLECTION = 'studio';
export type StudioChannel = 'draft' | 'published';

/** Generous for a portfolio; a page full of pasted data URLs is not one. */
export const MAX_SITE_BYTES = 1_500_000;

export async function readStudio(
  channel: StudioChannel
): Promise<{ site: StudioSite; revision: number; updatedAt: string } | null> {
  const adapter = await getStorageAdapter();
  const record = await adapter.records.get(COLLECTION, channel);
  if (!record) return null;
  const site = parseSite(record.data);
  if (!site) return null;
  return { site, revision: record.revision, updatedAt: record.updatedAt };
}

/** Throws `RevisionConflictError` when the draft moved on since `expectedRevision`. */
export async function writeDraft(site: StudioSite, expectedRevision: number): Promise<number> {
  const adapter = await getStorageAdapter();
  const record = await adapter.records.put(COLLECTION, 'draft', site, expectedRevision);
  return record.revision;
}

export async function publishDraft(): Promise<StudioSite | null> {
  const draft = await readStudio('draft');
  if (!draft) return null;
  const adapter = await getStorageAdapter();
  await adapter.records.put(COLLECTION, 'published', draft.site);
  return draft.site;
}

export async function unpublish(): Promise<void> {
  const adapter = await getStorageAdapter();
  await adapter.records.remove(COLLECTION, 'published');
}

/* ------------------------------------------------------------ validation */

const BLOCK_TYPES = new Set<string>(BLOCK_INFO.map((b) => b.type));
const TEMPLATE_IDS = new Set<string>(TEMPLATES.map((t) => t.id));
const FONT_IDS = new Set<string>(FONT_PAIRS.map((f) => f.id));
const SLUG = /^(?:[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?)?$/;

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function parseData(value: unknown): Data | null {
  if (!value || typeof value !== 'object') return null;
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length > 300) return null;
  const blocks = content.filter(
    (item): item is { type: string; props: Record<string, unknown> } =>
      Boolean(item) &&
      typeof item === 'object' &&
      BLOCK_TYPES.has((item as { type?: unknown }).type as string) &&
      Boolean((item as { props?: unknown }).props) &&
      typeof (item as { props?: unknown }).props === 'object'
  );
  return {
    root: { props: {} },
    content: blocks.map((b) => ({
      type: b.type,
      props: {
        ...b.props,
        id: str(b.props.id, 80) || `${b.type}-${Math.random().toString(36).slice(2)}`,
      },
    })),
  };
}

/**
 * A site as the editor sent it, or null if it is not one.
 *
 * Shapes and enumerations are checked here; the values inside blocks are not,
 * because the blocks render every one of them as text and pass every address
 * through `safeHref`/`safeSrc` — there is no prop that reaches the page as
 * markup.
 */
export function parseSite(input: unknown): StudioSite | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as { design?: Record<string, unknown>; pages?: unknown };
  const design = raw.design ?? {};
  if (!Array.isArray(raw.pages) || raw.pages.length === 0 || raw.pages.length > 120) return null;

  const pages: StudioPage[] = [];
  const slugs = new Set<string>();
  for (const value of raw.pages) {
    if (!value || typeof value !== 'object') return null;
    const p = value as Record<string, unknown>;
    const slug = str(p.slug, 48);
    if (!SLUG.test(slug) || slugs.has(slug)) return null;
    slugs.add(slug);
    const data = parseData(p.data);
    if (!data) return null;
    pages.push({
      id: str(p.id, 64) || `pg-${pages.length}`,
      kind: p.kind === 'project' ? 'project' : 'page',
      title: str(p.title, 120),
      slug,
      inNav: p.inNav !== false,
      subtitle: str(p.subtitle, 200) || undefined,
      cover: str(p.cover, 2000) || undefined,
      year: str(p.year, 20) || undefined,
      data,
    });
  }

  // The home page is the one with no address, and it comes first.
  const home = pages.findIndex((p) => p.slug === '');
  if (home === -1) return null;
  if (home > 0) pages.unshift(...pages.splice(home, 1));
  pages[0].kind = 'page';

  const template = String(design.template);
  const fonts = String(design.fonts);
  return {
    version: 1,
    design: {
      template: (TEMPLATE_IDS.has(template)
        ? template
        : 'atelier') as StudioSite['design']['template'],
      mode: design.mode === 'dark' ? 'dark' : 'light',
      accent: /^#[0-9a-f]{6}$/i.test(String(design.accent)) ? String(design.accent) : '#1f6feb',
      fonts: (FONT_IDS.has(fonts) ? fonts : 'modern') as StudioSite['design']['fonts'],
      siteName: str(design.siteName, 80),
      tagline: str(design.tagline, 160),
    },
    pages,
  };
}
