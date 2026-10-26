import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireOwner, UnauthorizedError } from '@/core/auth/guard';
import { getContentForChannel } from '@/core/content/read';
import { isWelcomePlaceholder } from '@/core/content/welcome';
import { AdminNav } from './_components/admin-nav';
import { OfflineNotice } from './_components/offline-notice';
import { CommandPalette, type PaletteRecord } from './_components/command-palette';
import { withLegacyCaseStudies } from './_components/sections';
import { ErrorCollector } from './error-collector';
import { WelcomeGate } from './welcome-gate';
import { AssistProvider } from './_components/assist';
import { assistCapabilities } from '@/core/ai/assist';
import { currentSite } from '@/core/site/tenant';
import { isMultiSite } from '@/core/site/constants';
import { getStorageAdapter } from '@/core/storage/registry';
import { hasUnpublishedChanges } from '@/core/content/changes';
import { Brand } from '@/components/scai/Brand';
import { ThemeToggle } from '@/components/scai/ThemeToggle';
import { PublishStatus, SignOut, SiteLink } from './_components/topbar';

/**
 * Guard by existence: the App Router admin's first mechanism.
 *
 * Any page that lands inside this group is owner-only by being here — the
 * layout throws or redirects before a single line of the page renders. This
 * is defence-in-depth and user experience, not the authorization boundary:
 * route handlers and server actions stay publicly callable HTTP endpoints no
 * matter what rendered the button, so each one still calls `requireOwner()`
 * itself (see `core/auth/guard.ts`).
 *
 * This layout used to be the migrated half of a split admin, with unmigrated
 * screens still serving from the legacy `[...slug]` mount; that mount is
 * deleted, so every admin URL in the nav below is a real route in this group.
 * See `docs/ADMIN-REWRITE.md` for the slices and the kill criteria.
 */

/*
 * Every admin screen is per-request by nature: it checks the session cookie
 * before anything renders. `instant = false` says so to Cache Components —
 * this segment is allowed to block — instead of wrapping the whole admin in a
 * Suspense fallback that would flash before the guard decides.
 */
// (`instant = false` removed: WebCV runs without Cache Components.)

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin' },
  robots: { index: false, follow: false },
};

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  let session: Awaited<ReturnType<typeof requireOwner>>;
  try {
    session = await requireOwner();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/admin/login');
    throw err;
  }

  // A fresh install is inferred from the content — the seed's placeholder
  // name is still in the draft — and the client leaf adds "unless this
  // browser has already skipped the wizard".
  const draft = await getContentForChannel('draft');
  const site = await currentSite();

  // Saved-but-not-live, for the publish control in the header.
  const adapter = await getStorageAdapter();
  const [draftMeta, publishedMeta] = await Promise.all([
    adapter.readSnapshotMeta('draft'),
    adapter.readSnapshotMeta('published'),
  ]);
  const unpublished = draftMeta
    ? hasUnpublishedChanges(draftMeta.state, publishedMeta?.state ?? null)
    : false;

  // Whether the owner connected their own model; the Suggest buttons hide
  // themselves otherwise.
  const assist = await assistCapabilities();

  // WebCV hides the screens about running the platform itself (which database,
  // the upstream project's GitHub support): an owner can do nothing there.
  const PLATFORM_ONLY = new Set(['/admin/storage', '/admin/help']);
  const sections = withLegacyCaseStudies((draft.caseStudies ?? []).length > 0).filter(
    (section) => !(isMultiSite() && PLATFORM_ONLY.has(section.href))
  );

  // What the command palette can jump to besides the sections: the owner's own
  // pages, writing and work, each opening its editor on that record.
  const records: PaletteRecord[] = [
    ...(draft.pages ?? []).map((page) => ({
      label: page.title || `/${page.slug}`,
      kind: 'Page',
      href: `/admin/pages?open=${encodeURIComponent(page.id)}`,
    })),
    ...(draft.writing ?? []).map((entry) => ({
      label: entry.title || 'Untitled',
      kind: 'Writing',
      href: `/admin/writing?open=${encodeURIComponent(entry.id)}`,
    })),
    ...(draft.projects ?? []).map((project) => ({
      label: project.title || project.name || 'Untitled',
      kind: 'Project',
      href: `/admin/projects?open=${encodeURIComponent(project.id)}`,
    })),
  ];

  return (
    // `.scai` puts the admin on WebCV's own skin (src/styles/scai.css), so it
    // looks the same whatever theme the owner gives their portfolio.
    <div className="scai min-h-screen bg-bg font-body text-text-primary">
      <WelcomeGate looksUnconfigured={isWelcomePlaceholder(draft.settings?.fullName)} />
      <ErrorCollector />
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:left-4 focus:top-4 focus:bg-text-primary focus:px-4 focus:py-2 focus:text-sm focus:text-bg"
      >
        Skip to content
      </a>
      <header
        className="sticky top-0 z-40 border-b border-border backdrop-blur"
        style={{ background: 'var(--surface-overlay)' }}
      >
        <div className="mx-auto flex min-h-[64px] max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <Brand href="/admin" suffix="Admin" />
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <CommandPalette sections={sections} records={records} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <OfflineNotice />
            <PublishStatus unpublished={unpublished} expectedRevision={publishedMeta?.revision ?? 0} />
            {site ? <SiteLink site={site} /> : null}
            <ThemeToggle />
            <span className="hidden md:inline-flex">
              <SignOut />
            </span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] lg:flex">
        <aside className="border-b border-border px-4 py-3 sm:px-6 lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-3 lg:py-6">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <AdminNav sections={sections} />
            </div>
            {/* On a phone the header has no room for it; it sits by the Menu. */}
            <div className="md:hidden">
              <SignOut />
            </div>
          </div>
          <div className="mt-6 hidden border-t border-border pt-4 lg:block">
            <p className="m-0 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
              Signed in
            </p>
            <p className="m-0 truncate px-3 pt-1 text-sm text-text-secondary">{session.email}</p>
          </div>
        </aside>
        <main id="admin-main" className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <AssistProvider value={assist}>{children}</AssistProvider>
        </main>
      </div>
    </div>
  );
}
