import type { Metadata } from 'next';
import './platform.css';
import { Foot, TopBar } from './chrome';

export const metadata: Metadata = {
  title: { absolute: 'WebCV — your portfolio at webcv.au/you' },
  description:
    'Build a portfolio website in minutes. Pick your address, fill it in with a visual editor, and share webcv.au/your-name.',
  robots: { index: true, follow: true },
  // The root layout fills these from a portfolio's content; the platform is not one.
  applicationName: 'WebCV',
  authors: [{ name: 'WebCV' }],
  openGraph: {
    title: 'WebCV — your portfolio at webcv.au/you',
    description: 'Build a portfolio website in minutes and share webcv.au/your-name.',
    url: 'https://www.webcv.au',
    siteName: 'WebCV',
    type: 'website',
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'WebCV — your portfolio at webcv.au/you',
    description: 'Build a portfolio website in minutes and share webcv.au/your-name.',
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
