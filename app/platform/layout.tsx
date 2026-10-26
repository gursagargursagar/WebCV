import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './platform.css';
import { Foot, TopBar } from './chrome';

export const metadata: Metadata = {
  title: { absolute: 'WebCV — your portfolio at webcv.au/you' },
  description:
    'Build a portfolio website in minutes. Pick your address, fill it in with a visual editor, and share webcv.au/your-name.',
  robots: { index: true, follow: true },
};

/** The platform's own pages: the front page and sign-up. Portfolios never render here. */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wc">
      <TopBar />
      {children}
      <Foot />
    </div>
  );
}
