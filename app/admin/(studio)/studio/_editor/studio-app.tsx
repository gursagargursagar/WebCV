'use client';

import '@puckeditor/core/no-external.css';
import '@/core/studio/site.css';
import './studio.css';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Puck, createUsePuck, type Data } from '@puckeditor/core';
import { BLOCK_INFO, studioConfig, type FieldKit } from '@/core/studio/blocks';
import { newId, pageHasHeading, summaries, templateInfo, uniqueSlug } from '@/core/studio/design';
import { blankPage } from '@/core/studio/starters';
import type {
  StudioDesign,
  StudioEditHooks,
  StudioMeta,
  StudioPage,
  StudioSite,
  TemplateId,
} from '@/core/studio/types';
import { StudioContext, uploadImage, type StudioContextValue } from './context';
import {
  CoverTools,
  FrameBridge,
  ImageField,
  ImageTools,
  InlineText,
  OpenButton,
} from './edit-tools';
import { Icon } from './icons';
import { AddPanel, DesignPanel, PagesPanel } from './panels';
import { TemplatePicker } from './templates';

/* ------------------------------------------------------------ constants */

// Created once: Puck rebuilds its store whenever config, overrides or iframe
// settings change identity, so none of them may be rebuilt per render.
const kit: FieldKit = { image: ImageField };
const config = studioConfig(kit);
const IFRAME = { enabled: true, waitForStyles: true, syncHostStyles: true };
const usePuckState = createUsePuck<typeof config>();

type Device = 'desktop' | 'tablet' | 'phone';
/** The width each preview size lays the page out at; a narrower canvas shows it scaled down. */
const DEVICE_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 820, phone: 390 };
type Panel = 'add' | 'pages' | 'design';
type SaveState = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';

interface Props {
  initial: StudioSite | null;
  revision: number;
  published: StudioSite | null;
  slug: string;
  siteUrl: string;
  defaultName: string;
  fontClass: string;
}

/* ------------------------------------------------------------------ app */

export function StudioApp(props: Props) {
  const [site, setSite] = useState<StudioSite | null>(props.initial);
  if (!site) {
    return <TemplatePicker defaultName={props.defaultName} onPick={setSite} />;
  }
  return (
    <Editor
      {...props}
      site={site}
      setSite={setSite as (fn: (s: StudioSite) => StudioSite) => void}
    />
  );
}

/* ------------------------------------------------------------- autosave */

function useAutosave(site: StudioSite, initialRevision: number, saved: boolean) {
  const [state, setState] = useState<SaveState>(saved ? 'saved' : 'unsaved');
  const revision = useRef(initialRevision);
  const lastSaved = useRef(saved ? JSON.stringify(site) : '');
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const latest = useRef(site);
  useEffect(() => {
    latest.current = site;
  }, [site]);

  const flush = useCallback(async (): Promise<boolean> => {
    const run = async () => {
      const json = JSON.stringify(latest.current);
      if (json === lastSaved.current) return true;
      setState('saving');
      try {
        const res = await fetch('/api/admin/studio', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: `{"revision":${revision.current},"site":${json}}`,
        });
        const body = (await res.json().catch(() => null)) as
          { ok: true; revision: number } | { ok: false; error?: string } | null;
        if (res.status === 409) {
          setState('conflict');
          return false;
        }
        if (!res.ok || !body?.ok) {
          setState('error');
          return false;
        }
        revision.current = body.revision;
        lastSaved.current = json;
        setState(JSON.stringify(latest.current) === json ? 'saved' : 'unsaved');
        return true;
      } catch {
        setState('error');
        return false;
      }
    };
    const next = chain.current.then(run, run);
    chain.current = next;
    return next;
  }, []);

  useEffect(() => {
    if (JSON.stringify(site) === lastSaved.current) return;
    setState((s) => (s === 'conflict' ? s : 'unsaved'));
    const timer = window.setTimeout(() => void flush(), 900);
    return () => window.clearTimeout(timer);
  }, [site, flush]);

  // Leaving with unsaved work asks first.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== lastSaved.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);

  return { state, flush, revision };
}

/* --------------------------------------------------------------- editor */

