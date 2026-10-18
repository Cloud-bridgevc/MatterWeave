import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, Logo } from '../components/ui';

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
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
            <NavLink to="/app">Product demo</NavLink>
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
              <h4>Trust</h4>
              <Link to="/security">Security & privacy</Link>
              <Link to="/security#ai">Responsible AI</Link>
              <Link to="/demo">Contact sales</Link>
            </div>
          </div>
          <div className="legal">
            MatterWeave supports administrative coordination and document review. It does not provide legal advice, does not file documents with any court or agency,
            and does not make deadline determinations — all AI-identified dates require verification by authorized legal staff. Customer names and
            matters shown on this site are fictional. © 2026 MatterWeave (concept product).
          </div>
        </div>
      </footer>
    </>
  );
}
