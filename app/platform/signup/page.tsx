import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: { absolute: 'Create your portfolio — WebCV' } };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  return (
    <main className="wc-auth">
      <div className="wc-card">
        <div>
          <span className="wc-eyebrow">Step 1 of 2</span>
          <h1 style={{ marginTop: 6 }}>Create your portfolio</h1>
          <p className="sub">Next you will add your projects and photo in the editor.</p>
        </div>
        <SignupForm initialSlug={typeof slug === 'string' ? slug : ''} />
        <p className="alt">
          Already have a portfolio? <a href="/admin/login">Sign in</a>
        </p>
      </div>
    </main>
  );
}
