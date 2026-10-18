import { useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { formatDate } from '../ai/engine';
import { AiDisclaimer, Icon, MatterStatusBadge } from '../components/ui';
import { retentionPolicies } from '../data/demo';
import { can, canSeeMatter, ROLE_LABEL } from '../state/permissions';
import { useStore } from '../state/store';
import type { BillingRef, Matter } from '../types';
import { AddDeadlineModal, AuditTable, CommLog, CreateTaskModal, DeadlineCard, MatterFormModal, RecommendationsPanel, TaskBoard, UploadModal } from './components';
import { DocTable } from './DocumentLibrary';

const TABS = [
  ['overview', 'Overview'], ['documents', 'Documents'], ['deadlines', 'Deadlines'], ['tasks', 'Tasks & review'],
  ['communications', 'Communications'], ['billing', 'Time & billing'], ['audit', 'Audit history'],
] as const;

export default function MatterDetail() {
  const { matterId, tab = 'overview' } = useParams();
  const { state, me, userById } = useStore();
  const [editing, setEditing] = useState(false);
  const m = state.matters.find((x) => x.id === matterId);
  if (!m) return <Navigate to="/app/matters" replace />;
  if (!canSeeMatter(me, m)) {
    return (
      <div className="content">
        <div className="panel panel-body empty">
          <Icon name="lock" size={28} />
          <h2 style={{ marginTop: 12 }}>Access restricted</h2>
          <p>{me.name} is not on the team for this matter. Access is controlled by matter-level team membership (ethical wall).</p>
          <Link to="/app/matters" className="btn btn-ghost">Back to matters</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-title">
        <div>
          <div className="small muted"><Link to="/app/matters">Matters</Link> / {m.number}</div>
          <h1>{m.name}</h1>
          <div className="sub row wrap" style={{ marginTop: 6 }}>
            <MatterStatusBadge s={m.status} />
            <span>{m.client}</span>·<span>{m.practiceArea}</span>·<span>Lead: {userById(m.leadId)?.name}</span>
            {m.retentionPolicy === 'ret-hold' && <span className="badge b-danger"><Icon name="lock" size={12} /> Legal hold</span>}
          </div>
        </div>
        <button className="btn btn-ghost" disabled={!can(me, 'matter.assign')} onClick={() => setEditing(true)}><Icon name="users" size={16} /> Edit & assign</button>
      </div>
      <div className="tabs">
        {TABS.map(([k, label]) => <NavLink key={k} to={`/app/matters/${m.id}/${k}`} className={() => (tab === k ? 'active' : '')}>{label}</NavLink>)}
      </div>
      {tab === 'overview' && <Overview m={m} />}
      {tab === 'documents' && <Documents m={m} />}
      {tab === 'deadlines' && <Deadlines m={m} />}
      {tab === 'tasks' && <Tasks m={m} />}
      {tab === 'communications' && <CommLog matterId={m.id} items={state.communications.filter((c) => c.matterId === m.id)} />}
      {tab === 'billing' && <Billing m={m} />}
      {tab === 'audit' && !can(me, 'audit.read') && <div className="panel empty">Audit history is limited to partners, attorneys and legal operations.</div>}
      {tab === 'audit' && can(me, 'audit.read') && <div className="panel"><AuditTable events={state.audit.filter((a) => a.matterId === m.id)} /></div>}
      {editing && <MatterFormModal matter={m} onClose={() => setEditing(false)} />}
    </div>
  );
}

function Overview({ m }: { m: Matter }) {
  const { state, userById } = useStore();
  const docs = state.documents.filter((d) => d.matterId === m.id);
  const dls = state.deadlines.filter((d) => d.matterId === m.id);
  return (
    <div className="two-col">
      <div className="stack" style={{ gap: 22 }}>
        <div className="panel">
          <div className="panel-head"><h3>Matter record</h3></div>
          <div className="panel-body stack">
            <p style={{ margin: 0 }}>{m.description}</p>
            <div className="grid-2 small" style={{ gap: 12 }}>
              <div><div className="muted">Matter number</div><strong className="mono">{m.number}</strong></div>
              <div><div className="muted">Opened</div><strong>{formatDate(m.openedOn)}</strong></div>
              <div><div className="muted">Client type</div><strong>{m.clientType === 'internal_business_unit' ? 'Internal business unit' : 'External client'}</strong></div>
              <div><div className="muted">Retention</div><strong>{retentionPolicies[m.retentionPolicy].label}</strong><div className="muted">{retentionPolicies[m.retentionPolicy].detail}</div></div>
            </div>
          </div>
        </div>
        <RecommendationsPanel matters={[m]} />
      </div>
      <div className="stack" style={{ gap: 22 }}>
        <div className="panel">
          <div className="panel-head"><h3>Team</h3></div>
          <div className="panel-body stack" style={{ gap: 10 }}>
            {m.teamIds.map((id) => {
              const u = userById(id)!;
              return <div key={id} className="row"><span className={`avatar${id === m.leadId ? '' : ' navy'}`}>{u.initials}</span><div><strong>{u.name}</strong>{id === m.leadId && <span className="badge b-bronze" style={{ marginLeft: 6 }}>Lead</span>}<div className="small muted">{u.title} · {ROLE_LABEL[u.role]}</div></div></div>;
            })}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>At a glance</h3></div>
          <div className="panel-body grid-2" style={{ gap: 14 }}>
            <div><div className="kpi value" style={{ padding: 0, fontFamily: 'var(--serif)', fontSize: 26 }}>{docs.length}</div><div className="small muted">Documents</div></div>
            <div><div style={{ fontFamily: 'var(--serif)', fontSize: 26 }}>{dls.filter((d) => d.status === 'verified').length}</div><div className="small muted">Verified dates</div></div>
            <div><div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--bronze-600)' }}>{dls.filter((d) => d.status === 'candidate').length}</div><div className="small muted">Candidates to review</div></div>
            <div><div style={{ fontFamily: 'var(--serif)', fontSize: 26 }}>{state.tasks.filter((t) => t.matterId === m.id && t.status !== 'done').length}</div><div className="small muted">Open tasks</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Documents({ m }: { m: Matter }) {
  const { state, me } = useStore();
  const nav = useNavigate();
  const [up, setUp] = useState(false);
  const docs = me.role === 'viewer' ? [] : state.documents.filter((d) => d.matterId === m.id);
  const have = new Set(docs.map((d) => d.docType));
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="panel">
        <div className="panel-head">
          <h3>Document library</h3>
          <button className="btn btn-primary btn-sm" disabled={!can(me, 'document.upload')} onClick={() => setUp(true)}><Icon name="upload" size={14} /> Upload</button>
        </div>
        {me.role === 'viewer' ? <div className="empty">Read-only billing access does not include document content.</div> : <DocTable docs={docs} />}
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Document checklist · {m.practiceArea}</h3></div>
        <div className="panel-body chips">
          {m.requiredDocTypes.map((t) => <span key={t} className={`badge ${have.has(t) ? 'b-success' : 'b-danger'}`}>{have.has(t) ? <Icon name="check" size={12} stroke={2.4} /> : <Icon name="x" size={12} />} {t}</span>)}
        </div>
      </div>
      {up && <UploadModal matterId={m.id} onClose={(id) => { setUp(false); if (id) nav(`/app/documents/${id}`); }} />}
    </div>
  );
}

function Deadlines({ m }: { m: Matter }) {
  const { state, me } = useStore();
  const [adding, setAdding] = useState(false);
  const all = state.deadlines.filter((d) => d.matterId === m.id).sort((a, b) => a.date.localeCompare(b.date));
  const groups = [
    ['candidate', 'Awaiting verification', 'AI-identified dates. These are not deadlines until verified by authorized legal staff.'],
    ['verified', 'Verified deadlines', 'Approved by a named reviewer and shown on the deadline calendar.'],
    ['rejected', 'Rejected candidates', 'Kept for the audit trail.'],
  ] as const;
  return (
    <div className="stack" style={{ gap: 22 }}>
      <AiDisclaimer />
      <div className="row"><span className="spacer" /><button className="btn btn-ghost btn-sm" disabled={!can(me, 'deadline.verify')} onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Add verified deadline manually</button></div>
      {groups.map(([s, title, hint]) => {
        const list = all.filter((d) => d.status === s);
        if (s === 'rejected' && !list.length) return null;
        return (
          <div className="panel" key={s}>
            <div className="panel-head"><div><h3>{title} <span className="badge b-neutral">{list.length}</span></h3><div className="small muted">{hint}</div></div></div>
            <div className="panel-body stack">
              {list.length ? list.map((d) => <DeadlineCard key={d.id} d={d} />) : <div className="empty">{s === 'candidate' ? 'No candidates. Analyze a document to identify dates.' : 'None yet.'}</div>}
            </div>
          </div>
        );
      })}
      {adding && <AddDeadlineModal matterId={m.id} onClose={() => setAdding(false)} />}
    </div>
  );
}

function Tasks({ m }: { m: Matter }) {
  const { state, me } = useStore();
  const [creating, setCreating] = useState(false);
  return (
    <div className="stack">
      <div className="row"><span className="small muted">Tasks with a reviewer move through <strong>In review</strong> and require reviewer approval before completion.</span><span className="spacer" /><button className="btn btn-primary btn-sm" disabled={!can(me, 'task.write')} onClick={() => setCreating(true)}><Icon name="plus" size={14} /> New task</button></div>
      <TaskBoard tasks={state.tasks.filter((t) => t.matterId === m.id)} />
      {creating && <CreateTaskModal matterId={m.id} onClose={() => setCreating(false)} />}
    </div>
  );
}

function Billing({ m }: { m: Matter }) {
  const { dispatch, me } = useStore();
  const [b, setB] = useState<BillingRef>(m.billing);
  const editable = can(me, 'billing.edit');
  const dirty = JSON.stringify(b) !== JSON.stringify(m.billing);
  return (
    <div className="two-col">
      <div className="panel">
        <div className="panel-head"><h3>Time & billing reference fields</h3>{!editable && <span className="badge b-neutral">Read-only</span>}</div>
        <div className="panel-body stack">
          <div className="form-grid">
            <label className="field">Billing code<input className="input" disabled={!editable} value={b.billingCode} onChange={(e) => setB({ ...b, billingCode: e.target.value })} /></label>
            <label className="field">Client-matter reference<input className="input" disabled={!editable} value={b.clientMatterRef} onChange={(e) => setB({ ...b, clientMatterRef: e.target.value })} /></label>
            <label className="field">Fee arrangement<select className="input" disabled={!editable} value={b.arrangement} onChange={(e) => setB({ ...b, arrangement: e.target.value as BillingRef['arrangement'] })}>{['Hourly', 'Fixed fee', 'Capped fee', 'Internal cost center'].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="field">LEDES task code<input className="input" disabled={!editable} value={b.ledesTaskCode ?? ''} onChange={(e) => setB({ ...b, ledesTaskCode: e.target.value })} /></label>
            <label className="field">Budget (USD)<input className="input" type="number" disabled={!editable} value={b.budget ?? ''} onChange={(e) => setB({ ...b, budget: e.target.value ? Number(e.target.value) : undefined })} /></label>
            <label className="field">Time logged (hours, from billing system)<input className="input" disabled value={b.timeLoggedHours} /></label>
          </div>
          <div className="row"><span className="small muted">Reference fields only — time entry and invoicing remain in your billing system.</span><span className="spacer" />
            <button className="btn btn-primary btn-sm" disabled={!editable || !dirty} onClick={() => dispatch({ type: 'updateMatter', matterId: m.id, patch: { billing: b }, auditAction: 'billing.update', detail: `Code: ${b.billingCode || '—'}; ref: ${b.clientMatterRef || '—'}` })}>Save</button>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Budget reference</h3></div>
        <div className="panel-body stack">
          {m.billing.budget ? (
            <>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28 }}>${m.billing.budget.toLocaleString()}</div>
              <div className="small muted">{m.billing.arrangement} · {m.billing.timeLoggedHours} hours logged to date</div>
            </>
          ) : <div className="muted small">No budget recorded.</div>}
        </div>
      </div>
    </div>
  );
}
