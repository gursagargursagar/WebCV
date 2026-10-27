import type { Data } from '@puckeditor/core';
import { newId } from '@/core/studio/design';
import type { StudioDesign, StudioPage, StudioSite } from '@/core/studio/types';

/**
 * A Studio site from plain data: pages and projects as lists of blocks.
 *
 * Used for portfolios that started life outside WebCV (converted once, by a
 * script, into JSON) and for sites written in code, such as the example
 * portfolio. Ids are minted here so the data stays readable.
 */

export interface PlainBlock {
  type: string;
  props: Record<string, unknown>;
}

export interface PlainPage {
  title: string;
  slug: string;
  inNav?: boolean;
  blocks: PlainBlock[];
}

export interface PlainProject {
  title: string;
  slug: string;
  subtitle?: string;
  year?: string;
  cover?: string;
  blocks: PlainBlock[];
}

export interface PlainSite {
  design: StudioDesign;
  pages: PlainPage[];
  projects: PlainProject[];
}

function data(blocks: PlainBlock[]): Data {
  return {
    root: { props: {} },
    content: blocks.map((block) => ({
      type: block.type,
      props: { ...block.props, id: `${block.type}-${newId('b').slice(2)}` },
    })),
  };
}

export function buildSite(plain: PlainSite): StudioSite {
  const pages: StudioPage[] = plain.pages.map((p) => ({
    id: newId('pg'),
    kind: 'page',
    title: p.title,
    slug: p.slug,
    inNav: p.inNav ?? true,
    data: data(p.blocks),
  }));
  const projects: StudioPage[] = plain.projects.map((p) => ({
    id: newId('pg'),
    kind: 'project',
    title: p.title,
    slug: p.slug,
    inNav: false,
    subtitle: p.subtitle,
    year: p.year,
    cover: p.cover,
    data: data(p.blocks),
  }));
  // Home first, then the projects (the grid's order), then the other pages.
  const [home, ...rest] = pages;
  return { version: 1, design: plain.design, pages: [home, ...projects, ...rest] };
}
