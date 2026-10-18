import { Link, Navigate, useParams } from 'react-router-dom';
import { Icon } from '../components/ui';

const SEGMENTS = {
  'law-firms': {
    eyebrow: 'For law firms',
    title: 'Run tighter matters across litigation and transactional teams.',
    lede: 'From intake to close, MatterWeave keeps partners, associates, paralegals and docketing working from the same structured record — with AI that does the first pass on every document.',
    cases: [
      { icon: 'scale', t: 'Litigation management', b: 'Ingest complaints, scheduling orders and correspondence. Surface every candidate date for docketing review and turn verified deadlines into assigned tasks.' },
      { icon: 'calendar', t: 'Docketing support', b: 'A single calendar of verified dates across matters, with AI candidates shown separately so nothing unverified is mistaken for a docketed deadline.' },
      { icon: 'file', t: 'Contract and lease review', b: 'Extract renewal options, notice periods, cure periods and limitation provisions with source citations for faster first-pass review.' },
      { icon: 'chat', t: 'Client communication record', b: 'Log calls, meetings and correspondence against the matter so the whole team knows what the client was told and when.' },
      { icon: 'clock', t: 'Billing alignment', b: 'Carry billing codes, client-matter references, LEDES task codes and budgets on each matter for clean handoff to your time and billing system.' },
      { icon: 'users', t: 'Ethical walls', b: 'Matter-level team access with role-based capabilities, enforced in the database — not just hidden in the UI.' },
    ],
    stats: [['Faster', 'first-pass document review'], ['Every', 'candidate date reviewed by a person'], ['One', 'record per matter across the team']],
  },
  'corporate-legal': {
    eyebrow: 'For corporate legal departments',
    title: 'Bring order to intake, internal matters and outside counsel.',
    lede: 'Give the business a front door, give the legal team a structured workspace, and give leadership reporting they can trust — without routing confidential matters through general-purpose tools.',
    cases: [
      { icon: 'folder', t: 'Matter intake & triage', b: 'Create matters for business units with practice area, risk and retention defaults. Assign to in-house counsel or outside firms.' },
      { icon: 'building', t: 'Transactions & governance', b: 'Track financings, board consents and closing deliverables. AI flags exclusivity periods, target closing dates and missing definitive agreements.' },
      { icon: 'alert', t: 'Regulatory & agency matters', b: 'Identify response windows in agency notices and route them for counsel verification. Preservation obligations surface automatically.' },
      { icon: 'search', t: 'Institutional knowledge', b: 'Ask questions across authorized matter documents with cited answers, so knowledge does not leave with the person who read the file.' },
      { icon: 'grid', t: 'Workload & risk reporting', b: 'See open matters, upcoming verified dates, overdue tasks and record completeness across the department.' },
      { icon: 'clock', t: 'Spend references', b: 'Cost centers, outside counsel budgets and time references attached to each matter for finance alignment.' },
    ],
    stats: [['Clear', 'intake for the business'], ['Cited', 'answers from your own documents'], ['Separate', 'from marketing and CRM data']],
  },
} as const;

export default function Solutions() {
  const { segment } = useParams();
  const s = SEGMENTS[segment as keyof typeof SEGMENTS];
  if (!s) return <Navigate to="/solutions/law-firms" replace />;
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">{s.eyebrow}</span>
          <h1>{s.title}</h1>
          <p>{s.lede}</p>
          <div className="hero-actions" style={{ marginTop: 24 }}>
            <Link to="/demo" className="btn btn-bronze">Request a demo</Link>
            <Link to="/app" className="btn btn-outline-light">Explore demo workspace</Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Use cases</h2></div>
          <div className="grid-3">
            {s.cases.map((c) => (
              <div className="card" key={c.t}>
                <div className="icon-tile"><Icon name={c.icon} /></div>
                <h3>{c.t}</h3>
                <p>{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="container grid-3">
          {s.stats.map(([a, b]) => (
            <div key={b}><div className="stat">{a}</div><div className="muted">{b}</div></div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div><h2>Talk to a legal workflow specialist.</h2><p style={{ color: '#c3cddb', margin: '8px 0 0' }}>We will walk through a demonstration workspace modelled on your practice.</p></div>
            <Link to="/demo" className="btn btn-bronze">Request a demo</Link>
          </div>
        </div>
      </section>
    </>
  );
}
