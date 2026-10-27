import { siteCount } from '@/core/site/registry';
import { JsonLd } from '@/core/content/json-ld-script';
import { AUDIENCES } from '@/core/platform/seo-pages';
import { ClaimForm } from './claim-form';
import { organizationJsonLd, platformUrl } from './seo';

const FEATURES: { label: string; title: string; body: string }[] = [
  {
    label: 'Templates',
    title: 'Six templates, already filled in',
    body: 'Start from a finished portfolio website with a home page, projects, About and Contact, then make it yours. Nothing starts blank.',
  },
  {
    label: 'Editor',
    title: 'Edit right on the page',
    body: 'Click any words and type. Replace a picture with one click. The preview is the page, so what you see is what visitors get.',
  },
  {
    label: 'Address',
    title: 'Your own link, free',
    body: 'Your portfolio lives at webcv.au/your-name: one short link for your résumé, LinkedIn and email signature.',
  },
  {
    label: 'Work',
    title: 'Projects that tell a story',
    body: 'Give every project its own page with images, photo grids, video and text, and show them all in a project grid.',
  },
  {
    label: 'Devices',
    title: 'Looks right on every screen',
    body: 'Every template adapts to phones, tablets and desktops, and you can preview each size while you edit.',
  },
  {
    label: 'Contact',
    title: 'Enquiries in one place',
    body: 'A contact form on your portfolio sends messages to your WebCV inbox, filtered for spam.',
  },
];

const STEPS: { title: string; body: string }[] = [
  { title: 'Claim your address', body: 'Pick webcv.au/your-name and create a free account.' },
  { title: 'Pick a template', body: 'Choose one of six designs and edit it right on the page.' },
  {
    title: 'Publish and share',
    body: 'One click puts your portfolio website live at your address.',
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How much does WebCV cost?',
    a: 'Nothing. Creating and publishing a portfolio website at webcv.au/your-name is free ($0).',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No. You click on the page and type, and add blocks such as images, photo grids and video from a panel. If you can write an email, you can build your portfolio.',
  },
  {
    q: 'Who is WebCV for?',
    a: 'Anyone who needs to show their work: designers, photographers, architects, engineers, writers, students and graduates.',
  },
  {
    q: 'Can I change the template later?',
    a: 'Yes. Switch templates at any time and every word and picture comes with you.',
  },
  {
    q: 'Who can see my portfolio?',
    a: 'Anyone with the link, once you publish. Your changes save automatically and stay private until you press Publish.',
  },
  {
    q: 'Can I change my address later?',
    a: 'Your address is your link, so choose it carefully. If you need a different one, create a new portfolio with the new address.',
  },
];

async function liveCount(): Promise<number | null> {
  try {
    return await siteCount();
  } catch {
    return null;
  }
}

