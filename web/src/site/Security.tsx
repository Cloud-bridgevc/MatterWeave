import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';

const pillars = [
  { icon: 'shield', t: 'Tenant isolation', items: ['Every record carries a tenant_id enforced by PostgreSQL row-level security', 'Documents stored under per-tenant S3 prefixes with bucket policies denying cross-tenant access', 'Per-tenant AWS KMS keys; Dedicated plan offers a separate AWS account per customer', 'Processing jobs carry tenant context end-to-end and are rejected without it'] },
  { icon: 'key', t: 'Least-privilege access', items: ['Role-based capabilities (partner, attorney, paralegal, legal ops, read-only)', 'Matter-level team membership for ethical walls', 'Each Lambda function has its own narrowly scoped IAM role', 'SSO / SAML with MFA enforced by your identity provider; SCIM deprovisioning'] },
  { icon: 'lock', t: 'Encryption', items: ['TLS 1.2+ for all traffic', 'S3 SSE-KMS with bucket keys; RDS storage and snapshots encrypted with KMS', 'Secrets in AWS Secrets Manager with rotation', 'Presigned URLs are short-lived and single-object'] },
  { icon: 'history', t: 'Audit logging', items: ['Application audit trail for uploads, AI runs, searches, verifications and assignments', 'Append-only audit table; writes restricted to the audit role', 'AWS CloudTrail (including data events) to a locked log archive', 'Exportable for client and regulatory review'] },
  { icon: 'clock', t: 'Configurable retention', items: ['Retention policies per matter type (e.g., 7 or 10 years after close)', 'Legal hold suspends lifecycle expiry and deletion', 'S3 Object Lock available for immutable retention', 'Disposition requires approval and is itself audited'] },
  { icon: 'database', t: 'Data separation', items: ['Matter content never syncs to CRM or marketing systems', 'HubSpot receives only prospect and account-level commercial data', 'No customer data used to train foundation models', 'Amazon Bedrock processes prompts in-region; inputs are not retained by model providers'] },
] as const;

export default function Security() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Security & privacy</span>
          <h1>Built for privileged, confidential, client-owned information.</h1>
          <p>MatterWeave runs on AWS with tenant isolation, least-privilege access, encryption everywhere, comprehensive audit logging and configurable retention.</p>
        </div>
      </section>
      <section className="section">
        <div className="container grid-3">
          {pillars.map((p) => (
            <div className="card" key={p.t}>
              <div className="icon-tile"><Icon name={p.icon} /></div>
              <h3>{p.t}</h3>
              <ul className="check-list">{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>
      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Architecture</span>
            <h2>How a document moves through MatterWeave</h2>
          </div>
          <div className="grid-4">
            {[
              ['upload', '1. Upload', 'Browser requests a short-lived presigned URL; the file goes directly to the tenant\'s S3 prefix, encrypted with the tenant KMS key.'],
              ['bolt', '2. Queue', 'An S3 event enqueues a job on SQS with tenant and matter context. Lambda workers extract text (Textract for scans).'],
              ['spark', '3. Analyze', 'A Lambda calls Amazon Bedrock in-region with paragraph-numbered text and a strict schema: every output must cite a paragraph.'],
              ['database', '4. Store for review', 'Results land in PostgreSQL as candidates under RLS. Nothing becomes a verified deadline without a human approval event.'],
            ].map(([i, t, b]) => (
              <div className="card" key={t}><div className="icon-tile"><Icon name={i as 'upload'} /></div><h3 style={{ fontSize: 18 }}>{t}</h3><p>{b}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="section" id="ai">
        <div className="container two-col" style={{ gap: 56 }}>
          <div>
            <span className="eyebrow">Responsible AI</span>
            <h2 style={{ fontSize: 34 }}>Assistance for review — never a substitute for professional judgment.</h2>
            <p style={{ color: 'var(--ink-2)' }}>MatterWeave supports administrative coordination and document review. Our AI policies are enforced in the product, not just stated.</p>
          </div>
          <ul className="check-list card">
            <li>AI output is always labelled and never presented as legal advice</li>
            <li>Summaries and answers cite the source passages they rely on</li>
            <li>The search assistant declines to answer when retrieval finds no support</li>
            <li>Candidate dates require verification by authorized legal staff</li>
            <li>No automatic filing, service or submission of documents</li>
            <li>Model, prompt version and timestamp recorded for each AI run</li>
          </ul>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <div><h2>Need our security package?</h2><p style={{ color: '#c3cddb', margin: '8px 0 0' }}>Architecture overview, data flow diagrams and our security questionnaire responses are available under NDA.</p></div>
            <Link to="/demo" className="btn btn-bronze">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
