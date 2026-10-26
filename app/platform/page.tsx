import { siteCount } from '@/core/site/registry';
import { ClaimForm } from './claim-form';

const FEATURES: { label: string; title: string; body: string }[] = [
  {
    label: 'Address',
    title: 'Your own link',
    body: 'Your portfolio lives at webcv.au/your-name. One short link for your CV, LinkedIn and email signature.',
  },
  {
    label: 'Editor',
    title: 'Edit everything',
    body: 'Change any word, image or section from your dashboard. No code, and nothing to redeploy.',
  },
  {
    label: 'Preview',
    title: 'Private until you publish',
    body: 'Edits stay in a draft only you can see. Preview them, then publish when you are ready.',
  },
  {
    label: 'Work',
    title: 'Projects and case studies',
    body: 'Show your work with images, outcomes and the tools you used, in the order you choose.',
  },
  {
    label: 'Profile',
    title: 'Experience and education',
    body: 'Timelines for your roles and study, recommendations, and a downloadable résumé.',
  },
  {
    label: 'Audience',
    title: 'Messages in one place',
    body: 'Visitors write to you from your portfolio. Messages arrive in your dashboard, filtered for spam.',
  },
];

const STEPS: { title: string; body: string }[] = [
  { title: 'Claim your address', body: 'Pick webcv.au/your-name and create an account.' },
  { title: 'Fill it in', body: 'Add your role, projects, experience and photo in the editor.' },
  { title: 'Publish and share', body: 'One click puts it live at your address.' },
];

const FAQ: { q: string; a: string }[] = [
  { q: 'How much does it cost?', a: 'Creating and publishing a portfolio is free.' },
  {
    q: 'Do I need to know how to code?',
    a: 'No. Everything is edited in forms and previews. If you can write an email, you can build your portfolio.',
  },
  {
    q: 'Can I change my address later?',
    a: 'Your address is your link, so choose it carefully. If you need a different one, create a new portfolio with the new address.',
  },
  {
    q: 'Who can see my portfolio?',
    a: 'Anyone with the link, once you publish. Drafts stay private to you until you press Publish.',
  },
  {
    q: 'Can I change how it looks?',
    a: 'Yes. Pick a theme, colours and typefaces in Appearance. Every theme works in light and dark.',
  },
  {
    q: 'Can I take my content with me?',
    a: 'Yes. The dashboard can download a full backup of your portfolio at any time.',
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
      {/* --------------------------------------------------------- hero */}
      <section className="wc-hero" aria-labelledby="hero-title">
        <div className="wc-container wc-hero-grid">
          <div className="wc-hero-copy">
            <p className="wc-kicker">
              <span>WebCV / Portfolio builder</span>
              <span>01 / Your address</span>
            </p>
            <h1 id="hero-title">
              Your work, one link.
              <span className="wc-hero-subline">A portfolio at webcv.au/you, live in minutes.</span>
            </h1>
            <p className="wc-hero-lede">
              Pick your address, fill in your projects and experience in a visual editor, and publish.
              No code, no hosting to set up, and nothing to maintain.
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
                Start from a finished layout with sample content, then replace it with your own story
                one section at a time.
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
            <p className="wc-mono-label">04 / A real one</p>
            <h2 id="example-title" style={{ marginTop: 22 }}>
              See a finished portfolio.
            </h2>
            <p className="wc-section-lede">
              Gursagar Virdi’s portfolio: mechanical design work, internships and recommendations, on
              one page with light and dark modes.
            </p>
            <p style={{ marginTop: 28 }}>
              <a className="wc-button" href="/gursagar24">
                Open webcv.au/gursagar24 <span aria-hidden>↗</span>
              </a>
            </p>
          </div>
          <figure className="wc-stage">
            <a href="/gursagar24" aria-label="Open Gursagar Virdi's portfolio">
              <img
                src="/platform/example-portfolio.png"
                alt="Gursagar Virdi's portfolio: the greeting 'Hi, I'm Guru' above large project images."
                width={1280}
                height={800}
                loading="lazy"
              />
            </a>
            <figcaption>
              <span className="wc-mono-label">webcv.au/gursagar24</span>
              <span className="wc-mono-label">Example</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ---------------------------------------------------------- faq */}
      <section className="wc-section" id="faq" aria-labelledby="faq-title">
        <div className="wc-container wc-faq">
          <div className="wc-faq-heading">
            <p className="wc-mono-label">05 / Questions</p>
            <h2 id="faq-title" style={{ marginTop: 22 }}>
              Before you start.
            </h2>
            <p>
              Anything else? Sign up and look around. Nothing goes public until you publish.
            </p>
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
