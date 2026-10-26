import postgres, { type Sql } from 'postgres';

/**
 * Which addresses of a portfolio the Studio serves, for the proxy.
 *
 * The proxy runs before the storage layer and must not import it, so this
 * keeps its own one-connection client and asks one narrow question: the page
 * addresses of the site's published Studio document, or null when there is
 * none (the classic site answers instead). Answers are remembered briefly per
 * instance — a publish shows up within seconds, and a busy page does not cost
 * a query per request.
 */

const TTL_MS = 5_000;
const cache = new Map<string, { at: number; slugs: Set<string> | null }>();
let sql: Sql | null = null;

function databaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL
  );
}

export async function studioSlugs(site: string): Promise<Set<string> | null> {
  const url = databaseUrl();
  if (!url) return null;

  const hit = cache.get(site);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.slugs;

  sql ??= postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 5, prepare: false });
  try {
    const rows = await sql<{ slugs: string[] | null }[]>`
      SELECT ARRAY(SELECT p->>'slug' FROM jsonb_array_elements(data->'pages') AS p) AS slugs
        FROM wc_records
       WHERE site = ${site} AND collection = 'studio' AND id = 'published'
    `;
    const slugs = rows[0]?.slugs ? new Set(rows[0].slugs) : null;
    if (cache.size > 1000) cache.clear();
    cache.set(site, { at: Date.now(), slugs });
    return slugs;
  } catch (err) {
    // A missing table or a database hiccup: serve the classic site rather
    // than an error page.
    console.warn('[studio] Route lookup failed; serving the classic site.', (err as Error).message);
    return null;
  }
}
