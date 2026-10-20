import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { TeamSection } from './Team';

export default function About() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">About MatterWeave</span>
          <h1>Bringing structure and verifiable AI to legal matter work.</h1>
          <p>MatterWeave gives law firms and corporate legal departments one workspace per matter — documents, tasks, deadlines, client communications and reporting — with AI that cites its sources and leaves the decisions to legal professionals.</p>
        </div>
      </section>
      <section className="section">
        <div className="container grid-3">
          <div className="card"><div className="icon-tile"><Icon name="check" /></div><h3>Verifiable by design</h3><p>Every AI summary point and extracted item links back to the passage it came from.</p></div>
          <div className="card"><div className="icon-tile"><Icon name="users" /></div><h3>People make the call</h3><p>Candidate dates stay candidates until authorized legal staff verify them. We never file documents.</p></div>
          <div className="card"><div className="icon-tile"><Icon name="shield" /></div><h3>Confidential first</h3><p>Tenant isolation, encryption and audit logging are built into the architecture from day one.</p></div>
        </div>
      </section>
      <TeamSection alt />
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div><h2>Talk to the team.</h2><p style={{ color: '#c3cddb', margin: '8px 0 0' }}>Request a walkthrough or follow our progress on LinkedIn.</p></div>
            <div className="row wrap">
              <a href="https://www.linkedin.com/company/matterweave/" target="_blank" rel="noopener noreferrer" className="btn btn-outline-light">Follow on LinkedIn</a>
              <Link to="/demo" className="btn btn-bronze">Request a demo</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