function Editor({
  site,
  setSite,
  revision: initialRevision,
  initial,
  published,
  slug,
  siteUrl,
  fontClass,
}: Props & { site: StudioSite; setSite(fn: (s: StudioSite) => StudioSite): void }) {
  const [pageId, setPageId] = useState(site.pages[0].id);
  // A phone opens on the page itself; a panel there would cover most of it.
  const [panel, setPanel] = useState<Panel | null>(() => (isNarrow() ? null : 'add'));
  // On a phone, start where the owner is: a phone-sized page at full size.
  const [device, setDevice] = useState<Device>(() => (isPhone() ? 'phone' : 'desktop'));
  const [previewing, setPreviewing] = useState(false);
  const [toasts, setToasts] = useState<
    { id: number; message: ReactNode; tone: 'info' | 'error' }[]
  >([]);
  const [publishing, setPublishing] = useState(false);
  const [publishedJson, setPublishedJson] = useState(published ? JSON.stringify(published) : '');
  const save = useAutosave(site, initialRevision, initial !== null);

  const page = site.pages.find((p) => p.id === pageId) ?? site.pages[0];

  const notify = useCallback((message: ReactNode, tone: 'info' | 'error' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    window.setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      tone === 'error' ? 7000 : 5000
    );
  }, []);

  /* ---- site edits */

  const setDesign = useCallback(
    (patch: Partial<StudioDesign>) => setSite((s) => ({ ...s, design: { ...s.design, ...patch } })),
    [setSite]
  );

  const updatePage = useCallback(
    (id: string, patch: Partial<Omit<StudioPage, 'id' | 'data'>>) =>
      setSite((s) => ({
        ...s,
        pages: s.pages.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, ...patch };
          if (patch.slug !== undefined && p.slug !== '') next.slug = uniqueSlug(s, patch.slug, id);
          return next;
        }),
      })),
    [setSite]
  );

  const openPage = useCallback((id: string) => {
    setPageId((current) => {
      if (current === id) return current;
      return id;
    });
    if (window.matchMedia('(max-width: 899px)').matches) setPanel(null);
  }, []);

  const setPageData = useCallback(
    (id: string, data: Data) =>
      setSite((s) => ({ ...s, pages: s.pages.map((p) => (p.id === id ? { ...p, data } : p)) })),
    [setSite]
  );

  const addPage = (kind: 'page' | 'project') => {
    const id = newId('pg');
    setSite((s) => {
      const title = kind === 'project' ? 'New project' : 'New page';
      const fresh: StudioPage = {
        id,
        kind,
        title,
        slug: uniqueSlug(s, title),
        inNav: kind === 'page',
        data: blankPage(kind),
      };
      // Pages go after the other pages, projects after the other projects.
      const last = s.pages.map((p) => p.kind).lastIndexOf(kind);
      const pages = [...s.pages];
      pages.splice(last + 1, 0, fresh);
      return { ...s, pages };
    });
    setPageId(id);
    notify(kind === 'project' ? 'Project added. Give it a title and a cover.' : 'Page added.');
  };

  const movePage = (id: string, by: -1 | 1) =>
    setSite((s) => {
      const page = s.pages.find((p) => p.id === id);
      if (!page) return s;
      const same = s.pages.filter((p) => p.kind === page.kind && p.slug !== '');
      const at = same.findIndex((p) => p.id === id);
      const swap = same[at + by];
      if (!swap) return s;
      const pages = [...s.pages];
      const i = pages.indexOf(page);
      const j = pages.indexOf(swap);
      [pages[i], pages[j]] = [pages[j], pages[i]];
      return { ...s, pages };
    });

  const duplicatePage = (id: string) => {
    const copyId = newId('pg');
    setSite((s) => {
      const source = s.pages.find((p) => p.id === id);
      if (!source) return s;
      const copy: StudioPage = {
        ...structuredClone(source),
        id: copyId,
        title: `${source.title} copy`,
        slug: uniqueSlug(s, `${source.slug || 'home'}-copy`),
      };
      const pages = [...s.pages];
      pages.splice(s.pages.indexOf(source) + 1, 0, copy);
      return { ...s, pages };
    });
    setPageId(copyId);
  };

  const deletePage = (id: string) => {
    const doomed = site.pages.find((p) => p.id === id);
    if (!doomed || doomed.slug === '') return;
    setSite((s) => ({ ...s, pages: s.pages.filter((p) => p.id !== id) }));
    if (pageId === id) setPageId(site.pages[0].id);
    notify(`Deleted “${doomed.title}”.`);
  };

  const switchTemplate = (template: TemplateId) =>
    setDesign({ template, ...templateInfo(template).defaults });

  /* ---- uploads */

  const upload = useCallback(
    async (file: File) => {
      try {
        const url = await uploadImage(file, slug);
        notify('Image uploaded.');
        return url;
      } catch (err) {
        notify(err instanceof Error ? err.message : 'The upload did not go through.', 'error');
        return null;
      }
    },
    [slug, notify]
  );

  /* ---- publish */

  const dirty = JSON.stringify(site) !== publishedJson;

  const publish = async () => {
    setPublishing(true);
    try {
      if (!(await save.flush())) {
        notify(
          'Your latest changes are not saved yet, so nothing was published. Try again.',
          'error'
        );
        return;
      }
      const res = await fetch('/api/admin/studio/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revision: save.revision.current }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !body?.ok) {
        notify(body?.error ?? 'Publishing did not work. Try again in a moment.', 'error');
        return;
      }
      setPublishedJson(JSON.stringify(site));
      notify(
        <span>
          Your site is live.{' '}
          <a href={siteUrl} target="_blank" rel="noreferrer" className="underline">
            View it
          </a>
        </span>
      );
    } finally {
      setPublishing(false);
    }
  };

  /* ---- what the blocks see */

  const pageList = useMemo(() => summaries(site), [site]);
  const pageKey = JSON.stringify(pageList);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- by value: content edits must not rebuild it
  const stablePages = useMemo(() => pageList, [pageKey]);

  const edit = useMemo<StudioEditHooks>(
    () => ({
      setDesign,
      updatePage,
      openPage,
      Text: InlineText,
      ImageTools,
      CoverTools,
      OpenButton,
    }),
    [setDesign, updatePage, openPage]
  );

  const hasHeading = pageHasHeading(page);
  const metadata = useMemo<StudioMeta>(
    () => ({
      design: site.design,
      pages: stablePages,
      pageId: page.id,
      hasHeading,
      hrefFor: () => '#',
      contactEndpoint: null,
      edit,
    }),
    [site.design, stablePages, page.id, hasHeading, edit]
  );

  const pageCovers = useRef(new Map<string, string | undefined>());
  useEffect(() => {
    pageCovers.current = new Map(site.pages.map((p) => [p.id, p.cover]));
  }, [site.pages]);

  const context = useMemo<StudioContextValue>(
    () => ({
      slug,
      upload,
      notify: (message, tone) => notify(message, tone),
      openPage,
      updatePage,
      setDesign,
      pageCover: (id) => pageCovers.current.get(id),
    }),
    [slug, upload, notify, openPage, updatePage, setDesign]
  );

  const overrides = useMemo(
    () => ({
      iframe: ({ children, document }: { children: ReactNode; document?: Document }) => (
        <FrameBridge document={document} fontClass={fontClass} onOpen={openPage}>
          {children}
        </FrameBridge>
      ),
    }),
    [fontClass, openPage]
  );

  const onChange = useCallback((data: Data) => setPageData(page.id, data), [setPageData, page.id]);

  return (
    <StudioContext.Provider value={context}>
      <Puck
        key={page.id}
        config={config}
        data={page.data}
        onChange={onChange}
        metadata={metadata as unknown as Record<string, unknown>}
        iframe={IFRAME}
        overrides={overrides}
      >
        <div className={`scai studio${panel ? ' has-panel' : ''}`}>
          <TopBar
            site={site}
            page={page}
            onPage={openPage}
            device={device}
            setDevice={setDevice}
            save={save.state}
            onRetry={() => void save.flush()}
            onPreview={async () => {
              await save.flush();
              setPreviewing(true);
            }}
            onPublish={publish}
            publishing={publishing}
            dirty={dirty}
            everPublished={publishedJson !== ''}
            siteUrl={siteUrl}
          />
          <div className="studio-body">
            <SheetCoordinator onSelect={() => setPanel(null)} />
            <Rail panel={panel} setPanel={setPanel} />
            {panel ? (
              <aside className="studio-panel" aria-label="Editor panel">
                <button
                  type="button"
                  className="studio-panel-close studio-icon-btn"
                  aria-label="Close panel"
                  onClick={() => setPanel(null)}
                >
                  <Icon name="close" />
                </button>
                {panel === 'add' ? (
                  <AddPanel />
                ) : panel === 'pages' ? (
                  <PagesPanel
                    site={site}
                    pageId={page.id}
                    onOpen={openPage}
                    onAdd={addPage}
                    onUpdate={updatePage}
                    onMove={movePage}
                    onDuplicate={duplicatePage}
                    onDelete={deletePage}
                  />
                ) : (
                  <DesignPanel site={site} onDesign={setDesign} onTemplate={switchTemplate} />
                )}
              </aside>
            ) : null}
            <Canvas device={device} hint={<Tips />} />
            <Inspector />
          </div>
          <Toasts
            toasts={toasts}
            onDismiss={(id) => setToasts((l) => l.filter((t) => t.id !== id))}
          />
        </div>
      </Puck>
      {previewing ? (
        <PreviewOverlay page={page} site={site} onClose={() => setPreviewing(false)} />
      ) : null}
    </StudioContext.Provider>
  );
}

