import { Brand } from '@/components/scai/Brand';
import { ThemeToggle } from '@/components/scai/ThemeToggle';

/** The platform's top bar: SCAI's fixed, blurred nav. */
export function TopBar() {
  return (
    <header className="wc-nav">
      <div className="wc-container wc-nav-inner">
        <Brand />
        <nav className="wc-nav-links" aria-label="Main">
          <a className="wc-hide-md" href="/#how-it-works">
            How it works
          </a>
          <a className="wc-hide-md" href="/gursagar24">
            Example
          </a>
          <a className="wc-hide-md" href="/#faq">
            FAQ
          </a>
          <a className="wc-hide-sm" href="/admin/login">
            Sign in
          </a>
          <a className="wc-button wc-button-small" href="/signup">
            Create portfolio <span aria-hidden>↗</span>
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function Foot() {
  return (
    <footer className="wc-footer">
      <div className="wc-container">
        <div className="wc-footer-main">
          <Brand />
          <nav className="wc-footer-links" aria-label="Footer">
            <a href="/signup">Create a portfolio</a>
            <a href="/admin/login">Sign in</a>
            <a href="/gursagar24">Example portfolio</a>
            <a href="/#faq">FAQ</a>
          </nav>
        </div>
        <p className="wc-fine">
          © {new Date().getFullYear()} WebCV · webcv.au. Built on{' '}
          <a href="https://github.com/ShadmanArafin/open_portfolio" target="_blank" rel="noopener">
            Open Portfolio
          </a>{' '}
          (MIT licence).
        </p>
      </div>
    </footer>
  );
}