export default async function PlatformHome() {
  const count = await liveCount();

  return (
    <main id="main">
      {/* What WebCV is, for search engines: the organisation, the site, the
          free product and its common questions. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationJsonLd(),
            {
              '@type': 'WebSite',
              '@id': platformUrl('/#website'),
              name: 'WebCV',
              url: platformUrl('/'),
              inLanguage: 'en-AU',
              publisher: { '@id': platformUrl('/#organization') },
            },
            {
              '@type': 'SoftwareApplication',
              name: 'WebCV',
              url: platformUrl('/'),
              applicationCategory: 'DesignApplication',
              operatingSystem: 'Web',
              description:
                'A free portfolio website builder: pick a template, edit it on the page and publish at webcv.au/your-name.',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' },
              publisher: { '@id': platformUrl('/#organization') },
            },
            {
              '@type': 'FAQPage',
              mainEntity: FAQ.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            },
          ],
        }}
      />
      {/* --------------------------------------------------------- hero */}
      <section className="wc-hero" aria-labelledby="hero-title">
        <div className="wc-container wc-hero-grid">
          <div className="wc-hero-copy">
            <p className="wc-kicker">
              <span>Free portfolio website builder</span>
              <span>01 / Your address</span>
            </p>
            <h1 id="hero-title">
              Your work, one link.
              <span className="wc-hero-subline">
                A portfolio at webcv.au/you, live in minutes, for free ($0).
              </span>
            </h1>
            <p className="wc-hero-lede">
              Pick a template, change the words and pictures right on the page, and publish your
              portfolio website. No code, no hosting to set up, and nothing to maintain.
            </p>
          </div>

          <figure className="wc-preview" aria-label="Example of a WebCV portfolio">
            <figcaption className="wc-preview-cap top">
              <span>Portfolio preview</span>
              <span>02 / Live</span>
            </figcaption>
            <div className="wc-mock" aria-hidden>
              <div className="wc-mock-bar">
                <i />
                <i />
                <i />
                <b>webcv.au/alex-morgan</b>
              </div>
              <div className="wc-mock-body">
                <p className="wc-mock-name">Alex Morgan</p>
                <p className="wc-mock-role">Product designer · Sydney</p>
                <span className="wc-mock-tag">Open to work</span>
                <ul className="wc-mock-rows">
                  <li>
                    <span>01</span>
                    <span>Checkout redesign, Northwind</span>
                    <span>2025</span>
                  </li>
                  <li>
                    <span>02</span>
                    <span>Design system, Contoso</span>
                    <span>2024</span>
                  </li>
                  <li>
                    <span>03</span>
                    <span>Onboarding research</span>
                    <span>2023</span>
                  </li>
                </ul>
              </div>
            </div>
            <figcaption className="wc-preview-cap bottom">
              <span>One address</span>
              <span>Light and dark</span>
            </figcaption>
          </figure>

          <ClaimForm />

          <ul className="wc-hero-meta">
            <li>Free to create and publish</li>
            <li>No code or hosting</li>
            <li>Private drafts, one-click publish</li>
            {count ? <li>{count.toLocaleString('en-AU')} portfolios made</li> : null}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------- features */}
      <section className="wc-section" aria-labelledby="features-title">
        <div className="wc-container">
          <div className="wc-section-intro">
            <p className="wc-mono-label wc-section-index">02 / What you get</p>
            <div>
              <h2 id="features-title">Everything a portfolio needs, already built.</h2>
              <p className="wc-section-lede">
                Start from a finished portfolio website, then replace the sample content with your
                own story, one block at a time.
              </p>
            </div>
          </div>
          <div className="wc-notes">
            {FEATURES.map((f) => (
              <article className="wc-note" key={f.title}>
                <p className="wc-note-label">{f.label}</p>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- how it works */}
      <section className="wc-section wc-protocol" id="how-it-works" aria-labelledby="how-title">
        <div className="wc-container">
          <div className="wc-section-intro">
            <p className="wc-mono-label wc-section-index">03 / How it works</p>
            <div>
              <h2 id="how-title">Live in three steps.</h2>
            </div>
          </div>
          <ol className="wc-flow">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="wc-flow-n">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{step.title}</strong>
                  <span className="wc-flow-body">{step.body}</span>
                </span>
                <span className="wc-flow-arrow" aria-hidden>
                  →
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------ example */}
      <section className="wc-section" aria-labelledby="example-title">
        <div className="wc-container wc-example">
          <div>
            <p className="wc-mono-label">04 / An example</p>
            <h2 id="example-title" style={{ marginTop: 22 }}>
              See a finished portfolio.
            </h2>
            <p className="wc-section-lede">
              A product design engineer’s portfolio: projects with the numbers behind them, an About
              page and a contact form. The person is fictional; the template is real.
            </p>
            <p style={{ marginTop: 28 }}>
              <a className="wc-button" href="/example">
                Open the example <span aria-hidden>↗</span>
              </a>
            </p>
          </div>
          <figure className="wc-stage">
            <a href="/example" aria-label="Open the example portfolio">
              <img
                src="/platform/example-portfolio.png"
                alt="The example portfolio: a headline about designing parts, above a grid of engineering projects."
                width={1280}
                height={800}
                loading="lazy"
              />
            </a>
            <figcaption>
              <span className="wc-mono-label">webcv.au/example</span>
              <span className="wc-mono-label">Example</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ------------------------------------------------------ made for */}
      <section className="wc-section" aria-labelledby="for-title">
        <div className="wc-container">
          <div className="wc-section-intro">
            <p className="wc-mono-label wc-section-index">05 / Made for</p>
            <div>
              <h2 id="for-title">A portfolio for the work you do.</h2>
              <p className="wc-section-lede">
                Templates and tips for each kind of work, or{' '}
                <a href="/templates">browse all six templates</a>.
              </p>
            </div>
          </div>
          <ul className="wc-links">
            {AUDIENCES.map((a) => (
              <li key={a.slug}>
                <a href={`/for/${a.slug}`}>{a.title.replace(' | WebCV', '')}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- faq */}
      <section className="wc-section" id="faq" aria-labelledby="faq-title">
        <div className="wc-container wc-faq">
          <div className="wc-faq-heading">
            <p className="wc-mono-label">06 / Questions</p>
            <h2 id="faq-title" style={{ marginTop: 22 }}>
              Before you start.
            </h2>
            <p>Anything else? Sign up and look around. Nothing goes public until you publish.</p>
          </div>
          <div className="wc-faq-list">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- final */}
      <section className="wc-final" aria-labelledby="final-title">
        <div className="wc-container wc-final-grid">
          <h2 id="final-title">Give your work an address.</h2>
          <div className="wc-final-actions">
            <a className="wc-button wc-button-ink" href="/signup">
              Create your portfolio
            </a>
            <a className="wc-button" href="/admin/login">
              Sign in
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
