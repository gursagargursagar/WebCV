# WebCV

www.webcv.au is a portfolio builder for many people. It is built on
[Open Portfolio](https://github.com/ShadmanArafin/open_portfolio) (MIT), with
multi-user support added.

| Address | What it is |
| --- | --- |
| `/` | Front page. |
| `/signup` | Choose an address and create an account. |
| `/admin` | The editor for the portfolio you are signed in to. |
| `/<name>` | Someone's published portfolio. |
| `/gursagar24` | A static page, served from `public/gursagar24`. |

## How it works

- **Routing (`proxy.ts`)**
  - A request to `/<name>/...` is rewritten to the normal single-site route.
  - The proxy passes the name along in the `x-webcv-site` header. Any copy of that header sent by the browser is removed first.
  - `/admin` and its APIs find the portfolio from the `wc_site` cookie. The session stored for that portfolio still decides whether the request is allowed.
- **Storage (`core/storage/adapters/webcv.ts`)**
  - All portfolios share one Postgres database. Every table has a `site` column in its primary key.
  - Uploads are stored in Vercel Blob under `<name>/`.
  - The current site is read from the request (`core/site/tenant.ts`). Code never passes it around as an argument.
- **Links (`core/site/link.tsx`)**
  - Links on public portfolios are given the `/<name>` prefix.
  - A click guard catches any plain link the prefixing missed.
- **Caching**
  - Pages are rendered on each request: `cacheComponents` is off and the root layout uses `force-dynamic`.
  - This is required because every portfolio uses the same internal paths.

## Environment variables

| Variable | Value |
| --- | --- |
| `WEBCV_MULTI_SITE` | `1` |
| `DATABASE_URL` | Postgres connection string (Railway, Neon or any other Postgres) |
| `BLOB_READ_WRITE_TOKEN` | Set automatically when a Vercel Blob store is connected |
| `OPB_SITE_URL` | `https://www.webcv.au` |

The tables (`wc_*`) are created automatically on the first request.