/* --------------------------------------------------------------- top bar */

function TopBar({
  site,
  page,
  onPage,
  device,
  setDevice,
  save,
  onRetry,
  onPreview,
  onPublish,
  publishing,
  dirty,
  everPublished,
  siteUrl,
}: {
  site: StudioSite;
  page: StudioPage;
  onPage(id: string): void;
  device: Device;
  setDevice(d: Device): void;
  save: SaveState;
  onRetry(): void;
  onPreview(): void;
  onPublish(): void;
  publishing: boolean;
  dirty: boolean;
  everPublished: boolean;
  siteUrl: string;
}) {
  const back = usePuckState((s) => s.history.back);
  const forward = usePuckState((s) => s.history.forward);
  const hasPast = usePuckState((s) => s.history.hasPast);
  const hasFuture = usePuckState((s) => s.history.hasFuture);

  const saveLabel: Record<SaveState, string> = {
    saved: 'All changes saved',
    unsaved: 'Saving soon…',
    saving: 'Saving…',
    error: 'Not saved',
    conflict: 'Changed elsewhere',
  };

  return (
    <header className="studio-top">
      <a
        href="/admin"
        className="studio-icon-btn"
        aria-label="Back to your dashboard"
        title="Dashboard"
      >
        <Icon name="back" />
      </a>
      <span className="studio-wordmark" aria-hidden="true">
        <img src="/brand/webcv-mark.png" alt="" width={24} height={24} />
        Studio
      </span>
      <label className="studio-page-select">
        <span className="sr-only">Page you are editing</span>
        <select value={page.id} onChange={(e) => onPage(e.currentTarget.value)}>
          <optgroup label="Pages">
            {site.pages
              .filter((p) => p.kind === 'page')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.slug === '' ? `${p.title} (home)` : p.title}
                </option>
              ))}
          </optgroup>
          <optgroup label="Projects">
            {site.pages
              .filter((p) => p.kind === 'project')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </optgroup>
        </select>
      </label>

      <div className="studio-devices" role="radiogroup" aria-label="Preview size">
        {(['desktop', 'tablet', 'phone'] as Device[]).map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={device === d}
            aria-label={d === 'desktop' ? 'Desktop' : d === 'tablet' ? 'Tablet' : 'Phone'}
            title={d === 'desktop' ? 'Desktop' : d === 'tablet' ? 'Tablet' : 'Phone'}
            className="studio-icon-btn"
            onClick={() => setDevice(d)}
          >
            <Icon name={d} />
          </button>
        ))}
      </div>

      <div className="studio-history">
        <button
          type="button"
          className="studio-icon-btn"
          onClick={back}
          disabled={!hasPast}
          aria-label="Undo"
          title="Undo"
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          className="studio-icon-btn"
          onClick={forward}
          disabled={!hasFuture}
          aria-label="Redo"
          title="Redo"
        >
          <Icon name="redo" />
        </button>
      </div>

      <span className={`studio-save is-${save}`} role="status">
        {save === 'error' ? (
          <button type="button" className="underline" onClick={onRetry}>
            Not saved — retry
          </button>
        ) : save === 'conflict' ? (
          <button type="button" className="underline" onClick={() => window.location.reload()}>
            Changed in another tab — reload
          </button>
        ) : (
          saveLabel[save]
        )}
      </span>

      <div className="studio-actions">
        <button type="button" className="studio-btn" onClick={onPreview}>
          <Icon name="eye" />
          <span className="studio-hide-sm">Preview</span>
        </button>
        {everPublished ? (
          <a className="studio-btn studio-hide-sm" href={siteUrl} target="_blank" rel="noreferrer">
            View site
            <Icon name="external" size={14} />
          </a>
        ) : null}
        <button
          type="button"
          className="studio-btn primary"
          onClick={onPublish}
          disabled={publishing || save === 'conflict'}
          aria-describedby="studio-publish-state"
        >
          {publishing ? (
            'Publishing…'
          ) : (
            <>
              Publish<span className="studio-hide-sm">{everPublished ? ' changes' : ' site'}</span>
            </>
          )}
          {dirty && !publishing ? <span className="studio-dot" aria-hidden="true" /> : null}
        </button>
        <span id="studio-publish-state" className="sr-only">
          {dirty ? 'You have changes that are not live yet.' : 'Everything is live.'}
        </span>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ rail */

