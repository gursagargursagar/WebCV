/**
 * IndexNow: tells Bing, Yandex, Seznam and Naver the moment a page changes,
 * instead of waiting for their crawlers to come back. (Google does not take
 * part; it reads the sitemap.)
 *
 * The key is public by design — the protocol proves ownership by serving it
 * from the site, at `/indexnow-<key>.txt` in `public/`.
 */
export const INDEXNOW_KEY = '8e771bd76d680d4d17428bd17dfc3733';

function origin(): string | null {
  const url = process.env.OPB_SITE_URL?.trim().replace(/\/$/, '');
  return url && url.startsWith('https://') ? url : null;
}

/** Best-effort: a slow or failed ping never blocks a publish. */
export async function pingIndexNow(paths: string[]): Promise<void> {
  const base = origin();
  if (!base || process.env.NODE_ENV !== 'production' || paths.length === 0) return;
  const host = new URL(base).host;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${base}/indexnow-${INDEXNOW_KEY}.txt`,
        urlList: paths.slice(0, 10_000).map((p) => `${base}${p}`),
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.warn('[indexnow] Ping failed.', (err as Error).message);
  }
}
