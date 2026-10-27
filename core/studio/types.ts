import type { ComponentType } from 'react';
import type { Data } from '@puckeditor/core';

/**
 * The Studio's document: one portfolio, every page of it, and its look.
 *
 * Modelled on how Adobe Portfolio thinks about a site rather than on the
 * classic CMS: a site is a template plus a few design choices, a handful of
 * pages, and projects — pages that also appear as cards in a project grid.
 * Each page's body is a Puck document, so the editor and the published site
 * render the same blocks from the same data.
 */

export type TemplateId = 'atelier' | 'gallery' | 'journal' | 'bold' | 'grid' | 'swiss';
export type FontPairId = 'modern' | 'grotesk' | 'editorial' | 'classic' | 'mono' | 'display';

export interface StudioDesign {
  template: TemplateId;
  mode: 'light' | 'dark';
  accent: string;
  fonts: FontPairId;
  siteName: string;
  tagline: string;
}

export interface StudioPage {
  id: string;
  kind: 'page' | 'project';
  /** The navigation label, and a project's title on its card and its page. */
  title: string;
  /** `''` is the home page, which is always first and cannot be removed. */
  slug: string;
  inNav: boolean;
  subtitle?: string;
  cover?: string;
  year?: string;
  data: Data;
}

export interface StudioSite {
  version: 1;
  design: StudioDesign;
  pages: StudioPage[];
}

/** What a page needs to know about the other pages: links and project cards. */
export type PageSummary = Omit<StudioPage, 'data'>;

/**
 * Editor-only abilities, handed to the blocks through Puck metadata.
 *
 * Absent on the published site, so a block that renders one of these renders
 * nothing extra there — and the published page never ships the editor.
 */
export interface StudioEditHooks {
  setDesign(patch: Partial<StudioDesign>): void;
  updatePage(id: string, patch: Partial<Omit<StudioPage, 'id' | 'data'>>): void;
  openPage(id: string): void;
  Text: ComponentType<{
    value: string;
    onCommit(value: string): void;
    placeholder: string;
    label: string;
    multiline?: boolean;
  }>;
  ImageTools: ComponentType<{ blockId: string; prop: string; label?: string }>;
  CoverTools: ComponentType<{ pageId: string }>;
  /** A button inside a block that opens another page in the editor. */
  OpenButton: ComponentType<{ pageId: string; label: string }>;
}

export interface StudioMeta {
  design: StudioDesign;
  pages: PageSummary[];
  pageId: string;
  /** Whether the page's own blocks give it a top-level heading (an Intro does). */
  hasHeading: boolean;
  /** Where a page lives: `/<site>/<slug>` published, a no-op in the editor. */
  hrefFor(slug: string): string;
  /** Where the Contact block posts; null where messages cannot be sent (previews). */
  contactEndpoint: string | null;
  /**
   * A picture of a page shown inside another page (template previews): its
   * headings render as plain text, so the host page keeps one outline and
   * search engines do not read sample headlines as the host's own.
   */
  decorative?: boolean;
  /** An approved statutory declaration: a link to it in the footer. */
  declared?: { href: string; label: string };
  edit?: StudioEditHooks;
}