const isPhone = () => window.matchMedia('(max-width: 599px)').matches;
const isNarrow = () => window.matchMedia('(max-width: 899px)').matches;

/**
 * On a narrow screen the panel and the inspector are both bottom sheets, so
 * only one may be open: choosing a block closes the panel.
 */
function SheetCoordinator({ onSelect }: { onSelect(): void }) {
  const selected = usePuckState((s) => s.appState.ui.itemSelector !== null);
  const latest = useRef(onSelect);
  useEffect(() => {
    latest.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    if (selected && isNarrow()) latest.current();
  }, [selected]);
  return null;
}

function Rail({ panel, setPanel }: { panel: Panel | null; setPanel(p: Panel | null): void }) {
  const dispatch = usePuckState((s) => s.dispatch);
  const items: { id: Panel; label: string; icon: string }[] = [
    { id: 'add', label: 'Add', icon: 'add' },
    { id: 'pages', label: 'Pages', icon: 'pages' },
    { id: 'design', label: 'Design', icon: 'design' },
  ];
  return (
    <nav className="studio-rail" aria-label="Studio">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="studio-rail-btn"
          aria-pressed={panel === item.id}
          onClick={() => {
            // …and opening a panel there puts the inspector away.
            if (isNarrow()) dispatch({ type: 'setUi', ui: { itemSelector: null } });
            setPanel(panel === item.id ? null : item.id);
          }}
        >
          <Icon name={item.icon} size={20} />
          <span>{item.label}</span>
        </button>
      ))}
      <a
        className="studio-rail-btn studio-rail-advanced"
        href="/admin"
        title="Everything else: messages, SEO, settings"
      >
        <Icon name="advanced" size={20} />
        <span>Advanced</span>
      </a>
    </nav>
  );
}

