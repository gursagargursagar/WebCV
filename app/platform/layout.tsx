import type { Metadata } from 'next';
import './platform.css';
import { Foot, TopBar } from './chrome';

export const metadata: Metadata = {
  title: { absolute: 'WebCV — a free portfolio at webcv.au/you' },
  description:
    'A portfolio at webcv.au/you, live in minutes, for free ($0). Pick a template, edit it right on the page, and share webcv.au/your-name.',
  robots: { index: true, follow: true },
  // The root layout fills these from a portfolio's content; the platform is not one.
  applicationName: 'WebCV',
  authors: [{ name: 'WebCV' }],
  openGraph: {
    title: 'WebCV — a free portfolio at webcv.au/you',
    description: 'A portfolio at webcv.au/you, live in minutes, for free ($0).',
    url: 'https://www.webcv.au',
    siteName: 'WebCV',
    type: 'website',
    images: [],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WebCV — a free portfolio at webcv.au/you',
    description: 'A portfolio at webcv.au/you, live in minutes, for free ($0).',
    images: [],
  },
};

/** The platform's own pages: the front page and sign-up. Portfolios never render here. */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    // `.scai` gives these pages the shared Swiss Cheese AI tokens; `.wc` is the
    // platform's own layout (platform.css).
    <div className="scai wc">
      <TopBar />
      {children}
      <Foot />
    </div>
  );
}
