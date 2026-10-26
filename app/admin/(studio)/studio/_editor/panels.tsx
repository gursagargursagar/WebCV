'use client';

import { useState } from 'react';
import { Drawer, useGetPuck } from '@puckeditor/core';
import { BLOCK_INFO, type StudioBlock } from '@/core/studio/blocks';
import { ACCENTS, FONT_PAIRS, TEMPLATES, templateInfo } from '@/core/studio/design';
import type { StudioDesign, StudioPage, StudioSite, TemplateId } from '@/core/studio/types';
import { BlockIcon } from './icons';
import { TemplateThumb } from './templates';
import { useStudio } from './context';

/* ------------------------------------------------------------------- Add */

const GROUPS = ['Text', 'Media', 'Portfolio', 'Layout'];

/** Puts a block after the selected one (or at the end) and selects it. */
export function useAddBlock() {
  const getPuck = useGetPuck();
  return (type: StudioBlock) => {
    const { appState, dispatch } = getPuck();
    const selected = appState.ui.itemSelector;
    const zone = selected?.zone ?? 'root:default-zone';
    const index = selected ? selected.index + 1 : appState.data.content.length;
    const id = `${type}-${crypto.randomUUID()}`;
    dispatch({
      type: 'insert',
      componentType: type,
      destinationIndex: index,
      destinationZone: zone,
      id,
    });
    dispatch({ type: 'setUi', ui: { itemSelector: { index, zone } } });
    // Bring it into view, so the click visibly did something.
    window.setTimeout(() => {
      const frame = document.getElementById('preview-frame') as HTMLIFrameElement | null;
      frame?.contentDocument
        ?.querySelector(`[data-puck-component="${id}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
  };
}

export function AddPanel() {
  const add = useAddBlock();
  return (
    <div className="grid gap-5">
      <PanelHead
        title="Add a block"
        hint="Click to add it below the selected block, or drag it into place."
      />
      {GROUPS.map((group) => (
        <section key={group} className="grid gap-2" aria-label={group}>
          <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-text-muted">
            {group}
          </p>
          <Drawer>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_INFO.filter((b) => b.group === group).map((block) => (
                // The drag library already makes each item a focusable button;
                // a click, or Enter or Space, adds the block here — the keys
                // caught before the drag library reads them as "start a drag".
                <div
                  key={block.type}
                  onClickCapture={() => add(block.type)}
                  onKeyDownCapture={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      add(block.type);
                    }
                  }}
                >
                  <Drawer.Item name={block.type} label={block.name}>
                    {() => (
                      <div className="studio-tile" title={block.hint}>
                        <BlockIcon type={block.type} />
                        <span className="studio-tile-name">{block.name}</span>
                      </div>
                    )}
                  </Drawer.Item>
                </div>
              ))}
            </div>
          </Drawer>
        </section>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Pages */

export function PagesPanel({
  site,
  pageId,
  onOpen,
  onAdd,
  onUpdate,
  onMove,
  onDuplicate,
  onDelete,
}: {
  site: StudioSite;
  pageId: string;
  onOpen(id: string): void;
  onAdd(kind: 'page' | 'project'): void;
  onUpdate(id: string, patch: Partial<Omit<StudioPage, 'id' | 'data'>>): void;
  onMove(id: string, by: -1 | 1): void;
  onDuplicate(id: string): void;
  onDelete(id: string): void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const pages = site.pages.filter((p) => p.kind === 'page');
  const projects = site.pages.filter((p) => p.kind === 'project');

  const row = (page: StudioPage, list: StudioPage[]) => (
    <li key={page.id} className="grid">
      <div className={`studio-row${page.id === pageId ? ' is-current' : ''}`}>
        <button
          type="button"
          className="studio-row-main"
          onClick={() => onOpen(page.id)}
          aria-current={page.id === pageId ? 'page' : undefined}
        >
          {page.kind === 'project' ? (
            <span className="studio-row-thumb" aria-hidden="true">
              {page.cover ? <img src={page.cover} alt="" /> : null}
            </span>
          ) : null}
          <span className="min-w-0">
            <span className="block truncate">{page.title || 'Untitled'}</span>
            <span className="block truncate font-mono text-[11px] text-text-muted">
              /{page.slug}
              {page.slug === '' ? ' · home' : ''}
              {page.kind === 'page' && !page.inNav && page.slug !== '' ? ' · hidden' : ''}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="studio-icon-btn"
          aria-expanded={open === page.id}
          aria-label={`Settings for ${page.title || 'this page'}`}
          onClick={() => setOpen(open === page.id ? null : page.id)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="19" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>
      {open === page.id ? (
        <PageSettings
          page={page}
          site={site}
          first={list[0]?.id === page.id}
          last={list[list.length - 1]?.id === page.id}
          onUpdate={(patch) => onUpdate(page.id, patch)}
          onMove={(by) => onMove(page.id, by)}
          onDuplicate={() => onDuplicate(page.id)}
          onDelete={() => {
            setOpen(null);
            onDelete(page.id);
          }}
        />
      ) : null}
    </li>
  );

  return (
    <div className="grid gap-5">
      <PanelHead
        title="Pages"
        hint="Choose a page to edit it. The menu on your site follows this order."
      />
      <section className="grid gap-2" aria-label="Pages">
        <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-text-muted">Pages</p>
        <ul className="m-0 grid list-none gap-1 p-0">{pages.map((p) => row(p, pages))}</ul>
        <button type="button" className="studio-btn" onClick={() => onAdd('page')}>
          + Add a page
        </button>
      </section>
      <section className="grid gap-2" aria-label="Projects">
        <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Projects · shown in your project grid
        </p>
        <ul className="m-0 grid list-none gap-1 p-0">{projects.map((p) => row(p, projects))}</ul>
        <button type="button" className="studio-btn primary" onClick={() => onAdd('project')}>
          + Add a project
        </button>
      </section>
    </div>
  );
}

function PageSettings({
  page,
  site,
  first,
  last,
  onUpdate,
  onMove,
  onDuplicate,
  onDelete,
}: {
  page: StudioPage;
  site: StudioSite;
  first: boolean;
  last: boolean;
  onUpdate(patch: Partial<Omit<StudioPage, 'id' | 'data'>>): void;
  onMove(by: -1 | 1): void;
  onDuplicate(): void;
  onDelete(): void;
}) {
  const { upload } = useStudio();
  const home = page.slug === '';
  const [slug, setSlug] = useState(page.slug);
  const [confirming, setConfirming] = useState(false);
  const taken = !home && site.pages.some((p) => p.id !== page.id && p.slug === slug);
  const valid = home || /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug);

  return (
    <div className="studio-settings">
      <label className="studio-field">
        <span>{page.kind === 'project' ? 'Project title' : 'Name in the menu'}</span>
        <input
          className="studio-input"
          defaultValue={page.title}
          onBlur={(e) => {
            const title = e.currentTarget.value.trim();
            if (title && title !== page.title) onUpdate({ title });
          }}
        />
      </label>
      {home ? null : (
        <label className="studio-field">
          <span>Address</span>
          <span className="studio-slug">
            <span className="text-text-muted">…/</span>
            <input
              className="studio-input"
              value={slug}
              aria-invalid={!valid || taken}
              onChange={(e) =>
                setSlug(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
              }
              onBlur={() => {
                if (valid && !taken && slug !== page.slug) onUpdate({ slug });
                else setSlug(page.slug);
              }}
            />
          </span>
          {taken ? (
            <span className="text-xs text-danger">Another page already uses that address.</span>
          ) : null}
        </label>
      )}
      {page.kind === 'page' && !home ? (
        <label className="studio-check">
          <input
            type="checkbox"
            checked={page.inNav}
            onChange={(e) => onUpdate({ inNav: e.currentTarget.checked })}
          />
          <span>Show in the menu</span>
        </label>
      ) : null}
      {page.kind === 'project' ? (
        <div className="studio-field">
          <span>Cover image</span>
          <label className="studio-btn">
            {page.cover ? 'Change cover image' : 'Upload a cover image'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = '';
                if (!file) return;
                const url = await upload(file);
                if (url) onUpdate({ cover: url });
              }}
            />
          </label>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {home ? null : (
          <>
            <button
              type="button"
              className="studio-btn"
              disabled={first}
              onClick={() => onMove(-1)}
            >
              Move up
            </button>
            <button type="button" className="studio-btn" disabled={last} onClick={() => onMove(1)}>
              Move down
            </button>
          </>
        )}
        <button type="button" className="studio-btn" onClick={onDuplicate}>
          Duplicate
        </button>
        {home ? null : confirming ? (
          <button type="button" className="studio-btn danger" onClick={onDelete}>
            Yes, delete “{page.title}”
          </button>
        ) : (
          <button type="button" className="studio-btn danger" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Design */

export function DesignPanel({
  site,
  onDesign,
  onTemplate,
}: {
  site: StudioSite;
  onDesign(patch: Partial<StudioDesign>): void;
  onTemplate(id: TemplateId): void;
}) {
  const { design } = site;
  const custom = !ACCENTS.includes(design.accent.toLowerCase());
  return (
    <div className="grid gap-6">
      <PanelHead
        title="Design"
        hint="Switch template any time — your words and pictures stay exactly as they are."
      />

      <section className="grid gap-2" aria-label="Template">
        <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Template
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`studio-template${design.template === t.id ? ' is-current' : ''}`}
              aria-pressed={design.template === t.id}
              onClick={() => onTemplate(t.id)}
            >
              <TemplateThumb site={site} template={t.id} />
              <span className="studio-template-name">{t.name}</span>
            </button>
          ))}
        </div>
        <p className="m-0 text-xs text-text-secondary">{templateInfo(design.template).blurb}</p>
      </section>

      <section className="grid gap-2" aria-label="Colour">
        <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Colour
        </p>
        <div className="studio-segment" role="radiogroup" aria-label="Light or dark">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={design.mode === mode}
              onClick={() => onDesign({ mode })}
            >
              {mode === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent colour">
          {ACCENTS.map((hex) => (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={design.accent.toLowerCase() === hex}
              aria-label={`Accent ${hex}`}
              className="studio-swatch"
              style={{ background: hex }}
              onClick={() => onDesign({ accent: hex })}
            />
          ))}
          <label
            className={`studio-swatch studio-swatch-custom${custom ? ' is-on' : ''}`}
            title="Pick any colour"
            style={custom ? { background: design.accent } : undefined}
          >
            <span className="sr-only">Pick any colour</span>
            <input
              type="color"
              value={design.accent}
              onChange={(e) => onDesign({ accent: e.currentTarget.value })}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-2" aria-label="Fonts">
        <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-text-muted">Fonts</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Fonts">
          {FONT_PAIRS.map((pair) => (
            <button
              key={pair.id}
              type="button"
              role="radio"
              aria-checked={design.fonts === pair.id}
              className="studio-font"
              onClick={() => onDesign({ fonts: pair.id })}
            >
              <span className="text-2xl leading-none" style={{ fontFamily: pair.head }}>
                Aa
              </span>
              <span className="text-[11px] text-text-secondary">{pair.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3" aria-label="Site name">
        <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-text-muted">Site</p>
        <label className="studio-field">
          <span>Name at the top of every page</span>
          <input
            key={design.siteName}
            className="studio-input"
            defaultValue={design.siteName}
            onBlur={(e) => onDesign({ siteName: e.currentTarget.value.trim() })}
          />
        </label>
        <label className="studio-field">
          <span>Tagline</span>
          <input
            key={design.tagline}
            className="studio-input"
            defaultValue={design.tagline}
            placeholder="What you do, in a few words"
            onBlur={(e) => onDesign({ tagline: e.currentTarget.value.trim() })}
          />
        </label>
      </section>
    </div>
  );
}

function PanelHead({ title, hint }: { title: string; hint: string }) {
  return (
    <header className="grid gap-1">
      <h2 className="m-0 text-lg font-semibold">{title}</h2>
      <p className="m-0 text-sm text-text-secondary">{hint}</p>
    </header>
  );
}