/* ---------------------------------------------------------------- canvas */

function Canvas({ device, hint }: { device: Device; hint: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Desktop is laid out at a desktop's width even when the canvas is narrower —
  // shrunk to fit, so the owner sees their real desktop layout and not the
  // tablet one a narrow frame would trigger. A wider canvas just gets wider.
  const target = DEVICE_WIDTH[device];
  const width = device === 'desktop' ? Math.max(target, size.w) : target;
  const scale = size.w && width > size.w ? size.w / width : 1;

  return (
    <main className="studio-canvas" aria-label="Live preview — click anything to edit it">
      <div ref={box} className="studio-canvas-inner">
        <div
          className={`studio-frame d-${device}`}
          style={{
            width: width || '100%',
            height: size.h ? size.h / scale : '100%',
            transform: `translateX(-50%) scale(${scale})`,
          }}
        >
          <Puck.Preview />
        </div>
      </div>
      {hint}
    </main>
  );
}

/* ------------------------------------------------------------------ tips */

const TIPS_KEY = 'webcv.studio.tips-dismissed';

/** The three things to know, once, over the preview until dismissed. */
function Tips() {
  const [hidden, setHidden] = useState(() => {
    try {
      return window.localStorage.getItem(TIPS_KEY) === '1';
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  return (
    <div className="studio-tips" role="note" aria-label="How the Studio works">
      <ul>
        <li>
          <strong>Click any words</strong> on the page to change them.
        </li>
        <li>
          <strong>Click a block</strong> for its pictures, links and layout.
        </li>
        <li>
          <strong>Nothing is live</strong> until you publish. Your work saves itself.
        </li>
      </ul>
      <button
        type="button"
        className="studio-btn"
        onClick={() => {
          setHidden(true);
          try {
            window.localStorage.setItem(TIPS_KEY, '1');
          } catch {
            /* a private window: hide it for now */
          }
        }}
      >
        Got it
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- inspector */

function Inspector() {
  const selected = usePuckState((s) => s.selectedItem);
  const selector = usePuckState((s) => s.appState.ui.itemSelector);
  const count = usePuckState((s) => s.appState.data.content.length);
  const dispatch = usePuckState((s) => s.dispatch);

  // Only takes room when there is something to show: the preview is the editor.
  if (!selected || !selector) return null;

  const info = BLOCK_INFO.find((b) => b.type === selected.type);
  const { index, zone = 'root:default-zone' } = selector;
  const select = (i: number) =>
    dispatch({ type: 'setUi', ui: { itemSelector: { index: i, zone } } });

  return (
    <aside className="studio-inspector" aria-label={`${info?.name ?? 'Block'} settings`}>
      <header className="studio-inspector-head">
        <div className="min-w-0">
          <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Block
          </p>
          <h2 className="m-0 truncate text-lg font-semibold">{info?.name ?? selected.type}</h2>
        </div>
        <button
          type="button"
          className="studio-icon-btn"
          aria-label="Done"
          title="Done"
          onClick={() => dispatch({ type: 'setUi', ui: { itemSelector: null } })}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="studio-fields">
        <Puck.Fields />
      </div>
      <footer className="studio-inspector-foot">
        <button
          type="button"
          className="studio-icon-btn"
          aria-label="Move up"
          title="Move up"
          disabled={index === 0}
          onClick={() => {
            dispatch({
              type: 'reorder',
              sourceIndex: index,
              destinationIndex: index - 1,
              destinationZone: zone,
            });
            select(index - 1);
          }}
        >
          <Icon name="up" />
        </button>
        <button
          type="button"
          className="studio-icon-btn"
          aria-label="Move down"
          title="Move down"
          disabled={index >= count - 1}
          onClick={() => {
            dispatch({
              type: 'reorder',
              sourceIndex: index,
              destinationIndex: index + 1,
              destinationZone: zone,
            });
            select(index + 1);
          }}
        >
          <Icon name="down" />
        </button>
        <button
          type="button"
          className="studio-icon-btn"
          aria-label="Duplicate"
          title="Duplicate"
          onClick={() => {
            dispatch({ type: 'duplicate', sourceIndex: index, sourceZone: zone });
            select(index + 1);
          }}
        >
          <Icon name="copy" />
        </button>
        <button
          type="button"
          className="studio-btn danger ml-auto"
          onClick={() => {
            dispatch({ type: 'remove', index, zone });
            dispatch({ type: 'setUi', ui: { itemSelector: null } });
          }}
        >
          <Icon name="trash" size={16} />
          Delete block
        </button>
      </footer>
    </aside>
  );
}

/* --------------------------------------------------------------- preview */

/**
 * The whole site as a visitor will see it, at any device width. A real page
 * in a frame — the draft, rendered by the same code that serves the live site
 * — so media queries, links and scrolling behave exactly as they will.
 */
function PreviewOverlay({
  page,
  site,
  onClose,
}: {
  page: StudioPage;
  site: StudioSite;
  onClose(): void;
}) {
  const [device, setDevice] = useState<Device>('desktop');
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const width = device === 'desktop' ? null : DEVICE_WIDTH[device];
  const src = `/admin/studio/preview${page.slug ? `/${page.slug}` : ''}?v=${encodeURIComponent(
    String(site.pages.length)
  )}`;

  return (
    <div
      className="scai studio-preview"
      role="dialog"
      aria-modal="true"
      aria-label="Preview of your site"
    >
      <div className="studio-preview-bar">
        <p className="m-0 text-sm text-text-secondary">
          Preview · <span className="text-text-primary">exactly what visitors will see</span>
        </p>
        <div className="studio-devices" role="radiogroup" aria-label="Preview size">
          {(['desktop', 'tablet', 'phone'] as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={device === d}
              aria-label={d}
              className="studio-icon-btn"
              onClick={() => setDevice(d)}
            >
              <Icon name={d} />
            </button>
          ))}
        </div>
        <button ref={close} type="button" className="studio-btn primary" onClick={onClose}>
          Back to editing
        </button>
      </div>
      <div className="studio-preview-stage">
        <iframe
          title="Site preview"
          src={src}
          className="studio-preview-frame"
          style={{ width: width ?? '100%' }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- toasts */

function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: { id: number; message: ReactNode; tone: 'info' | 'error' }[];
  onDismiss(id: number): void;
}) {
  return (
    <div className="studio-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`studio-toast is-${t.tone}`}
          role={t.tone === 'error' ? 'alert' : undefined}
        >
          <span>{t.message}</span>
          <button
            type="button"
            className="studio-icon-btn"
            aria-label="Dismiss"
            onClick={() => onDismiss(t.id)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
