import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { currentSite } from '@/core/site/tenant';
import { licenceLapsed, statement } from '@/core/declarations/facts';
import { liveDeclaration } from '@/core/declarations/store';
import './declaration.css';

/**
 * A portfolio's statutory declaration, at `/<site>/declaration`.
 *
 * Reached only through the proxy, which supplies the site. Says exactly what
 * WebCV did — checked that a genuine myGov declaration was made, with these
 * statements, on this date — and plainly what it did not: check that they are
 * true. Never shows the PDF, which no longer exists.
 */

export const dynamic = 'force-dynamic';

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function load() {
  const site = await currentSite();
  if (!site) return null;
  const live = await liveDeclaration(site).catch(() => null);
  return live?.declaredOn ? { site, live } : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const found = await load();
  if (!found) return { title: 'Not found' };
  return {
    title: `Statutory declaration — ${found.live.name}`,
    description: `Career facts ${found.live.name} declared in a Commonwealth statutory declaration.`,
    // Personal details: there for whoever is sent the link, not for search.
    robots: { index: false, follow: true },
  };
}

export default async function DeclarationPublicPage() {
  const found = await load();
  if (!found) notFound();
  const { site, live } = found;
  const declaredOn = live.declaredOn!;

  return (
    <main className="wcd">
      <p className="wcd-eyebrow">webcv.au/{site}</p>
      <h1>Statutory declaration</h1>
      <p className="wcd-lede">
        On {dateLabel(declaredOn)}, {live.name} made a digital Commonwealth statutory declaration
        containing the statements below.
        {live.reviewedAt
          ? ` On ${dateLabel(live.reviewedAt)}, WebCV checked the declaration document's QR code with the official myGov app and confirmed it matched.`
          : ''}
      </p>

      <ol className="wcd-list">
        {live.facts.map((fact) => {
          const lapsed = fact.kind === 'licence' && licenceLapsed(declaredOn);
          return (
            <li key={statement(fact)} className={lapsed ? 'wcd-lapsed' : undefined}>
              {statement(fact)}
              {lapsed ? (
                <span className="wcd-note">
                  {' '}
                  Declared current as at {dateLabel(declaredOn)}, over a year ago — ask for an
                  up-to-date declaration.
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <aside className="wcd-notice" aria-label="What this does and does not mean">
        <p>
          WebCV and the Australian Government have not independently verified that these statements
          are true. A person who intentionally makes a false statement in a statutory declaration is
          guilty of an offence, punishable by up to 4 years&apos; imprisonment (section 11,
          Statutory Declarations Act 1959).
        </p>
        <p>
          To rely on these facts, ask {live.name} for the declaration itself; its QR code can be
          checked with the myGov app. WebCV is an independent service and is not affiliated with or
          endorsed by myGov or the Australian Government.
        </p>
      </aside>

      <p className="wcd-foot">
        WebCV reference {live.id} · <a href={`/${site}`}>Back to the portfolio</a>
      </p>
    </main>
  );
}
