import 'server-only';
import type { Sql } from 'postgres';
import type { CMSState, ContactMessage } from '@/cms/types/cms';
import type { Subscriber } from '@/core/newsletter/schema';
import { requireSite } from '@/core/site/tenant';
import { RevisionConflictError } from '../../contract';
import type {
  Channel,
  KvAdapter,
  KvNamespace,
  MessagesAdapter,
  OwnerRecord,
  PasskeyCredential,
  PasskeysAdapter,
  RecordListOptions,
  RecordsAdapter,
  SnapshotRead,
  StoredRecord,
  SubscribersAdapter,
} from '../../contract';
import { assertRecordAddress, decodeRecordCursor, encodeRecordCursor } from '../../contract';

/**
 * The single-site Postgres schema from `./postgres`, with a `site` column.
 *
 * Every table leads with `site` in its primary key and every statement filters
 * on it, so one database holds any number of portfolios and no query can reach
 * across them. The site is never a parameter a caller passes: it is read from
 * the request (`requireSite`), the same way the demo adapter reads its sandbox
 * from a cookie, so a route that forgets to thread it through cannot exist.
 *
 * Separate `wc_` tables rather than an altered `opb_` schema, so an existing
 * single-site database can sit alongside without either touching the other.
 */

export async function provisionSiteSchema(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS wc_sites (
      slug        text PRIMARY KEY,
      email       text NOT NULL UNIQUE,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wc_content (
      site        text NOT NULL,
      channel     text NOT NULL,
      data        jsonb NOT NULL,
      revision    integer NOT NULL DEFAULT 0,
      updated_at  timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (site, channel)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wc_owner (
      site             text PRIMARY KEY,
      email            text NOT NULL,
      passphrase_hash  text NOT NULL,
      created_at       timestamptz NOT NULL,
      session_epoch    integer NOT NULL DEFAULT 1
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wc_kv (
      site        text NOT NULL,
      ns          text NOT NULL,
      key         text NOT NULL,
      value       jsonb NOT NULL,
      expires_at  timestamptz,
      PRIMARY KEY (site, ns, key)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS wc_kv_expires_at_idx ON wc_kv (expires_at)`;
  await sql`
    CREATE TABLE IF NOT EXISTS wc_subscribers (
      site          text NOT NULL,
      id            text NOT NULL,
      requested_at  timestamptz NOT NULL,
      data          jsonb NOT NULL,
      PRIMARY KEY (site, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wc_messages (
      site         text NOT NULL,
      id           text NOT NULL,
      received_at  timestamptz NOT NULL,
      data         jsonb NOT NULL,
      PRIMARY KEY (site, id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS wc_messages_received_at_idx ON wc_messages (site, received_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wc_passkeys (
      site        text NOT NULL,
      id          text NOT NULL,
      updated_at  timestamptz NOT NULL DEFAULT now(),
      data        jsonb NOT NULL,
      PRIMARY KEY (site, id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wc_records (
      site        text NOT NULL,
      collection  text NOT NULL,
      id          text NOT NULL,
      data        jsonb NOT NULL,
      revision    integer NOT NULL DEFAULT 0,
      updated_at  timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (site, collection, id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS wc_records_updated_idx
      ON wc_records (site, collection, updated_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS wc_singletons (
      site        text NOT NULL,
      collection  text NOT NULL,
      data        jsonb NOT NULL,
      PRIMARY KEY (site, collection)
    )
  `;
}

/* ------------------------------------------------------------------ sites */

export interface SiteRow {
  slug: string;
  email: string;
  createdAt: string;
}

export async function findSiteBySlug(sql: Sql, slug: string): Promise<SiteRow | null> {
  const rows = await sql<{ slug: string; email: string; created_at: Date }[]>`
    SELECT slug, email, created_at FROM wc_sites WHERE slug = ${slug}
  `;
  const row = rows[0];
  return row ? { slug: row.slug, email: row.email, createdAt: new Date(row.created_at).toISOString() } : null;
}

export async function findSiteByEmail(sql: Sql, email: string): Promise<SiteRow | null> {
  const rows = await sql<{ slug: string; email: string; created_at: Date }[]>`
    SELECT slug, email, created_at FROM wc_sites WHERE email = ${email}
  `;
  const row = rows[0];
  return row ? { slug: row.slug, email: row.email, createdAt: new Date(row.created_at).toISOString() } : null;
}

/** Inserts the site, or reports which of slug and email is already taken. */
export async function insertSite(
  sql: Sql,
  slug: string,
  email: string
): Promise<'ok' | 'slug-taken' | 'email-taken'> {
  const rows = await sql<{ slug: string }[]>`
    INSERT INTO wc_sites (slug, email) VALUES (${slug}, ${email})
    ON CONFLICT DO NOTHING
    RETURNING slug
  `;
  if (rows.length) return 'ok';
  return (await findSiteBySlug(sql, slug)) ? 'slug-taken' : 'email-taken';
}

export async function countSites(sql: Sql): Promise<number> {
  const rows = await sql<{ n: string }[]>`SELECT count(*)::text AS n FROM wc_sites`;
  return Number(rows[0]?.n ?? 0);
}

/* --------------------------------------------------------------- content */

export async function readSnapshot(sql: Sql, channel: Channel): Promise<CMSState | null> {
  const site = await requireSite();
  const rows = await sql<{ data: CMSState }[]>`
    SELECT data FROM wc_content WHERE site = ${site} AND channel = ${channel}
  `;
  return rows[0]?.data ?? null;
}

export async function readSnapshotMeta(sql: Sql, channel: Channel): Promise<SnapshotRead | null> {
  const site = await requireSite();
  const rows = await sql<{ data: CMSState; revision: number }[]>`
    SELECT data, revision FROM wc_content WHERE site = ${site} AND channel = ${channel}
  `;
  const row = rows[0];
  return row ? { state: row.data, revision: row.revision } : null;
}

const UNIQUE_VIOLATION = '23505';

export async function writeSnapshot(
  sql: Sql,
  channel: Channel,
  state: CMSState,
  expectedRevision?: number
): Promise<number> {
  const site = await requireSite();
  if (expectedRevision === undefined) {
    const rows = await sql<{ revision: number }[]>`
      INSERT INTO wc_content (site, channel, data, revision, updated_at)
      VALUES (${site}, ${channel}, ${sql.json(state as never)}, 1, now())
      ON CONFLICT (site, channel) DO UPDATE
        SET data = EXCLUDED.data, revision = wc_content.revision + 1, updated_at = now()
      RETURNING revision
    `;
    return rows[0].revision;
  }

  // Same single-statement conditional write as the single-site schema; see
  // `./postgres` for why an `INSERT ... ON CONFLICT ... WHERE` cannot do it.
  let rows: { revision: number }[];
  try {
    rows = await sql<{ revision: number }[]>`
      WITH updated AS (
        UPDATE wc_content
           SET data = ${sql.json(state as never)}, revision = revision + 1, updated_at = now()
         WHERE site = ${site} AND channel = ${channel} AND revision = ${expectedRevision}
        RETURNING revision
      ), inserted AS (
        INSERT INTO wc_content (site, channel, data, revision, updated_at)
        SELECT ${site}, ${channel}, ${sql.json(state as never)}, 1, now()
         WHERE ${expectedRevision} = 0
           AND NOT EXISTS (SELECT 1 FROM wc_content WHERE site = ${site} AND channel = ${channel})
        RETURNING revision
      )
      SELECT revision FROM updated UNION ALL SELECT revision FROM inserted
    `;
  } catch (err) {
    if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
      throw new RevisionConflictError(expectedRevision, 1);
    }
    throw err;
  }

  if (rows.length === 0) {
    const current = await sql<{ revision: number }[]>`
      SELECT revision FROM wc_content WHERE site = ${site} AND channel = ${channel}
    `;
    throw new RevisionConflictError(expectedRevision, current[0]?.revision ?? 0);
  }
  return rows[0].revision;
}

/* ----------------------------------------------------------------- owner */

export async function readOwner(sql: Sql): Promise<OwnerRecord | null> {
  const site = await requireSite();
  const rows = await sql<
    { email: string; passphrase_hash: string; created_at: Date; session_epoch: number }[]
  >`SELECT email, passphrase_hash, created_at, session_epoch FROM wc_owner WHERE site = ${site}`;
  const row = rows[0];
  if (!row) return null;
  return {
    email: row.email,
    passphraseHash: row.passphrase_hash,
    createdAt: new Date(row.created_at).toISOString(),
    sessionEpoch: row.session_epoch,
  };
}

export async function writeOwner(sql: Sql, owner: OwnerRecord): Promise<void> {
  const site = await requireSite();
  await sql`
    INSERT INTO wc_owner (site, email, passphrase_hash, created_at, session_epoch)
    VALUES (${site}, ${owner.email}, ${owner.passphraseHash}, ${owner.createdAt}, ${owner.sessionEpoch})
    ON CONFLICT (site) DO UPDATE SET
      email = EXCLUDED.email,
      passphrase_hash = EXCLUDED.passphrase_hash,
      session_epoch = EXCLUDED.session_epoch
  `;
  // The sign-in lookup goes by email, so it has to follow an email change.
  await sql`UPDATE wc_sites SET email = ${owner.email} WHERE slug = ${site}`;
}

/* -------------------------------------------------------------------- kv */

export function makeKvAdapter(getConnection: () => Sql): KvAdapter {
  return {
    async get<T>(ns: KvNamespace, key: string): Promise<T | null> {
      const sql = getConnection();
      const site = await requireSite();
      const rows = await sql<{ value: T }[]>`
        SELECT value FROM wc_kv
         WHERE site = ${site} AND ns = ${ns} AND key = ${key}
           AND (expires_at IS NULL OR expires_at > now())
      `;
      return rows[0]?.value ?? null;
    },

    async set<T>(ns: KvNamespace, key: string, value: T, ttlSeconds?: number): Promise<void> {
      const sql = getConnection();
      const site = await requireSite();
      const expiresAt = ttlSeconds === undefined ? null : new Date(Date.now() + ttlSeconds * 1000);
      await sql`
        INSERT INTO wc_kv (site, ns, key, value, expires_at)
        VALUES (${site}, ${ns}, ${key}, ${sql.json(value as never)}, ${expiresAt})
        ON CONFLICT (site, ns, key) DO UPDATE
          SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at
      `;
    },

    async del(ns: KvNamespace, key: string): Promise<void> {
      const sql = getConnection();
      const site = await requireSite();
      await sql`DELETE FROM wc_kv WHERE site = ${site} AND ns = ${ns} AND key = ${key}`;
    },

    async incr(ns: KvNamespace, key: string, ttlSeconds: number): Promise<number> {
      const sql = getConnection();
      const site = await requireSite();
      const rows = await sql<{ value: number }[]>`
        INSERT INTO wc_kv (site, ns, key, value, expires_at)
        VALUES (${site}, ${ns}, ${key}, '1'::jsonb, now() + ${`${ttlSeconds} seconds`}::interval)
        ON CONFLICT (site, ns, key) DO UPDATE SET
          value = CASE
            WHEN wc_kv.expires_at IS NULL OR wc_kv.expires_at > now()
              THEN ((wc_kv.value)::text::numeric + 1)::text::jsonb
            ELSE '1'::jsonb
          END,
          expires_at = CASE
            WHEN wc_kv.expires_at IS NULL OR wc_kv.expires_at > now() THEN wc_kv.expires_at
            ELSE now() + ${`${ttlSeconds} seconds`}::interval
          END
        RETURNING (value)::text::numeric AS value
      `;
      return Number(rows[0]?.value ?? 1);
    },

    async clear(ns: KvNamespace): Promise<void> {
      const sql = getConnection();
      const site = await requireSite();
      await sql`DELETE FROM wc_kv WHERE site = ${site} AND ns = ${ns}`;
    },
  };
}

/* -------------------------------------------------------------- messages */

export function makeMessagesAdapter(getConnection: () => Sql): MessagesAdapter {
  return {
    async append(message) {
      const sql = getConnection();
      const site = await requireSite();
      await sql`
        INSERT INTO wc_messages (site, id, received_at, data)
        VALUES (${site}, ${message.id}, ${message.receivedAt}, ${sql.json(message as never)})
        ON CONFLICT (site, id) DO NOTHING
      `;
    },

    async list(options) {
      const sql = getConnection();
      const site = await requireSite();
      const limit = options?.limit ?? null;
      const rows = limit
        ? await sql<{ data: ContactMessage }[]>`
            SELECT data FROM wc_messages WHERE site = ${site}
             ORDER BY received_at DESC LIMIT ${limit}
          `
        : await sql<{ data: ContactMessage }[]>`
            SELECT data FROM wc_messages WHERE site = ${site} ORDER BY received_at DESC
          `;
      return rows.map((row) => row.data);
    },

    async update(id, patch) {
      const sql = getConnection();
      const site = await requireSite();
      await sql`
        UPDATE wc_messages SET data = data || ${sql.json(patch as never)}
         WHERE site = ${site} AND id = ${id}
      `;
    },

    async remove(id) {
      const sql = getConnection();
      const site = await requireSite();
      await sql`DELETE FROM wc_messages WHERE site = ${site} AND id = ${id}`;
    },
  };
}

/* -------------------------------------------------------------- passkeys */

export function makePasskeysAdapter(getConnection: () => Sql): PasskeysAdapter {
  return {
    async list() {
      const sql = getConnection();
      const site = await requireSite();
      const rows = await sql<{ data: PasskeyCredential }[]>`
        SELECT data FROM wc_passkeys WHERE site = ${site} ORDER BY data->>'createdAt' ASC
      `;
      return rows.map((row) => row.data);
    },

    async get(id) {
      const sql = getConnection();
      const site = await requireSite();
      const rows = await sql<{ data: PasskeyCredential }[]>`
        SELECT data FROM wc_passkeys WHERE site = ${site} AND id = ${id}
      `;
      return rows[0]?.data ?? null;
    },

    async put(credential) {
      const sql = getConnection();
      const site = await requireSite();
      await sql`
        INSERT INTO wc_passkeys (site, id, updated_at, data)
        VALUES (${site}, ${credential.id}, now(), ${sql.json(credential as never)})
        ON CONFLICT (site, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
      `;
    },

    async update(id, patch) {
      const sql = getConnection();
      const site = await requireSite();
      const { id: _ignored, ...rest } = patch;
      await sql`
        UPDATE wc_passkeys SET data = data || ${sql.json(rest as never)}, updated_at = now()
         WHERE site = ${site} AND id = ${id}
      `;
    },

    async remove(id) {
      const sql = getConnection();
      const site = await requireSite();
      await sql`DELETE FROM wc_passkeys WHERE site = ${site} AND id = ${id}`;
    },
  };
}

/* --------------------------------------------------------------- records */

export function makeRecordsAdapter(getConnection: () => Sql): RecordsAdapter {
  return {
    async list(collection, options?: RecordListOptions) {
      assertRecordAddress(collection);
      const sql = getConnection();
      const site = await requireSite();
      const limit = options?.limit ?? 500;
      const offset = decodeRecordCursor(options?.cursor);
      const rows = await sql<{ id: string; revision: number; data: unknown; updated_at: Date }[]>`
        SELECT id, revision, data, updated_at FROM wc_records
         WHERE site = ${site} AND collection = ${collection}
         ORDER BY updated_at DESC
         LIMIT ${limit + 1} OFFSET ${offset}
      `;
      const page = rows.slice(0, limit);
      return {
        records: page.map((row): StoredRecord => ({
          id: row.id,
          revision: row.revision,
          data: row.data,
          updatedAt: new Date(row.updated_at).toISOString(),
        })),
        nextCursor: rows.length > limit ? encodeRecordCursor(offset + limit) : null,
      };
    },

    async get(collection, id) {
      assertRecordAddress(collection, id);
      const sql = getConnection();
      const site = await requireSite();
      const rows = await sql<{ revision: number; data: unknown; updated_at: Date }[]>`
        SELECT revision, data, updated_at FROM wc_records
         WHERE site = ${site} AND collection = ${collection} AND id = ${id}
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        id,
        revision: row.revision,
        data: row.data,
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    },

    async put(collection, id, data, expectedRevision) {
      assertRecordAddress(collection, id);
      const sql = getConnection();
      const site = await requireSite();
      if (expectedRevision === undefined) {
        const rows = await sql<{ revision: number; updated_at: Date }[]>`
          INSERT INTO wc_records (site, collection, id, data, revision, updated_at)
          VALUES (${site}, ${collection}, ${id}, ${sql.json(data as never)}, 1, now())
          ON CONFLICT (site, collection, id) DO UPDATE
            SET data = EXCLUDED.data, revision = wc_records.revision + 1, updated_at = now()
          RETURNING revision, updated_at
        `;
        return {
          id,
          revision: rows[0].revision,
          data,
          updatedAt: new Date(rows[0].updated_at).toISOString(),
        };
      }

      const rows = await sql<{ revision: number; updated_at: Date }[]>`
        WITH updated AS (
          UPDATE wc_records
             SET data = ${sql.json(data as never)}, revision = revision + 1, updated_at = now()
           WHERE site = ${site} AND collection = ${collection} AND id = ${id}
             AND revision = ${expectedRevision}
         RETURNING revision, updated_at
        ), inserted AS (
          INSERT INTO wc_records (site, collection, id, data, revision, updated_at)
          SELECT ${site}, ${collection}, ${id}, ${sql.json(data as never)}, 1, now()
           WHERE ${expectedRevision} = 0
             AND NOT EXISTS (
               SELECT 1 FROM wc_records
                WHERE site = ${site} AND collection = ${collection} AND id = ${id}
             )
         RETURNING revision, updated_at
        )
        SELECT revision, updated_at FROM updated UNION ALL SELECT revision, updated_at FROM inserted
      `;
      if (rows.length === 0) {
        const current = await sql<{ revision: number }[]>`
          SELECT revision FROM wc_records
           WHERE site = ${site} AND collection = ${collection} AND id = ${id}
        `;
        throw new RevisionConflictError(expectedRevision, current[0]?.revision ?? 0);
      }
      return {
        id,
        revision: rows[0].revision,
        data,
        updatedAt: new Date(rows[0].updated_at).toISOString(),
      };
    },

    async remove(collection, id) {
      assertRecordAddress(collection, id);
      const sql = getConnection();
      const site = await requireSite();
      await sql`
        DELETE FROM wc_records WHERE site = ${site} AND collection = ${collection} AND id = ${id}
      `;
    },

    async collections() {
      const sql = getConnection();
      const site = await requireSite();
      const rows = await sql<{ collection: string }[]>`
        SELECT DISTINCT collection FROM wc_records WHERE site = ${site} ORDER BY collection ASC
      `;
      return rows.map((row) => row.collection);
    },

    async getSingleton(collection) {
      assertRecordAddress(collection);
      const sql = getConnection();
      const site = await requireSite();
      const rows = await sql<{ data: unknown }[]>`
        SELECT data FROM wc_singletons WHERE site = ${site} AND collection = ${collection}
      `;
      return rows[0]?.data ?? null;
    },

    async putSingleton(collection, data) {
      assertRecordAddress(collection);
      const sql = getConnection();
      const site = await requireSite();
      await sql`
        INSERT INTO wc_singletons (site, collection, data)
        VALUES (${site}, ${collection}, ${sql.json(data as never)})
        ON CONFLICT (site, collection) DO UPDATE SET data = EXCLUDED.data
      `;
    },
  };
}

/* ----------------------------------------------------------- subscribers */

export function makeSubscribersAdapter(getConnection: () => Sql): SubscribersAdapter {
  return {
    async append(subscriber) {
      const sql = getConnection();
      const site = await requireSite();
      await sql`
        INSERT INTO wc_subscribers (site, id, requested_at, data)
        VALUES (${site}, ${subscriber.id}, ${subscriber.requestedAt}, ${sql.json(subscriber as never)})
        ON CONFLICT (site, id) DO NOTHING
      `;
    },

    async list() {
      const sql = getConnection();
      const site = await requireSite();
      const rows = await sql<{ data: Subscriber }[]>`
        SELECT data FROM wc_subscribers WHERE site = ${site} ORDER BY requested_at DESC
      `;
      return rows.map((row) => row.data);
    },

    async update(id, patch) {
      const sql = getConnection();
      const site = await requireSite();
      await sql`
        UPDATE wc_subscribers SET data = data || ${sql.json(patch as never)}
         WHERE site = ${site} AND id = ${id}
      `;
    },

    async remove(id) {
      const sql = getConnection();
      const site = await requireSite();
      await sql`DELETE FROM wc_subscribers WHERE site = ${site} AND id = ${id}`;
    },
  };
}
