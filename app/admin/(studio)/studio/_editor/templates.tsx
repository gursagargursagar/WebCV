'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TEMPLATES, pageHasHeading, summaries, templateInfo } from '@/core/studio/design';
import { StudioPageView } from '@/core/studio/render';
import { starterSite } from '@/core/studio/starters';
import type { StudioMeta, StudioSite, TemplateId } from '@/core/studio/types';
import { Brand } from '@/components/scai/Brand';

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 860;

/**
 * A live, shrunken render of a site's home page in a template — the owner's
 * own content when they have some, so choosing a template shows their site,
 * not a stock photo of someone else's.
 */
export function TemplateThumb({ site, template }: { site: StudioSite; template: TemplateId }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / STAGE_WIDTH)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const home = site.pages[0];
  const meta = useMemo<StudioMeta>(
    () => ({
      design: { ...site.design, template, ...templateInfo(template).defaults },
      pages: summaries(site),
      pageId: home.id,
      hasHeading: pageHasHeading(home),
      hrefFor: () => '#',
      contactEndpoint: null,
    }),
    [site, template, home]
  );

  return (
    <div
      ref={box}
      className="studio-thumb"
      style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}` }}
      aria-hidden="true"
    >
      <div
        inert
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      >
        <StudioPageView data={home.data} meta={meta} />
      </div>
    </div>
  );
}

/** The first thing a new owner sees: pick a look, and the site is ready to edit. */
export function TemplatePicker({
  defaultName,
  onPick,
}: {
  defaultName: string;
  onPick(site: StudioSite): void;
}) {
  const [name, setName] = useState(defaultName);
  // The previews follow the name once typing pauses, not on every keystroke.
  const settled = useDebounced(name, 400);
  const samples = useMemo(
    () =>
      Object.fromEntries(
        TEMPLATES.map((t) => [t.id, starterSite(t.id, settled.trim() || 'Your Name')])
      ) as Record<TemplateId, StudioSite>,
    [settled]
  );

  return (
    <div className="scai min-h-screen bg-bg font-body text-text-primary">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-[64px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <Brand href="/admin" />
          <a
            href="/admin"
            className="inline-flex items-center text-sm text-text-secondary no-underline hover:text-text-primary"
            style={{ minHeight: 44 }}
          >
            Skip for now
          </a>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:px-6 md:py-14">
        <div className="grid gap-3" style={{ maxWidth: 'var(--measure, 720px)' }}>
          <p className="m-0 font-mono text-xs uppercase tracking-widest text-text-muted">
            Studio · Step 1 of 1
          </p>
          <h1 className="font-display m-0 text-4xl leading-tight sm:text-5xl">
            Pick a design to start from.
          </h1>
          <p className="m-0 text-base text-text-secondary">
            Each one comes filled in, so you only change what is yours. You can switch to another
            design whenever you like, and your words and pictures come with you.
          </p>
          <label className="mt-2 grid max-w-sm gap-1.5">
            <span className="text-sm text-text-secondary">
              Your name, as it appears on the site
            </span>
            <input
              className="studio-input"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              autoComplete="name"
            />
          </label>
        </div>
        <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="studio-pick group"
                onClick={() => onPick(starterSite(t.id, name.trim() || 'Your Name'))}
              >
                <TemplateThumb site={samples[t.id]} template={t.id} />
                <span className="flex items-baseline justify-between gap-3 px-4 pt-4">
                  <span className="text-lg font-semibold">{t.name}</span>
                  <span className="studio-pick-cta">Use {t.name} →</span>
                </span>
                <span className="block px-4 pb-4 pt-1 text-sm text-text-secondary">{t.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
