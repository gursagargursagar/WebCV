import Link from 'next/link';
import { currentSite } from '@/core/site/tenant';
import { readStudio } from '@/core/studio/store';
import { templateInfo } from '@/core/studio/design';

/**
 * The dashboard's first card in WebCV: where the site is, and the way in to
 * edit it. Server-rendered from the Studio's draft and published records.
 */
export async function StudioCard() {
  const [draft, published, site] = await Promise.all([
    readStudio('draft').catch(() => null),
    readStudio('published').catch(() => null),
    currentSite(),
  ]);

  if (!draft) {
    return (
      <section
        aria-labelledby="studio-card"
        className="grid gap-3 rounded-2xl border border-border p-4"
      >
        <h2 id="studio-card" className="m-0 text-xl">
          Build your site in the Studio
        </h2>
        <p className="m-0 text-sm text-text-secondary">
          Pick a ready-made design, then click any words or pictures on the page to make them yours.
          Nothing goes live until you publish.
        </p>
        <Link
          href="/admin/studio"
          className="justify-self-start rounded-full bg-text-primary px-5 font-semibold text-bg no-underline"
          style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
        >
          Choose a design
        </Link>
      </section>
    );
  }

  const live = published !== null;
  const changed = live && JSON.stringify(draft.site) !== JSON.stringify(published.site);
  const projects = draft.site.pages.filter((p) => p.kind === 'project').length;
  const pages = draft.site.pages.length - projects;

  return (
    <section
      aria-labelledby="studio-card"
      className="grid gap-3 rounded-2xl border border-border p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="studio-card" className="m-0 text-xl">
          Your site
        </h2>
        <p className="m-0 text-sm text-text-secondary">
          {live
            ? changed
              ? 'Live · changes waiting to publish'
              : 'Live · up to date'
            : 'Not published yet'}
        </p>
      </div>
      <p className="m-0 text-sm text-text-secondary">
        {templateInfo(draft.site.design.template).name} template · {pages} page
        {pages === 1 ? '' : 's'} · {projects} project{projects === 1 ? '' : 's'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/studio"
          className="rounded-full bg-text-primary px-5 font-semibold text-bg no-underline"
          style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
        >
          Open Studio
        </Link>
        {live && site ? (
          <a
            href={`/${site}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border px-5 text-text-primary no-underline hover:border-border-hover"
            style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
          >
            View live site ↗
          </a>
        ) : null}
      </div>
    </section>
  );
}
