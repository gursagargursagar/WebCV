import 'server-only';
import { BlobNotFoundError, copy, del, head, list, put } from '@vercel/blob';
import type { MediaAdapter, StorageAdapter } from '../contract';
import { AdapterConfigError } from '../contract';
import { requireSite } from '@/core/site/tenant';
import { getSql, health } from './_shared/postgres';
import {
  makeKvAdapter,
  makeMessagesAdapter,
  makePasskeysAdapter,
  makeRecordsAdapter,
  makeSubscribersAdapter,
  provisionSiteSchema,
  readOwner,
  readSnapshot,
  readSnapshotMeta,
  writeOwner,
  writeSnapshot,
} from './_shared/postgres-sites';

/**
 * WebCV: many portfolios in one Postgres database, uploads in Vercel Blob.
 *
 * The Neon adapter with every row and every file scoped to the site the
 * request is for. Any Postgres reachable by connection string works — Railway,
 * Neon, Supabase — because nothing here is provider-specific.
 */

function configuredUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL
  );
}

/** Whether a database is configured at all, for screens that can say so plainly. */
export function hasDatabase(): boolean {
  return Boolean(configuredUrl());
}

function connectionString(): string {
  const url = configuredUrl();
  if (!url) {
    throw new AdapterConfigError(
      'WebCV needs a Postgres database. Set DATABASE_URL to its connection string.'
    );
  }
  return url;
}

export function sitesSql() {
  return getSql(connectionString());
}

function blobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new AdapterConfigError(
      'Uploads need a Vercel Blob store. Connect one to the project, which sets ' +
        'BLOB_READ_WRITE_TOKEN.'
    );
  }
  return token;
}

/**
 * Keys are stored under `<site>/`, and handed back without it, so the rest of
 * the app sees the same keys it always did and no site can name another's file.
 */
async function scoped(key: string): Promise<string> {
  return `${await requireSite()}/${key.replace(/^\/+/, '')}`;
}

/**
 * Copies one portfolio's uploads to another address, for a move. The
 * originals stay where they were until someone removes them.
 */
export async function copySiteMedia(from: string, to: string): Promise<number> {
  // No Blob store (a local database without uploads): nothing to copy.
  if (!process.env.BLOB_READ_WRITE_TOKEN) return 0;
  let copied = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ token: blobToken(), prefix: `${from}/`, cursor });
    for (const blob of page.blobs) {
      await copy(blob.url, `${to}/${blob.pathname.slice(from.length + 1)}`, {
        access: 'public',
        token: blobToken(),
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      copied++;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return copied;
}

const media: MediaAdapter = {
  async put(key, data, mimeType) {
    const result = await put(await scoped(key), data as unknown as Blob, {
      access: 'public',
      contentType: mimeType,
      token: blobToken(),
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return {
      key,
      url: result.url,
      mimeType,
      sizeBytes: data.byteLength,
      uploadedAt: new Date().toISOString(),
    };
  },

  async resolveUrl(key) {
    try {
      const found = await head(await scoped(key), { token: blobToken() });
      return found?.url ?? null;
    } catch (err) {
      if (err instanceof BlobNotFoundError) return null;
      throw err;
    }
  },

  async remove(key) {
    try {
      await del(await scoped(key), { token: blobToken() });
    } catch (err) {
      if (err instanceof BlobNotFoundError) return;
      throw err;
    }
  },

  async list() {
    const prefix = `${await requireSite()}/`;
    const out = [];
    let cursor: string | undefined;
    do {
      const page = await list({ token: blobToken(), prefix, cursor });
      for (const blob of page.blobs) {
        out.push({
          key: blob.pathname.slice(prefix.length),
          url: blob.url,
          mimeType: 'application/octet-stream',
          sizeBytes: blob.size,
          uploadedAt: new Date(blob.uploadedAt).toISOString(),
        });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out;
  },
};

export const webcvAdapter: StorageAdapter = {
  id: 'neon',
  displayName: 'WebCV (Postgres + Vercel Blob)',
  docsUrl: 'https://www.webcv.au',

  capabilities: {
    durable: true,
    auth: 'none',
    fileStorage: 'presigned',
    maxUploadBytes: 100 * 1024 * 1024,
    fullTextSearch: true,
    realtime: false,
    transactions: true,
    worksOnEphemeralHosts: true,
  },

  health: () => health(sitesSql(), 'Postgres'),

  async provision() {
    await provisionSiteSchema(sitesSql());
  },

  readSnapshot: (channel) => readSnapshot(sitesSql(), channel),
  readSnapshotMeta: (channel) => readSnapshotMeta(sitesSql(), channel),
  writeSnapshot: (channel, state, expected) => writeSnapshot(sitesSql(), channel, state, expected),
  readOwner: () => readOwner(sitesSql()),
  writeOwner: (owner) => writeOwner(sitesSql(), owner),

  kv: makeKvAdapter(sitesSql),
  media,
  messages: makeMessagesAdapter(sitesSql),
  subscribers: makeSubscribersAdapter(sitesSql),
  passkeys: makePasskeysAdapter(sitesSql),
  records: makeRecordsAdapter(sitesSql),
};
