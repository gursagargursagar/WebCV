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

## Design: the Swiss Cheese AI skin

WebCV uses the look of [swisscheeseai.au](https://www.swisscheeseai.au)
(source: `gursagargursagar/scai-website`).

| Element | Swiss Cheese AI style |
| --- | --- |
| Colours | Near-black `#050505` and paper `#f5f3f2`, with one cyan accent `#20c4dc` |
| Type | Georgia headlines, Inter text, SF Mono labels |
| Shapes | 4px corners and 1px rules |

Where it applies:

- **`src/styles/scai.css`** holds the design tokens. Anything wrapped in `.scai` uses them: the front page, sign-up, sign-in, the 404 page and the whole admin. The admin uses this skin whatever theme the owner chooses for their portfolio. Light and dark are both defined.
- **`app/platform/platform.css`** lays out the front page in the swisscheeseai.au style: a white hero, ruled sections, a numbered flow and a closing band in the opposite colours to the page.
- **The `swiss-cheese` theme in `core/theme/presets.ts`** is what every new portfolio starts with. Owners can change it in Appearance. The `<html data-preset>` attribute adds square controls and tight headlines, for this theme only.

## The Studio

`/admin/studio` is where a WebCV portfolio is built, in the manner of Adobe
Portfolio: pick one of six ready-made templates, then edit the page where it
stands. The preview is always on screen; words are typed straight onto it,
pictures are replaced from a button over them, and a block's other settings
open beside it. The editor is [Puck](https://github.com/puckeditor/puck) (MIT)
in a custom layout.

- `core/studio/` — the site document (`types.ts`), templates and fonts
  (`design.ts`), starter sites (`starters.ts`), the blocks (`blocks.tsx`, plain
  functions shared by the editor and the published site), the template styles
  (`site.css`, everything under `.wcs`), storage (`store.ts`: `studio/draft`
  and `studio/published` records) and the proxy's route lookup (`routes.ts`).
- `app/admin/(studio)/studio/` — the editor (client only) and its draft preview.
- `app/api/admin/studio/` — autosave (revisioned) and publish; both call
  `requireOwner()`.
- `app/wcs-render/` — a published Studio page. The proxy rewrites
  `/<site>/<page>` here when the site has a published Studio page at that
  address, and to the classic routes otherwise, so nothing classic is lost.

The classic editors are all still there, under **Advanced** in the admin's menu
and on the dashboard.
