import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';

const features = [
  { icon: 'file', title: 'Matter document intelligence', body: 'Extract parties, dates, references, amounts and key passages from pleadings, orders, agreements and notices — every item linked to the paragraph it came from.' },
  { icon: 'spark', title: 'Source-grounded summaries', body: 'Concise summaries of documents and case materials where each point carries a citation you can click to see the underlying text.' },
  { icon: 'calendar', title: 'Deadline identification', body: 'Surface candidate dates and potential deadlines. Nothing reaches the calendar as verified until an authorized attorney or docketing specialist approves it.' },
  { icon: 'search', title: 'Document search assistant', body: 'Ask questions across the matter documents you are authorized to see. Answers are composed from retrieved passages — or the assistant tells you it found no support.' },
  { icon: 'bolt', title: 'Workflow recommendations', body: 'Spot missing documents, overdue tasks, unverified dates and incomplete matter records before they become problems.' },
  { icon: 'history', title: 'Complete audit history', body: 'Every upload, AI run, verification, assignment and search is recorded with actor and timestamp, exportable for compliance review.' },
] as const;

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Matter coordination · Document intelligence</span>
            <h1>Every matter, woven together — with AI you can verify.</h1>
            <p className="lede">
              MatterWeave gives law firms and corporate legal departments a structured workspace for each matter, connecting documents, tasks,
              deadlines, client communications and reporting. AI does the first read. Your people make the call.
            </p>
            <div className="hero-actions">
              <Link to="/demo" className="btn btn-bronze">Request a demo <Icon name="arrow" size={16} /></Link>
              <Link to="/app" className="btn btn-outline-light">Open the demo workspace</Link>
            </div>
            <div className="hero-meta">
              <span className="row"><Icon name="shield" size={15} /> Tenant-isolated on AWS</span>
              <span className="row"><Icon name="lock" size={15} /> Encrypted with customer-scoped keys</span>
              <span className="row"><Icon name="check" size={15} /> Human verification built in</span>
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div className="container">
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 24 }}>
            <span className="muted small" style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Designed for teams like</span>
            <div className="logos">
              <span>Vance Hale &amp; Partners</span><span>Northvale Bio</span><span>Ashgrove LLP</span><span>Merrow Industrial</span><span>Calder &amp; Finch</span>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Illustrative, fictional organizations.</p>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Core capabilities</span>
            <h2>AI that reads the file — and shows its work.</h2>
            <p>Built for the administrative reality of legal work: high volumes of documents, many hands on each matter, and zero tolerance for an unchecked date.</p>
          </div>
          <div className="grid-3">
            {features.map((f) => (
              <div className="card" key={f.title}>
                <div className="icon-tile"><Icon name={f.icon} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container two-col" style={{ gap: 56, alignItems: 'center' }}>
          <div>
            <span className="eyebrow">Human in the loop, by design</span>
            <h2 style={{ fontSize: 36 }}>Candidate dates are not deadlines until a person says so.</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 17 }}>
              MatterWeave separates what the AI found from what your team has confirmed. Computed dates show their arithmetic and source passage, and reviewers
              can correct, approve or reject each one. Approvals are attributed and logged.
            </p>
            <ul className="check-list">
              <li>Explicit and computed dates clearly distinguished</li>
              <li>Role-based approval — only authorized legal staff can verify</li>
              <li>One click from a verified date to an assigned task</li>
              <li>No automatic filing, ever</li>
            </ul>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <div className="panel-head"><strong>Scheduling Order · candidate dates</strong><span className="badge b-warn">3 awaiting review</span></div>
            <div className="panel-body stack">
              {[
                ['Initial Disclosures', 'Nov 6, 2026', 'Explicit · ¶3', 'verified'],
                ['Amendment of Pleadings', 'Dec 4, 2026', 'Explicit · ¶4', 'candidate'],
                ['Joint Status Report', 'Apr 2, 2027', 'Computed: 14 days after close of fact discovery · ¶7', 'candidate'],
              ].map(([t, d, s, st]) => (
                <div key={t} className={`dl-card ${st}`}>
                  <div className="row"><strong>{t}</strong><span className="spacer" />{st === 'verified' ? <span className="badge b-success">Verified · P. Raman</span> : <span className="badge b-warn">AI candidate</span>}</div>
                  <div className="row"><span className="dl-date">{d}</span><span className="muted small">{s}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section dark">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Enterprise foundation</span>
            <h2>Confidentiality is the architecture, not a feature.</h2>
            <p>Each customer is isolated at the storage, database and key level. Matter data never enters marketing systems and is never used to train models.</p>
          </div>
          <div className="grid-4">
            {[
              ['shield', 'Tenant isolation', 'Per-tenant S3 prefixes, KMS keys and PostgreSQL row-level security.'],
              ['key', 'Least privilege', 'Scoped IAM roles per service; ethical walls enforced at the matter level.'],
              ['history', 'Audit logging', 'Immutable application audit trail plus AWS CloudTrail.'],
              ['clock', 'Retention controls', 'Configurable policies per matter type, with legal hold.'],
            ].map(([i, t, b]) => (
              <div className="card" key={t}>
                <div className="icon-tile"><Icon name={i as 'shield'} /></div>
                <h3 style={{ fontSize: 18 }}>{t}</h3>
                <p>{b}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}><Link to="/security" className="btn btn-outline-light">Read the security overview <Icon name="arrow" size={16} /></Link></div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <Link to="/solutions/law-firms" className="card" style={{ textDecoration: 'none' }}>
            <div className="icon-tile"><Icon name="scale" /></div>
            <h3>For law firms</h3>
            <p>Coordinate litigation and transactional teams, keep docketing tight, and give clients a clear record of communications and progress.</p>
            <span className="row" style={{ color: 'var(--bronze-600)', fontWeight: 600, fontSize: 14 }}>Law firm use cases <Icon name="arrow" size={15} /></span>
          </Link>
          <Link to="/solutions/corporate-legal" className="card" style={{ textDecoration: 'none' }}>
            <div className="icon-tile"><Icon name="building" /></div>
            <h3>For corporate legal departments</h3>
            <p>Run intake, track outside counsel and internal matters, and report on workload, deadlines and spend from one structured system.</p>
            <span className="row" style={{ color: 'var(--bronze-600)', fontWeight: 600, fontSize: 14 }}>Corporate legal use cases <Icon name="arrow" size={15} /></span>
          </Link>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>See MatterWeave on your kind of matters.</h2>
              <p style={{ color: '#c3cddb', margin: '8px 0 0' }}>A 30-minute walkthrough with a legal workflow specialist, using demonstration data.</p>
            </div>
            <div className="row wrap">
              <Link to="/app" className="btn btn-outline-light">Try the demo workspace</Link>
              <Link to="/demo" className="btn btn-bronze">Request a demo</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroPreview() {
  return (
    <div className="preview-card" aria-label="Product preview">
      <div className="bar"><span className="dot" style={{ color: '#d9a07a' }} /> MW-2026-0142 · Harrow Logistics v. Calloway Freight <span className="spacer" /><span className="badge b-bronze">Demo data</span></div>
      <div className="body">
        <div className="row"><span className="ai-tag"><Icon name="spark" size={13} /> AI summary</span><span className="spacer" /><span className="muted small">Complaint · 9 ¶</span></div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div>Calloway committed to at least 240 dedicated truckloads per month under the MSA dated January 15, 2024.<span className="cite">¶3</span></div>
          <div>Deliveries averaged 131 truckloads per month from April through June 2026.<span className="cite">¶4</span></div>
          <div>Harrow seeks damages of not less than $2,840,000.<span className="cite">¶9</span></div>
        </div>
        <div className="notice" style={{ fontSize: 12 }}><Icon name="alert" size={14} /> AI-assisted output. Verify against cited sources. Not legal advice.</div>
        <div className="dl-card candidate">
          <div className="row"><strong>Initial disclosures</strong><span className="spacer" /><span className="badge b-warn">Needs verification</span></div>
          <div className="row"><span className="dl-date">Nov 6, 2026</span><span className="muted small">Scheduling Order ¶3</span></div>
        </div>
      </div>
    </div>
  );
}
