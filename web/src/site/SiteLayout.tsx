import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, Logo } from '../components/ui';

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <>
      <header className={`site-header${open ? ' open' : ''}`}>
        <div className="container inner">
          <Link to="/" style={{ textDecoration: 'none' }}><Logo /></Link>
          <nav className="site-nav" onClick={() => setOpen(false)}>
            <NavLink to="/platform">Platform</NavLink>
            <NavLink to="/solutions/law-firms" className={() => (loc.pathname === '/solutions/law-firms' ? 'active' : '')}>Law Firms</NavLink>
            <NavLink to="/solutions/corporate-legal" className={() => (loc.pathname === '/solutions/corporate-legal' ? 'active' : '')}>Corporate Legal</NavLink>
            <NavLink to="/security">Security</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/app" className="mobile-only">Explore demo workspace</NavLink>
            <NavLink to="/demo" className="mobile-only">Request a demo</NavLink>
          </nav>
          <div className="cta">
            <Link to="/app" className="btn btn-outline-light btn-sm">Explore demo workspace</Link>
            <Link to="/demo" className="btn btn-bronze btn-sm">Request a demo</Link>
          </div>
          <button className="menu-btn" aria-label="Menu" onClick={() => setOpen(!open)}><Icon name="menu" /></button>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="container">
          <div className="cols">
            <div>
              <Logo />
              <p style={{ marginTop: 14, maxWidth: 340 }}>
                Structured matter workspaces and source-grounded document intelligence for law firms and corporate legal departments.
              </p>
              <a className="social" href="https://www.linkedin.com/company/matterweave/" target="_blank" rel="noopener noreferrer" aria-label="MatterWeave on LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>
                LinkedIn
              </a>
            </div>
            <div>
              <h4>Product</h4>
              <Link to="/platform">Platform overview</Link>
              <Link to="/platform#intelligence">Document intelligence</Link>
              <Link to="/platform#deadlines">Deadline verification</Link>
              <Link to="/app">Demo workspace</Link>
            </div>
            <div>
              <h4>Solutions</h4>
              <Link to="/solutions/law-firms">Law firms</Link>
              <Link to="/solutions/corporate-legal">Corporate legal</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div>
              <h4>Company</h4>
              <Link to="/about">About &amp; team</Link>
              <Link to="/security">Security & privacy</Link>
              <Link to="/security#ai">Responsible AI</Link>
              <Link to="/demo">Contact sales</Link>
            </div>
          </div>
          <div className="legal">
            MatterWeave supports administrative coordination and document review. It does not provide legal advice, does not file documents with any court or agency,
            and does not make deadline determinations — all AI-identified dates require verification by authorized legal staff. Customer names and
            matters shown on this site are fictional. © 2026 MatterWeave · matterweave.site
          </div>
        </div>
      </footer>
    </>
  );
}
