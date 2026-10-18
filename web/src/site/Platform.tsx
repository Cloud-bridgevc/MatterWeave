import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';

const blocks = [
  {
    id: 'intelligence',
    icon: 'file',
    eyebrow: 'Matter document intelligence',
    title: 'Structured information from unstructured documents.',
    body: 'Upload pleadings, orders, agreements, notices and correspondence. MatterWeave extracts parties, courts and agencies, dates, case and section references, monetary amounts and the passages most likely to matter — each tied to its source paragraph.',
    points: ['Supports PDF, DOCX and text with OCR for scans', 'Entity list with jump-to-source', 'Key passage highlighting', 'Privilege flag respected in search and exports'],
  },
  {
    id: 'summaries',
    icon: 'spark',
    eyebrow: 'Matter summaries',
    title: 'Summaries that cite their sources.',
    body: 'Generate concise summaries of single documents or a set of case materials. Every point carries a paragraph-level citation, so reviewers can confirm the summary says what the document says.',
    points: ['Paragraph-level citations on every point', 'Model and generation time recorded', 'Regenerate or discard — summaries never overwrite documents', 'Clearly labelled as AI-assisted'],
  },
  {
    id: 'deadlines',
    icon: 'calendar',
    eyebrow: 'Deadline identification',
    title: 'Candidate dates in. Verified deadlines out.',
    body: 'MatterWeave flags explicit dates and relative periods ("within 30 days of receipt", "180 days prior to the Expiration Date"), shows the computation, and routes them to authorized staff. Reviewers approve, correct or reject; only verified dates count as docketed.',
    points: ['Explicit vs. computed dates distinguished', 'Arithmetic and assumptions shown', 'Role-gated verification with notes', 'Create an assigned task from any verified date'],
  },
  {
    id: 'search',
    icon: 'search',
    eyebrow: 'Document search assistant',
    title: 'Ask the file — and see exactly where the answer comes from.',
    body: 'Retrieval-grounded question answering over the documents a user is authorized to see. Answers are composed from retrieved passages with citations. If nothing relevant is found, the assistant says so rather than guessing.',
    points: ['Matter-scoped and permission-aware retrieval', 'Inline citations to passages', 'Explicit "not found" behaviour', 'Every query recorded in the audit log'],
  },
  {
    id: 'workflow',
    icon: 'bolt',
    eyebrow: 'Workflow recommendations',
    title: 'Know what is missing before anyone asks.',
    body: 'Rules that compare each matter to its checklist: missing engagement letters or orders, overdue tasks, upcoming verified dates without an owner, unverified candidates and blank billing fields.',
    points: ['Practice-area document checklists', 'Overdue and upcoming task detection', 'Incomplete record prompts', 'Explainable — each item points to the record'],
  },
] as const;

export default function Platform() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Platform</span>
          <h1>One workspace per matter. Every document, date and decision connected.</h1>
          <p>Matter records, document library, AI search, deadline calendar, task review workflow, client communication log, billing references and audit history — in one structured system.</p>
        </div>
      </section>

      <section className="section alt" style={{ paddingTop: 56, paddingBottom: 56 }}>
        <div className="container grid-4">
          {[
            ['folder', 'Matter overview', 'Status, team, client, practice area, retention'],
            ['users', 'Creation & assignment', 'Lead, team and ethical-wall access'],
            ['file', 'Document library', 'Encrypted storage with versioned uploads'],
            ['search', 'AI-powered search', 'Grounded answers with citations'],
            ['calendar', 'Deadline calendar', 'Verified vs. candidate dates'],
            ['check', 'Tasks & review', 'Assignee, reviewer, approval states'],
            ['chat', 'Communication log', 'Calls, emails, meetings, letters'],
            ['clock', 'Time & billing refs', 'Billing codes, LEDES task codes, budgets'],
          ].map(([i, t, b]) => (
            <div key={t} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div className="icon-tile" style={{ margin: 0, flex: 'none' }}><Icon name={i as 'file'} /></div>
              <div><strong>{t}</strong><div className="muted small">{b}</div></div>
            </div>
          ))}
        </div>
      </section>

      {blocks.map((b, i) => (
        <section key={b.id} id={b.id} className={`section${i % 2 ? ' alt' : ''}`}>
          <div className="container two-col" style={{ gap: 56, alignItems: 'center' }}>
            <div>
              <span className="eyebrow">{b.eyebrow}</span>
              <h2 style={{ fontSize: 34 }}>{b.title}</h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 16.5 }}>{b.body}</p>
            </div>
            <div className="card">
              <div className="icon-tile"><Icon name={b.icon} /></div>
              <ul className="check-list">{b.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          </div>
        </section>
      ))}

      <section className="section dark">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Guardrails</span>
            <h2>What MatterWeave will not do.</h2>
            <p>We designed the product around the limits of AI in legal work.</p>
          </div>
          <div className="grid-3">
            <div className="card"><h3>No legal advice</h3><p>AI output is labelled as assistance for review and coordination. It is not presented as an authoritative legal conclusion.</p></div>
            <div className="card"><h3>No automatic filing</h3><p>MatterWeave never files, serves or submits documents to any court, agency or counterparty.</p></div>
            <div className="card"><h3>No unverified deadlines</h3><p>Dates identified by AI remain candidates until an authorized person verifies them, with their name and note recorded.</p></div>
          </div>
          <div style={{ marginTop: 28 }}><Link to="/app" className="btn btn-bronze">See it in the demo workspace <Icon name="arrow" size={16} /></Link></div>
        </div>
      </section>
    </>
  );
}
