import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'Practice',
    price: '$89',
    unit: 'per user / month, billed annually',
    for: 'Boutique firms and small legal teams',
    features: ['Matter workspaces & document library', 'Document intelligence & summaries', 'Candidate deadline identification', 'Tasks, communications & billing refs', '500 GB encrypted storage', 'Standard audit history (1 year)'],
  },
  {
    name: 'Enterprise',
    price: '$149',
    unit: 'per user / month, billed annually',
    for: 'Mid-size and large firms, legal departments',
    featured: true,
    features: ['Everything in Practice', 'Document search assistant (RAG)', 'Workflow recommendations & checklists', 'SSO / SAML & SCIM provisioning', 'Configurable retention & legal hold', 'Audit export & 7-year retention'],
  },
  {
    name: 'Dedicated',
    price: 'Custom',
    unit: 'annual agreement',
    for: 'Regulated or high-volume environments',
    features: ['Everything in Enterprise', 'Dedicated AWS account per tenant', 'Customer-managed KMS keys', 'Region pinning & private connectivity', 'Custom document types & checklists', 'Named customer success lead'],
  },
];

export default function Pricing() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Pricing</span>
          <h1>Straightforward pricing for legal teams of every size.</h1>
          <p>Illustrative pricing for this concept product. All plans include encryption at rest and in transit, tenant isolation and human-verification workflows.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid-3">
            {tiers.map((t) => (
              <div key={t.name} className={`card price-card${t.featured ? ' featured' : ''}`}>
                {t.featured && <span className="badge b-bronze" style={{ position: 'absolute', top: -12, left: 24 }}>Most popular</span>}
                <h3>{t.name}</h3>
                <p className="muted" style={{ margin: 0 }}>{t.for}</p>
                <div className="price" style={{ marginTop: 16 }}>{t.price}</div>
                <div className="small muted">{t.unit}</div>
                <ul className="check-list">{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <Link to="/demo" className={`btn ${t.featured ? 'btn-bronze' : 'btn-primary'}`}>{t.price === 'Custom' ? 'Contact sales' : 'Request a demo'}</Link>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 18 }}>AI processing includes a generous monthly page allowance per user; high-volume document review is available as an add-on. Prices exclude applicable taxes.</p>
        </div>
      </section>
      <section className="section alt">
        <div className="container">
          <div className="section-head"><h2>Compare plans</h2></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="compare">
              <thead><tr><th>Capability</th><th>Practice</th><th>Enterprise</th><th>Dedicated</th></tr></thead>
              <tbody>
                {[
                  ['Human verification of AI dates', '✓', '✓', '✓'],
                  ['Source-cited summaries', '✓', '✓', '✓'],
                  ['Document search assistant', '—', '✓', '✓'],
                  ['Workflow recommendations', 'Basic', '✓', '✓'],
                  ['SSO / SCIM', '—', '✓', '✓'],
                  ['Retention policies & legal hold', 'Default', 'Configurable', 'Configurable'],
                  ['Encryption keys', 'Tenant KMS key', 'Tenant KMS key', 'Customer-managed'],
                  ['Isolation model', 'Pooled + RLS', 'Pooled + RLS', 'Dedicated account'],
                ].map((r) => <tr key={r[0]}>{r.map((c, i) => (i ? <td key={i}>{c}</td> : <th key={i} style={{ background: 'white', fontWeight: 500 }}>{c}</th>))}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
