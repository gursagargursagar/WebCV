import type { Metadata } from 'next';
import { requireOwner } from '@/core/auth/guard';
import { requireSite } from '@/core/site/tenant';
import { declarationText, statements, type Fact } from '@/core/declarations/facts';
import {
  formatAud,
  FOUNDING_LIMIT,
  priceFor,
  REDECLARE_PRICE_CENTS,
} from '@/core/declarations/price';
import {
  approvedCounts,
  HOLD_DAYS,
  latestDeclaration,
  liveDeclaration,
  openDeclaration,
} from '@/core/declarations/store';
import { syncCheckout } from '@/core/declarations/service';
import { extractionAvailable } from '@/core/declarations/extract';
import { stripeConfigured, stripeTestMode } from '@/core/payments/stripe';
import {
  CopyStatements,
  DiscardDraft,
  FactsForm,
  PdfUpload,
  SubmitForCheck,
  WithdrawBadge,
  type FactDraft,
} from './declaration-client';

export const metadata: Metadata = {
  title: 'Statutory declaration',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * A statutory declaration behind the portfolio's career facts.
 *
 * The person makes the declaration themselves, free, in myGov; WebCV turns
 * their facts into fixed sentences, checks the PDF myGov gives them, and shows
 * a badge. Four steps on one screen, each card appearing once the one before
 * it is done, so there is never a question of what comes next.
 */

const MYGOV_HELP =
  'https://my.gov.au/en/about/help/digital-id/commonwealth-statutory-declarations/create-a-digital-commonwealth-statutory-declaration-through-mygov';

function toDraft(fact: Fact): FactDraft {
  return {
    employer: '',
    role: '',
    from: '',
    to: '',
    qualification: '',
    institution: '',
    year: '',
    name: '',
    issuer: '',
    number: '',
    ...fact,
  };
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function Statements({ facts }: { facts: Fact[] }) {
  return (
    <ol className="m-0 grid list-decimal gap-2 pl-6 text-sm">
      {statements(facts).map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

export default async function DeclarationPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  await requireOwner();
  const site = await requireSite();
  const { checkout } = await searchParams;

  let open = await openDeclaration(site);
  if (open) open = await syncCheckout(open);
  const [live, latest, counts] = await Promise.all([
    liveDeclaration(site),
    latestDeclaration(site),
    approvedCounts(site),
  ]);
  const price = priceFor({ approvedForSite: counts.site, approvedTotal: counts.total });
  const payments = stripeConfigured();
  const ended =
    !open && latest && (latest.status === 'rejected' || latest.status === 'lapsed') ? latest : null;

  // A new declaration starts from the last approved one: declaring again is
  // usually one changed line.
  const seed = open ?? live;
  const initialFacts = seed ? seed.facts.map(toDraft) : [];
  const editing = !open || open.status === 'draft' || open.status === 'ready';

  return (
    <div className="grid gap-6" style={{ maxWidth: 'var(--measure)' }}>
      <div>
        <p className="m-0 font-mono text-xs uppercase tracking-widest text-text-muted">Profile</p>
        <h1 className="font-display m-0 mt-1 text-3xl">Statutory declaration</h1>
        <p className="m-0 mt-1 text-text-secondary">
          Back your jobs, qualifications and licences with a Commonwealth statutory declaration, and
          show employers a badge on your portfolio. You make the declaration yourself in myGov; we
          prepare the wording, check the document and add the badge.
        </p>
      </div>

      <section
        aria-label="Price"
        className="grid gap-2 rounded-2xl border border-border bg-surface-secondary p-4"
      >
        <p className="m-0 font-semibold">
          {formatAud(price.cents)}
          {price.kind === 'founding'
            ? ` — founding price for the first ${FOUNDING_LIMIT} declarations (then A$19)`
            : price.kind === 'redeclare'
              ? ' to declare again'
              : ''}
        </p>
        <p className="m-0 text-sm text-text-secondary">
          myGov is a free Australian Government service. WebCV&apos;s fee covers preparing your
          statements, checking the document and showing the badge. Your card is only held when you
          submit, and charged only if we approve it. Declaring again after a change costs{' '}
          {formatAud(REDECLARE_PRICE_CENTS)}.
        </p>
        {payments && stripeTestMode() ? (
          <p className="m-0 text-sm text-text-muted">Test mode: no real card is charged.</p>
        ) : null}
      </section>

      {checkout === 'cancelled' ? (
        <p role="status" className="m-0 rounded-2xl border border-border p-4 text-sm">
          Payment cancelled — nothing was held. Submit again whenever you are ready.
        </p>
      ) : null}

      {live ? (
        <section
          aria-label="On your portfolio"
          className="grid gap-3 rounded-2xl border border-border p-4"
        >
          <h2 className="m-0 text-xl">On your portfolio</h2>
          <p className="m-0 text-sm text-text-secondary">
            Declared {live.declaredOn ? dateLabel(live.declaredOn) : ''}, checked{' '}
            {live.reviewedAt ? dateLabel(live.reviewedAt) : ''}. Visitors see these statements and a
            note that WebCV did not verify them.
          </p>
          <Statements facts={live.facts} />
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/${site}/declaration`}
              className="rounded-full border border-border px-4 text-sm text-text-secondary no-underline"
              style={{ display: 'inline-flex', minHeight: 44, alignItems: 'center' }}
            >
              View the public page
            </a>
            <WithdrawBadge />
          </div>
        </section>
      ) : null}

      {ended ? (
        <section
          role="status"
          aria-label="Last declaration"
          className="grid gap-2 rounded-2xl border border-border p-4"
        >
          <h2 className="m-0 text-xl">
            {ended.status === 'lapsed'
              ? 'Your last submission timed out'
              : 'Your last declaration was not approved'}
          </h2>
          <p className="m-0 text-sm text-text-secondary">{ended.rejectReason}</p>
          <p className="m-0 text-sm text-text-secondary">
            You were not charged, and the PDF has been deleted. You can start again below.
          </p>
        </section>
      ) : null}

      {open?.status === 'submitted' ? (
        <section
          aria-label="Being checked"
          className="grid gap-3 rounded-2xl border border-border p-4"
        >
          <h2 className="m-0 text-xl">Being checked</h2>
          <p className="m-0 text-sm text-text-secondary">
            Submitted {open.submittedAt ? dateLabel(open.submittedAt) : ''}. We check the
            document&apos;s QR code with the myGov app, usually within two business days and always
            within {HOLD_DAYS}. {formatAud(open.priceCents)} is held on your card and is only taken
            if we approve it.
          </p>
          <Statements facts={open.facts} />
        </section>
      ) : (
        <>
          <section
            aria-labelledby="facts-title"
            className="grid gap-3 rounded-2xl border border-border p-4"
          >
            <div>
              <h2 id="facts-title" className="m-0 text-xl">
                1. Your facts
              </h2>
              <p className="m-0 text-sm text-text-secondary">
                Facts only: where you worked and when, what you studied, which licences you hold.
                Each becomes one fixed sentence. Add only what you can prove if asked.
              </p>
            </div>
            <FactsForm
              key={open?.fingerprint ?? 'new'}
              initialName={seed?.name ?? ''}
              initialFacts={initialFacts}
              canExtract={extractionAvailable()}
              locked={!editing}
            />
          </section>

          {open && open.facts.length > 0 ? (
            <section
              aria-labelledby="mygov-title"
              className="grid gap-3 rounded-2xl border border-border p-4"
            >
              <div>
                <h2 id="mygov-title" className="m-0 text-xl">
                  2. Make the declaration in myGov
                </h2>
                <p className="m-0 text-sm text-text-secondary">
                  These are the statements to declare, word for word:
                </p>
              </div>
              <Statements facts={open.facts} />
              <div>
                <CopyStatements text={declarationText(open.facts)} />
              </div>
              <ol className="m-0 grid list-decimal gap-2 pl-6 text-sm text-text-secondary">
                <li>
                  Sign in to myGov with a Digital ID (such as myID) at Standard or Strong strength.
                </li>
                <li>
                  Start a Commonwealth statutory declaration — the button below opens myGov&apos;s
                  page for it.
                </li>
                <li>Paste the statements exactly as above. Do not add or change anything.</li>
                <li>Finish the declaration and download the PDF myGov gives you.</li>
              </ol>
              <div>
                <a
                  href={MYGOV_HELP}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border px-4 text-sm text-text-secondary no-underline"
                  style={{ display: 'inline-flex', minHeight: 44, alignItems: 'center' }}
                >
                  Open myGov statutory declarations
                </a>
              </div>
            </section>
          ) : null}

          {open && open.facts.length > 0 ? (
            <section
              aria-labelledby="submit-title"
              className="grid gap-3 rounded-2xl border border-border p-4"
            >
              <div>
                <h2 id="submit-title" className="m-0 text-xl">
                  3. Upload the PDF and submit
                </h2>
                <p className="m-0 text-sm text-text-secondary">
                  We keep the PDF privately only until it is checked, then delete it. What stays is
                  the list of statements, the myGov reference and the dates.
                </p>
              </div>
              <PdfUpload current={open.pdfName} />
              {open.status === 'ready' ? (
                payments ? (
                  <SubmitForCheck priceLabel={formatAud(price.cents)} />
                ) : (
                  <p role="status" className="m-0 text-sm text-text-secondary">
                    Submitting opens soon — your facts and PDF are saved until then.
                  </p>
                )
              ) : null}
              <div>
                <DiscardDraft />
              </div>
            </section>
          ) : null}
        </>
      )}

      <p className="m-0 text-xs text-text-muted">
        WebCV does not give legal advice. A person who intentionally makes a false statement in a
        statutory declaration is guilty of an offence, punishable by up to 4 years&apos;
        imprisonment (section 11, Statutory Declarations Act 1959). WebCV is not affiliated with or
        endorsed by myGov or the Australian Government.
      </p>
    </div>
  );
}
