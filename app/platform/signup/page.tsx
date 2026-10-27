import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: { absolute: 'Create your portfolio — WebCV' } };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; claim?: string }>;
}) {
  const { slug, claim } = await searchParams;
  return (
    <main id="main" className="wc-container wc-auth">
      <section className="wc-auth-aside" aria-label="What happens next">
        <p className="wc-mono-label wc-auth-rule">
          <span>WebCV / Sign up</span>
          <span>01 / Create</span>
        </p>
        <h1>
          Create your portfolio.
          <span>About two minutes.</span>
        </h1>
        <ol className="wc-auth-steps">
          <li>
            <span>01</span>
            <span>
              <strong>Choose your address</strong>
              webcv.au/your-name. This is the link you will share.
            </span>
          </li>
          <li>
            <span>02</span>
            <span>
              <strong>Edit in private</strong>
              Your portfolio starts with sample content only you can see.
            </span>
          </li>
          <li>
            <span>03</span>
            <span>
              <strong>Publish when ready</strong>
              One click puts your changes live.
            </span>
          </li>
        </ol>
      </section>

      <div className="wc-card">
        <p className="wc-mono-label">Step 1 of 2 · Account</p>
        <h2 style={{ marginTop: 10 }}>Create your portfolio</h2>
        <p className="wc-sub">Next, you will fill it in from the editor.</p>
        <SignupForm
          initialSlug={typeof slug === 'string' ? slug : ''}
          claim={typeof claim === 'string' ? claim.slice(0, 100) : ''}
        />
        <p className="wc-alt">
          Already have a portfolio? <a href="/admin/login">Sign in</a>
        </p>
      </div>
    </main>
  );
}
