import type { Metadata } from 'next';
import { JsonLd } from '@/core/content/json-ld-script';
import { AUDIENCES } from '@/core/platform/seo-pages';
import { TEMPLATES } from '@/core/studio/design';
import { TemplatePreview } from '@/core/studio/template-preview';
import { platformUrl } from '../seo';

const TITLE = 'Free Portfolio Website Templates | WebCV';
const DESCRIPTION =
  'Six free portfolio website templates for designers, photographers, architects, engineers and graduates. Pick one, edit it on the page, publish at webcv.au/you.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: platformUrl('/templates') },
  openGraph: { title: TITLE, description: DESCRIPTION, url: platformUrl('/templates') },
};

/** Which audience page recommends each template, for the "Good for" line. */
function goodFor(id: string) {
  return AUDIENCES.filter((a) => a.template === id);
}

export default function TemplatesPage() {
  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'WebCV portfolio website templates',
          url: platformUrl('/templates'),
          description: DESCRIPTION,
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: TEMPLATES.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${t.name} portfolio template`,
              description: t.blurb,
            })),
          },
        }}
      />
      <section className="wc-section wc-page-head" aria-labelledby="templates-title">
        <div className="wc-container">
          <p className="wc-kicker">
            <span>WebCV / Templates</span>
            <span>6 designs · $0</span>
          </p>
          <h1 id="templates-title">Portfolio website templates, free to use.</h1>
          <p className="wc-hero-lede">
            Every template comes filled in with a home page, projects, About and Contact. Pick one,
            replace the words and pictures with yours right on the page, and publish at
            webcv.au/your-name. Switch template any time — your content comes with you.
          </p>
          <p style={{ marginTop: 28 }}>
            <a className="wc-button wc-button-ink" href="/signup">
              Start free <span aria-hidden>→</span>
            </a>
          </p>
        </div>
      </section>

      <section className="wc-section" aria-label="All templates">
        <div className="wc-container">
          <ul className="wc-tpl-grid">
            {TEMPLATES.map((t) => (
              <li key={t.id} className="wc-tpl-card">
                <TemplatePreview template={t.id} name="Alex Morgan" />
                <div className="wc-tpl-body">
                  <h2>{t.name}</h2>
                  <p>{t.blurb}</p>
                  {goodFor(t.id).length ? (
                    <p className="wc-tpl-for">
                      Good for{' '}
                      {goodFor(t.id).map((a, i) => (
                        <span key={a.slug}>
                          {i ? ', ' : ''}
                          <a href={`/for/${a.slug}`}>{a.slug}</a>
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <a className="wc-button wc-button-small" href="/signup">
                    Use {t.name}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
