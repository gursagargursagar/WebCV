import { siteCount } from '@/core/site/registry';
import { ClaimForm } from './claim-form';

const FEATURES: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: 'Your own address',
    body: 'Your portfolio lives at webcv.au/your-name. One short link for your CV, LinkedIn and email signature.',
    icon: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  },
  {
    title: 'Visual editor',
    body: 'Change any word, image or section from your dashboard and preview it before it goes live. No code, no redeploys.',
    icon: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  },
  {
    title: 'Projects and case studies',
    body: 'Show your work with images, outcomes and the tools you used. Reorder projects by dragging them.',
    icon: <path d="M4 6h16v12H4zM4 10h16M9 6v12" />,
  },
  {
    title: 'Experience, education and CV',
    body: 'Timeline sections for your roles and study, plus a downloadable résumé.',
    icon: <path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6" />,
  },
  {
    title: 'Contact inbox',
    body: 'Visitors write to you from your portfolio. Messages land in your dashboard, protected from spam.',
    icon: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  },
  {
    title: 'Writing and newsletter',
    body: 'Publish articles and collect subscribers when you want to share more than a list of projects.',
    icon: <path d="M5 4h10l4 4v12H5zM8 12h8M8 16h5" />,
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How much does it cost?',
    a: 'Creating and publishing a portfolio is free.',
  },
  {
    q: 'Can I change my address later?',
    a: 'Choose carefully: your address is your link. If you need a different one, create a new portfolio with the new address.',
  },
  {
    q: 'Who can see my portfolio?',
    a: 'Everyone with the link once you publish. Drafts stay private to you until you press Publish.',
  },
  {
    q: 'Can I export my content?',
    a: 'Yes. The dashboard can download a full backup of your content at any time.',
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
    <main>
      <section className="wc-wrap wc-hero">
        <div>
          <span className="wc-eyebrow">Portfolio builder</span>
          <h1>
            Your work, at <em>webcv.au/you</em>
          </h1>
          <p className="wc-lede">
            Create a professional portfolio in a few minutes. Pick your address, fill in your projects
            with a visual editor and share one link everywhere.
          </p>
          <div className="wc-cta">
            <a className="wc-btn primary lg" href="/signup">
              Create your portfolio
            </a>
            <a className="wc-btn ghost lg" href="/gursagar24">
              See an example
            </a>
          </div>
          <div className="wc-pills">
            <span className="wc-pill">Free</span>
            <span className="wc-pill">No code</span>
            <span className="wc-pill">Light and dark themes</span>
            <span className="wc-pill">Works on phones</span>
          </div>
        </div>

        <div className="wc-claim">
          <div>
            <h2>Claim your address</h2>
          </div>
          <p className="wc-note">Check that your name is free. You can finish signing up on the next screen.</p>
          <ClaimForm />
        </div>
      </section>

      <section className="wc-wrap wc-section">
        <div className="wc-section-head">
          <span className="wc-eyebrow">What you get</span>
          <h2>Everything a portfolio needs, already built</h2>
          <p>Start from a finished layout and replace the placeholders with your own story.</p>
        </div>
        <div className="wc-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="wc-card">
              <span className="wc-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon}
                </svg>
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wc-wrap wc-section">
        <div className="wc-section-head">
          <span className="wc-eyebrow">How it works</span>
          <h2>Live in three steps</h2>
        </div>
        <div className="wc-steps">
          <div className="wc-step">
            <h3>Pick your address</h3>
            <p>Choose webcv.au/your-name and create your account with an email and passphrase.</p>
          </div>
          <div className="wc-step">
            <h3>Fill it in</h3>
            <p>Add your role, projects, experience and photo in the dashboard. Preview every change.</p>
          </div>
          <div className="wc-step">
            <h3>Publish and share</h3>
            <p>Press Publish. Your portfolio is live straight away at your own link.</p>
          </div>
        </div>
      </section>

      <section className="wc-wrap wc-section">
        <div className="wc-band">
          <div>
            <h2>One link instead of a folder of attachments</h2>
            <p>
              Recruiters open a link faster than a PDF. Keep your portfolio current from any device and
              send the same address every time.
            </p>
            <div className="wc-cta">
              <a className="wc-btn primary" href="/signup">
                Get started
              </a>
            </div>
          </div>
          <div className="wc-tiles">
            <div className="wc-tile">
              <span className="lab">Time to first draft</span>
              <span className="v">5 min</span>
            </div>
            <div className="wc-tile">
              <span className="lab">Cost</span>
              <span className="v">Free</span>
            </div>
            <div className="wc-tile">
              <span className="lab">Your address</span>
              <span className="v" style={{ fontSize: 17, paddingTop: 5 }}>webcv.au/you</span>
            </div>
            <div className="wc-tile">
              <span className="lab">Portfolios made</span>
              <span className="v">{count ?? '—'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wc-wrap wc-section">
        <div className="wc-section-head">
          <span className="wc-eyebrow">Questions</span>
          <h2>Common questions</h2>
        </div>
        <div className="wc-faq">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
