import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/core/content/json-ld-script';
import { AUDIENCES, audience } from '@/core/platform/seo-pages';
import { templateInfo } from '@/core/studio/design';
import { TemplatePreview } from '@/core/studio/template-preview';
import { ClaimForm } from '../../claim-form';
import { platformUrl } from '../../seo';

type Params = { params: Promise<{ audience: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = audience((await params).audience);
  if (!page) return { title: 'Not found' };
  const url = platformUrl(`/for/${page.slug}`);
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url },
  };
}

/** A landing page for one kind of portfolio owner; see `core/platform/seo-pages`. */
export default async function AudiencePage({ params }: Params) {
  const page = audience((await params).audience);
  if (!page) notFound();
  const tpl = templateInfo(page.template);
  const others = AUDIENCES.filter((a) => a.slug !== page.slug);

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'WebCV', item: platformUrl('/') },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: page.h1,
                  item: platformUrl(`/for/${page.slug}`),
                },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: page.faq.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ],
        }}
      />

      <section className="wc-section wc-page-head" aria-labelledby="audience-title">
        <div className="wc-container">
          <p className="wc-kicker">
            <span>WebCV / For {page.slug}</span>
            <span>Free · $0</span>
          </p>
          <h1 id="audience-title">{page.h1}</h1>
          <p className="wc-hero-lede">{page.lede}</p>
          <div style={{ marginTop: 28, maxWidth: 560 }}>
            <ClaimForm />
          </div>
        </div>
      </section>

      <section className="wc-section" aria-labelledby="why-title">
        <div className="wc-container">
          <div className="wc-section-intro">
            <p className="wc-mono-label wc-section-index">01 / Why WebCV</p>
            <div>
              <h2 id="why-title">What your portfolio needs to do.</h2>
            </div>
          </div>
          <div className="wc-notes">
            {page.points.map((point) => (
              <article className="wc-note" key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wc-section" aria-labelledby="template-title">
        <div className="wc-container wc-example">
          <div>
            <p className="wc-mono-label">02 / A template to start from</p>
            <h2 id="template-title" style={{ marginTop: 22 }}>
              Start with {tpl.name}.
            </h2>
            <p className="wc-section-lede">{page.templateWhy}</p>
            <p style={{ marginTop: 28 }}>
              <a className="wc-button" href="/templates">
                See all six templates <span aria-hidden>→</span>
              </a>
            </p>
          </div>
          <div className="wc-tpl-card">
            <TemplatePreview template={page.template} name="Alex Morgan" />
          </div>
        </div>
      </section>

      <section className="wc-section" aria-labelledby="audience-faq-title">
        <div className="wc-container wc-faq">
          <div className="wc-faq-heading">
            <p className="wc-mono-label">03 / Questions</p>
            <h2 id="audience-faq-title" style={{ marginTop: 22 }}>
              Before you start.
            </h2>
          </div>
          <div className="wc-faq-list">
            {page.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="wc-section" aria-labelledby="more-title">
        <div className="wc-container">
          <h2 id="more-title" className="wc-links-title">
            Portfolios for other work
          </h2>
          <ul className="wc-links">
            {others.map((o) => (
              <li key={o.slug}>
                <a href={`/for/${o.slug}`}>{o.h1}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
