'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { groupSections, type AdminSection } from './sections';

/**
 * The admin's section nav — 25 links: a sidebar on a desktop, a Menu on a phone.
 *
 * (History.) As one wrapped header row it was the whole first screenful on a
 * phone, and on a desktop a two-line wall above every screen.
 *
 * As a wrapped list the header was the whole first screenful on a 360px
 * viewport, and every link was a 20px-tall line of text: a scroll before you
 * reach the page, and a target half the size a thumb can hit. The phone now
 * gets a Menu button — 44px tall, and it names the section you are in — which
 * opens the same list as 44px pills; from `sm` up it stays the wrapped list.
 *
 * The links come in labelled groups (Build, Profile, Audience, Look & reach,
 * System), each its own list under a small heading, so the eye finds the
 * cluster first and the link second.
 *
 * In WebCV the site is built in the Studio, so only the everyday sections
 * show; the rest sit behind an Advanced toggle (`withAdvanced`). It opens by
 * itself when you are on one of those screens, so the nav never hides where
 * you are.
 *
 * Two details worth keeping:
 * - `aria-current="page"` marks the section you are in, for eyes and for
 *   screen readers. `/admin` only counts as active on itself; matching it as a
 *   prefix would light up Dashboard on every screen.
 * - Every link carries a pending dot. The admin is `force-dynamic` and has no
 *   `loading.tsx` (a boundary that streams a shell would answer unknown admin
 *   URLs with 200 — the bug this repo already fixed once on the public site),
 *   so a tap on a slow connection shows nothing until the server answers. The
 *   dot is fixed-size and only fades in while a navigation is pending, so it
 *   cannot shift the row it sits in.
 */
function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    // Zero-width wrapper: the dot is painted, not laid out, so it can never
    // rewrap the list or nudge the row it sits on.
    <span aria-hidden className="relative inline-block h-1.5 w-0 align-middle">
      <span
        // The pulse waits a moment before starting, so a fast navigation does
        // not flash. Inline on purpose: it has to beat the shorthand
        // `animate-pulse` emits, and a stylesheet rule of equal rank would lose.
        style={{ animationDelay: '120ms' }}
        className={`absolute left-1 top-0 h-1.5 w-1.5 rounded-full bg-current transition-opacity ${
          pending ? 'animate-pulse opacity-60' : 'opacity-0'
        }`}
      />
    </span>
  );
}

export function AdminNav({ sections }: { sections: AdminSection[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
  const current = sections.find((section) => isActive(section.href));
  const everyday = sections.filter((section) => !section.advanced);
  const advanced = sections.filter((section) => section.advanced);
  // Open by itself on an advanced screen, until someone chooses otherwise.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const showAdvanced = toggled ?? Boolean(current?.advanced);

  const groups = (list: AdminSection[]) =>
    groupSections(list).map(({ group, sections: members }) => (
      <div key={group ?? 'home'} className="flex flex-col gap-1">
        {group ? (
          <p
            id={`admin-group-${group.replace(/\W+/g, '-').toLowerCase()}`}
            className="m-0 px-3 pb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted"
          >
            {group}
          </p>
        ) : null}
        <ul
          aria-labelledby={
            group ? `admin-group-${group.replace(/\W+/g, '-').toLowerCase()}` : undefined
          }
          className="m-0 grid list-none gap-px p-0"
        >
          {members.map((section) => {
            const active = isActive(section.href);
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={`relative flex min-h-[44px] items-center px-3 text-sm no-underline transition-colors lg:min-h-[36px] ${
                    active
                      ? 'bg-surface-secondary font-semibold text-text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-accent'
                      : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                  }`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  {section.label}
                  <PendingDot />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    ));

  // One list, two layouts. Below `lg` it is a Menu button that opens the
  // groups as full-width 44px rows; from `lg` up it is the sidebar, always
  // open, with the section you are in marked by the SCAI cyan rule on its
  // left edge (the swisscheeseai.au host-index treatment).
  return (
    <nav aria-label="Admin sections" className="w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="admin-sections"
        className="flex w-full items-center justify-between gap-3 border border-border px-4 text-sm text-text-secondary hover:border-border-hover hover:text-text-primary lg:hidden"
        style={{ minHeight: 44, borderRadius: 'var(--radius-md)' }}
      >
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
            Menu
          </span>
          {current ? (
            <span className="font-semibold text-text-primary">{current.label}</span>
          ) : null}
        </span>
        <span aria-hidden className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      <div
        id="admin-sections"
        className={`${open ? 'flex' : 'hidden'} mt-3 flex-col gap-5 lg:mt-0 lg:flex`}
      >
        {advanced.length === 0 ? (
          groups(sections)
        ) : (
          <>
            {/* Everyday sections as one plain list: a group label over two links is noise. */}
            {groups(everyday.map(({ group: _group, ...section }) => section))}
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setToggled(!showAdvanced)}
                aria-expanded={showAdvanced}
                aria-controls="admin-advanced"
                className="flex w-full items-center justify-between gap-3 px-3 text-sm text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                style={{ minHeight: 44, borderRadius: 'var(--radius-md)' }}
              >
                <span>
                  Advanced <span className="text-text-muted">· {advanced.length} more</span>
                </span>
                <span
                  aria-hidden
                  className={`text-xs transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                >
                  ▾
                </span>
              </button>
              <div
                id="admin-advanced"
                className={`${showAdvanced ? 'flex' : 'hidden'} mt-2 flex-col gap-5`}
              >
                {groups(advanced)}
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
