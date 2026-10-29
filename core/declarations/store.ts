import 'server-only';
import { randomBytes } from 'node:crypto';
import { getStorageAdapter } from '@/core/storage/registry';
import { sitesSql } from '@/core/storage/adapters/webcv';
import { fingerprint, type Fact } from './facts';
import type { PriceKind } from './price';

/**
 * Statutory declarations, across every portfolio.
 *
 * One platform table rather than per-site records, because the review queue
 * reads all of them. The uploaded PDF sits here only until it is reviewed —
 * approving or rejecting deletes it — so what remains is the declared facts,
 * a fingerprint of them, the myGov reference and the dates.
 */

export type DeclarationStatus =
  | 'draft' // facts entered
  | 'ready' // PDF uploaded, not paid
  | 'submitted' // card held, waiting for review
  | 'approved'
  | 'rejected'
  | 'lapsed' // the card hold expired before review
  | 'withdrawn'; // the owner took the badge down

export interface Declaration {
  id: string;
  site: string;
  status: DeclarationStatus;
  name: string;
  facts: Fact[];
  fingerprint: string;
  priceCents: number;
  priceKind: PriceKind | '';
  hasPdf: boolean;
  pdfName: string | null;
  pdfBytes: number | null;
  checkoutId: string | null;
  paymentId: string | null;
  mygovRef: string | null;
  declaredOn: string | null;
  rejectReason: string | null;
  createdAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** Card authorisations lapse after about seven days; review inside six. */
export const HOLD_DAYS = 6;

let provisioned: Promise<void> | null = null;

async function db() {
  await getStorageAdapter();
  const sql = sitesSql();
  provisioned ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS wc_declarations (
        id             text PRIMARY KEY,
        site           text NOT NULL,
        status         text NOT NULL,
        name           text NOT NULL DEFAULT '',
        facts          jsonb NOT NULL DEFAULT '[]'::jsonb,
        fingerprint    text NOT NULL DEFAULT '',
        price_cents    integer NOT NULL DEFAULT 0,
        price_kind     text NOT NULL DEFAULT '',
        pdf            bytea,
        pdf_name       text,
        pdf_bytes      integer,
        checkout_id    text,
        payment_id     text,
        mygov_ref      text,
        declared_on    date,
        reject_reason  text,
        reviewer       text,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now(),
        submitted_at   timestamptz,
        reviewed_at    timestamptz
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS wc_declarations_site_idx ON wc_declarations (site, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS wc_declarations_status_idx ON wc_declarations (status, submitted_at)`;
  })().catch((err) => {
    provisioned = null;
    throw err;
  });
  await provisioned;
  return sql;
}

/* Every column but the PDF itself. */
type Row = {
  id: string;
  site: string;
  status: DeclarationStatus;
  name: string;
  facts: Fact[];
  fingerprint: string;
  price_cents: number;
  price_kind: PriceKind | '';
  has_pdf: boolean;
  pdf_name: string | null;
  pdf_bytes: number | null;
  checkout_id: string | null;
  payment_id: string | null;
  mygov_ref: string | null;
  declared_on: Date | string | null;
  reject_reason: string | null;
  created_at: Date;
  submitted_at: Date | null;
  reviewed_at: Date | null;
};

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toDeclaration(row: Row): Declaration {
  return {
    id: row.id,
    site: row.site,
    status: row.status,
    name: row.name,
    facts: Array.isArray(row.facts) ? row.facts : [],
    fingerprint: row.fingerprint,
    priceCents: row.price_cents,
    priceKind: row.price_kind,
    hasPdf: row.has_pdf,
    pdfName: row.pdf_name,
    pdfBytes: row.pdf_bytes,
    checkoutId: row.checkout_id,
    paymentId: row.payment_id,
    mygovRef: row.mygov_ref,
    declaredOn: row.declared_on ? iso(row.declared_on)!.slice(0, 10) : null,
    rejectReason: row.reject_reason,
    createdAt: row.created_at.toISOString(),
    submittedAt: iso(row.submitted_at),
    reviewedAt: iso(row.reviewed_at),
  };
}

type Sql = Awaited<ReturnType<typeof db>>;

function select(sql: Sql) {
  return sql`
    id, site, status, name, facts, fingerprint, price_cents, price_kind,
    (pdf IS NOT NULL) AS has_pdf, pdf_name, pdf_bytes, checkout_id, payment_id,
    mygov_ref, declared_on, reject_reason, created_at, submitted_at, reviewed_at
  `;
}

const OPEN: DeclarationStatus[] = ['draft', 'ready', 'submitted'];

/** The declaration this portfolio is working on, if any. */
export async function openDeclaration(site: string): Promise<Declaration | null> {
  const sql = await db();
  const rows = await sql<Row[]>`
    SELECT ${select(sql)} FROM wc_declarations
    WHERE site = ${site} AND status IN ${sql(OPEN)}
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] ? toDeclaration(rows[0]) : null;
}

/** The most recent declaration of any status, for showing what happened last. */
export async function latestDeclaration(site: string): Promise<Declaration | null> {
  const sql = await db();
  const rows = await sql<Row[]>`
    SELECT ${select(sql)} FROM wc_declarations
    WHERE site = ${site} ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] ? toDeclaration(rows[0]) : null;
}

/** The approved declaration a portfolio shows, if it shows one. */
export async function liveDeclaration(site: string): Promise<Declaration | null> {
  const sql = await db();
  const rows = await sql<Row[]>`
    SELECT ${select(sql)} FROM wc_declarations
    WHERE site = ${site} AND status = 'approved'
    ORDER BY reviewed_at DESC LIMIT 1
  `;
  return rows[0] ? toDeclaration(rows[0]) : null;
}

export async function approvedCounts(site: string): Promise<{ site: number; total: number }> {
  const sql = await db();
  const [row] = await sql<{ site: number; total: number }[]>`
    SELECT
      count(*) FILTER (WHERE site = ${site})::int AS site,
      count(*)::int AS total
    FROM wc_declarations WHERE status IN ('approved', 'withdrawn')
  `;
  return row ?? { site: 0, total: 0 };
}

export class DeclarationStateError extends Error {}

/**
 * Saves the facts. Changing what is declared after a PDF was uploaded drops
 * the PDF: it no longer matches.
 */
export async function saveFacts(site: string, name: string, facts: Fact[]): Promise<Declaration> {
  const sql = await db();
  const print = fingerprint(name, facts);
  const open = await openDeclaration(site);
  if (open?.status === 'submitted') {
    throw new DeclarationStateError('This declaration is being checked and cannot be changed.');
  }
  if (open) {
    const changed = open.fingerprint !== print;
    await sql`
      UPDATE wc_declarations SET
        name = ${name},
        facts = ${sql.json(facts as never)},
        fingerprint = ${print},
        pdf = CASE WHEN ${changed} THEN NULL ELSE pdf END,
        pdf_name = CASE WHEN ${changed} THEN NULL ELSE pdf_name END,
        pdf_bytes = CASE WHEN ${changed} THEN NULL ELSE pdf_bytes END,
        checkout_id = CASE WHEN ${changed} THEN NULL ELSE checkout_id END,
        status = CASE WHEN ${changed} THEN 'draft' ELSE status END,
        updated_at = now()
      WHERE id = ${open.id}
    `;
    return (await openDeclaration(site))!;
  }
  const id = `wcd_${randomBytes(9).toString('base64url')}`;
  await sql`
    INSERT INTO wc_declarations (id, site, status, name, facts, fingerprint)
    VALUES (${id}, ${site}, 'draft', ${name}, ${sql.json(facts as never)}, ${print})
  `;
  return (await openDeclaration(site))!;
}

export async function attachPdf(
  site: string,
  id: string,
  bytes: Uint8Array,
  fileName: string
): Promise<void> {
  const sql = await db();
  const rows = await sql`
    UPDATE wc_declarations SET
      pdf = ${Buffer.from(bytes)}, pdf_name = ${fileName.slice(0, 120)},
      pdf_bytes = ${bytes.byteLength}, status = 'ready', checkout_id = NULL, updated_at = now()
    WHERE id = ${id} AND site = ${site} AND status IN ('draft', 'ready')
      AND jsonb_array_length(facts) > 0
    RETURNING id
  `;
  if (rows.length === 0)
    throw new DeclarationStateError('There is no declaration to attach this to.');
}

export async function setCheckout(
  id: string,
  checkoutId: string,
  priceCents: number,
  priceKind: PriceKind
): Promise<void> {
  const sql = await db();
  await sql`
    UPDATE wc_declarations SET checkout_id = ${checkoutId}, price_cents = ${priceCents},
      price_kind = ${priceKind}, updated_at = now()
    WHERE id = ${id} AND status = 'ready'
  `;
}

/** The card is held: into the review queue. Idempotent. */
/**
 * `heldAt` is when the card was authorised. The review deadline counts from
 * it, not from whenever WebCV noticed the hold — which, for an owner who closed
 * the tab at Stripe, may be days later, with the hold already running out.
 */
export async function markSubmitted(
  id: string,
  paymentId: string,
  heldAt?: Date
): Promise<boolean> {
  const sql = await db();
  const rows = await sql`
    UPDATE wc_declarations SET status = 'submitted', payment_id = ${paymentId},
      submitted_at = COALESCE(${heldAt ?? null}::timestamptz, now()), updated_at = now()
    WHERE id = ${id} AND status = 'ready' AND pdf IS NOT NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function discardDraft(site: string, id: string): Promise<void> {
  const sql = await db();
  await sql`DELETE FROM wc_declarations WHERE id = ${id} AND site = ${site} AND status IN ('draft', 'ready')`;
}

export async function withdraw(site: string, id: string): Promise<void> {
  const sql = await db();
  await sql`
    UPDATE wc_declarations SET status = 'withdrawn', updated_at = now()
    WHERE id = ${id} AND site = ${site} AND status = 'approved'
  `;
}

/* ------------------------------------------------------------ the queue */

export async function getDeclaration(id: string): Promise<Declaration | null> {
  const sql = await db();
  const rows = await sql<Row[]>`SELECT ${select(sql)} FROM wc_declarations WHERE id = ${id}`;
  return rows[0] ? toDeclaration(rows[0]) : null;
}

/** Waiting for review, oldest hold first; and paid-for-but-unconfirmed ones to re-check. */
export async function reviewQueue(): Promise<{
  waiting: Declaration[];
  unconfirmed: Declaration[];
}> {
  const sql = await db();
  const waiting = await sql<Row[]>`
    SELECT ${select(sql)} FROM wc_declarations
    WHERE status = 'submitted' ORDER BY submitted_at ASC LIMIT 200
  `;
  const unconfirmed = await sql<Row[]>`
    SELECT ${select(sql)} FROM wc_declarations
    WHERE status = 'ready' AND checkout_id IS NOT NULL
      AND updated_at > now() - interval '2 days'
    ORDER BY updated_at ASC LIMIT 50
  `;
  return { waiting: waiting.map(toDeclaration), unconfirmed: unconfirmed.map(toDeclaration) };
}

export async function recentlyReviewed(limit = 20): Promise<Declaration[]> {
  const sql = await db();
  const rows = await sql<Row[]>`
    SELECT ${select(sql)} FROM wc_declarations
    WHERE reviewed_at IS NOT NULL ORDER BY reviewed_at DESC LIMIT ${limit}
  `;
  return rows.map(toDeclaration);
}

export async function readPdf(id: string): Promise<{ bytes: Buffer; name: string } | null> {
  const sql = await db();
  const rows = await sql<{ pdf: Buffer | null; pdf_name: string | null }[]>`
    SELECT pdf, pdf_name FROM wc_declarations WHERE id = ${id} AND status = 'submitted'
  `;
  const row = rows[0];
  return row?.pdf ? { bytes: row.pdf, name: row.pdf_name ?? 'declaration.pdf' } : null;
}

/** Ends a review: the PDF goes either way. */
export async function finishReview(
  id: string,
  outcome:
    | { status: 'approved'; mygovRef: string; declaredOn: string }
    | { status: 'rejected' | 'lapsed'; reason: string },
  reviewer: string
): Promise<boolean> {
  const sql = await db();
  const rows =
    outcome.status === 'approved'
      ? await sql`
          UPDATE wc_declarations SET status = 'approved', mygov_ref = ${outcome.mygovRef},
            declared_on = ${outcome.declaredOn}, pdf = NULL, reviewer = ${reviewer},
            reviewed_at = now(), updated_at = now()
          WHERE id = ${id} AND status = 'submitted' RETURNING id
        `
      : await sql`
          UPDATE wc_declarations SET status = ${outcome.status}, reject_reason = ${outcome.reason},
            pdf = NULL, reviewer = ${reviewer}, reviewed_at = now(), updated_at = now()
          WHERE id = ${id} AND status = 'submitted' RETURNING id
        `;
  return rows.length > 0;
}
