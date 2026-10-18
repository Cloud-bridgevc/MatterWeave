import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, formatDate } from '../ai/engine';
import { recommendationsFor } from '../ai/recommendations';
import { DeadlineBadge, Icon, Modal, TASK_LABEL } from '../components/ui';
import { DEMO_TODAY, retentionPolicies } from '../data/demo';
import { can, ROLE_LABEL } from '../state/permissions';
import { uid, useStore } from '../state/store';
import type {
  AuditEvent, Communication, Deadline, DocType, Matter, MatterDocument, PracticeArea, SourceRef, Task, TaskStatus,
} from '../types';

// ───────────────────────── Source citation ─────────────────────────

export function Cite({ s, label }: { s: SourceRef; label?: string }) {
  const { state } = useStore();
  const doc = state.documents.find((d) => d.id === s.docId);
  return (
    <Link className="cite" to={`/app/documents/${s.docId}?p=${s.paragraph}`} title={`${doc?.title ?? 'Source'} — paragraph ${s.paragraph + 1}`}>
      {label ?? `¶${s.paragraph + 1}`}
    </Link>
  );
}

// ───────────────────────── Deadlines ─────────────────────────

export function DeadlineCard({ d, showMatter }: { d: Deadline; showMatter?: boolean }) {
  const { state, me, userById } = useStore();
  const [verifying, setVerifying] = useState<null | 'verify' | 'reject'>(null);
  const [tasking, setTasking] = useState(false);
  const doc = d.source && state.documents.find((x) => x.id === d.source!.docId);
  const matter = state.matters.find((m) => m.id === d.matterId);
  const linkedTask = state.tasks.find((t) => t.linkedDeadlineId === d.id);
  const past = d.date < DEMO_TODAY;
  const allowed = can(me, 'deadline.verify');

  return (
    <div className={`dl-card ${d.status}`}>
      <div className="row wrap">
        <strong>{d.title}</strong>
        <span className="spacer" />
        <DeadlineBadge d={d} />
      </div>
      <div className="row wrap">
        <span className="dl-date">{formatDate(d.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        {past && d.status !== 'rejected' && <span className="badge b-danger">In the past</span>}
        <span className="badge b-neutral">{d.basis === 'explicit' ? 'Explicit date' : 'Computed date'}</span>
        {d.status === 'candidate' && <span className="badge b-neutral">Confidence: {d.confidence}</span>}
      </div>
      {showMatter && matter && <div className="small"><Link to={`/app/matters/${matter.id}/deadlines`}>{matter.number} · {matter.name}</Link></div>}
      {d.computation && <div className="small muted"><strong>Computation:</strong> {d.computation}</div>}
      {d.source && doc && me.role !== 'viewer' && (
        <div className="small muted">
          Source: {doc.title} <Cite s={d.source} />
          <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, color: 'var(--ink-2)', marginTop: 4, borderLeft: '2px solid var(--warm-200)', paddingLeft: 10 }}>
            “{doc.paragraphs[d.source.paragraph]}”
          </div>
        </div>
      )}
      {d.status !== 'candidate' && d.verifiedBy && (
        <div className="small">
          {d.status === 'verified' ? 'Verified' : 'Rejected'} by <strong>{userById(d.verifiedBy)?.name}</strong> on {formatDate(d.verifiedAt!)}
          {d.verificationNote && <> — <em>{d.verificationNote}</em></>}
        </div>
      )}
      <div className="row wrap">
        {d.status === 'candidate' && (
          <>
            <button className="btn btn-success btn-sm" disabled={!allowed} onClick={() => setVerifying('verify')} title={allowed ? '' : `${ROLE_LABEL[me.role]} role cannot verify deadlines`}>
              <Icon name="check" size={14} /> Review & verify
            </button>
            <button className="btn btn-danger btn-sm" disabled={!allowed} onClick={() => setVerifying('reject')}>Reject</button>
            {!allowed && <span className="small muted">Only authorized legal staff can verify.</span>}
          </>
        )}
        {d.status === 'verified' && (linkedTask ? (
          <span className="small muted"><Icon name="link" size={13} /> Task: {linkedTask.title} ({TASK_LABEL[linkedTask.status]})</span>
        ) : (
          <button className="btn btn-ghost btn-sm" disabled={!can(me, 'task.write')} onClick={() => setTasking(true)}><Icon name="plus" size={14} /> Create task</button>
        ))}
      </div>
      {verifying && <VerifyModal d={d} mode={verifying} onClose={() => setVerifying(null)} />}
      {tasking && <CreateTaskModal matterId={d.matterId} deadline={d} onClose={() => setTasking(false)} />}
    </div>
  );
}

function VerifyModal({ d, mode, onClose }: { d: Deadline; mode: 'verify' | 'reject'; onClose: () => void }) {
  const { dispatch } = useStore();
  const [date, setDate] = useState(d.date);
  const [title, setTitle] = useState(d.title);
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const verify = mode === 'verify';
  return (
    <Modal
      title={verify ? 'Verify candidate deadline' : 'Reject candidate date'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {verify ? (
            <button className="btn btn-success" disabled={!checked || !note.trim()} onClick={() => { dispatch({ type: 'verifyDeadline', id: d.id, note: note.trim(), date, title }); onClose(); }}>
              Verify and add to calendar
            </button>
          ) : (
            <button className="btn btn-danger" disabled={!note.trim()} onClick={() => { dispatch({ type: 'rejectDeadline', id: d.id, note: note.trim() }); onClose(); }}>Reject</button>
          )}
        </>
      }
    >
      <div className="notice small">
        <Icon name="alert" size={16} />
        <div>
          {verify
            ? 'You are confirming this date from your own review of the source and applicable rules. The AI extractor uses calendar-day arithmetic only and does not apply court rules, holidays, service methods or contract notice mechanics.'
            : 'Rejected candidates stay in the audit history with your reason.'}
        </div>
      </div>
      {verify && (
        <div className="form-grid">
          <label className="field">Deadline title<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="field">Verified date<input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
      )}
      {date !== d.date && <div className="small" style={{ color: 'var(--bronze-600)' }}>Date changed from AI candidate {formatDate(d.date)} — the correction will be logged.</div>}
      <label className="field">{verify ? 'Verification note (rule or provision relied on)' : 'Reason for rejection'}
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={verify ? 'e.g. Confirmed against Scheduling Order ¶3; no extensions entered.' : 'e.g. Caption date, not an obligation.'} />
      </label>
      {verify && (
        <label className="row small" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I have reviewed the source document and confirm this date is accurate for docketing purposes.</span>
        </label>
      )}
    </Modal>
  );
}

export function AddDeadlineModal({ matterId, onClose }: { matterId: string; onClose: () => void }) {
  const { dispatch, me } = useStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(addDays(DEMO_TODAY, 14));
  const [note, setNote] = useState('');
  return (
    <Modal title="Add verified deadline manually" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!title.trim() || !note.trim()} onClick={() => {
          dispatch({ type: 'addDeadline', deadline: { id: uid('dl'), matterId, title: title.trim(), date, basis: 'explicit', confidence: 'high', status: 'verified', verifiedBy: me.id, verifiedAt: new Date().toISOString(), verificationNote: note.trim(), createdBy: me.id } });
          onClose();
        }}>Add</button>
      </>
    }>
      <div className="form-grid">
        <label className="field">Title<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field">Date<input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <label className="field">Basis / authority<textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Stipulated extension filed Oct 20, 2026." /></label>
    </Modal>
  );
}

// ───────────────────────── Tasks ─────────────────────────

export function CreateTaskModal({ matterId, deadline, doc, onClose }: { matterId?: string; deadline?: Deadline; doc?: MatterDocument; onClose: () => void }) {
  const { state, dispatch, me } = useStore();
  const matters = state.matters.filter((m) => m.teamIds.includes(me.id) || me.role === 'legal_ops');
  const [mId, setMId] = useState(matterId ?? matters[0]?.id ?? '');
  const matter = state.matters.find((m) => m.id === mId);
  const suggestedDue = deadline ? addDays(deadline.date, -7) : addDays(DEMO_TODAY, 7);
  const [title, setTitle] = useState(deadline ? `Prepare for: ${deadline.title}` : doc ? `Review: ${doc.title}` : '');
  const [assigneeId, setAssignee] = useState(matter?.teamIds.find((id) => id !== matter.leadId) ?? me.id);
  const [reviewerId, setReviewer] = useState(matter?.leadId ?? '');
  const [due, setDue] = useState(suggestedDue < DEMO_TODAY ? DEMO_TODAY : suggestedDue);
  const team = state.users.filter((u) => matter?.teamIds.includes(u.id));

  return (
    <Modal title="Create task" onClose={onClose} footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!title.trim() || !mId} onClick={() => {
          const task: Task = { id: uid('t'), matterId: mId, title: title.trim(), assigneeId, reviewerId: reviewerId || undefined, dueDate: due, status: 'todo', linkedDeadlineId: deadline?.id, linkedDocId: doc?.id ?? deadline?.source?.docId, createdAt: new Date().toISOString(), createdBy: me.id };
          dispatch({ type: 'createTask', task });
          onClose();
        }}>Create task</button>
      </>
    }>
      {deadline && <div className="notice info small"><Icon name="link" size={16} /><div>Linked to verified deadline <strong>{deadline.title}</strong> on {formatDate(deadline.date)}. Suggested due date is 7 days earlier.</div></div>}
      {!matterId && (
        <label className="field">Matter
          <select className="input" value={mId} onChange={(e) => setMId(e.target.value)}>{matters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.name}</option>)}</select>
        </label>
      )}
      <label className="field">Task<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="form-grid">
        <label className="field">Assignee<select className="input" value={assigneeId} onChange={(e) => setAssignee(e.target.value)}>{team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="field">Reviewer<select className="input" value={reviewerId} onChange={(e) => setReviewer(e.target.value)}><option value="">No review required</option>{team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="field">Due date<input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      </div>
    </Modal>
  );
}

const NEXT: Record<TaskStatus, TaskStatus[]> = { todo: ['in_progress'], in_progress: ['in_review', 'done'], in_review: ['done', 'in_progress'], done: ['todo'] };

export function TaskCard({ t, showMatter }: { t: Task; showMatter?: boolean }) {
  const { state, dispatch, me, userById } = useStore();
  const a = userById(t.assigneeId);
  const r = userById(t.reviewerId);
  const m = state.matters.find((x) => x.id === t.matterId);
  const overdue = t.dueDate && t.dueDate < DEMO_TODAY && t.status !== 'done';
  const canMove = (to: TaskStatus) => {
    if (!can(me, 'task.write')) return false;
    // Tasks with a reviewer can only be completed from review by the reviewer (or a partner).
    if (to === 'done' && t.reviewerId) return t.status === 'in_review' && (me.id === t.reviewerId || me.role === 'partner');
    return true;
  };
  return (
    <div className="task-card">
      <div className="t">{t.title}</div>
      {showMatter && m && <Link className="small muted" to={`/app/matters/${m.id}/tasks`}>{m.number} · {m.client}</Link>}
      <div className="row wrap small">
        {a && <span className="row" style={{ gap: 5 }}><span className="avatar sm">{a.initials}</span>{a.name.split(' ')[0]}</span>}
        {r && <span className="muted">Reviewer: {r.name.split(' ')[0]}</span>}
      </div>
      <div className="row wrap">
        {t.dueDate && <span className={`badge ${overdue ? 'b-danger' : 'b-neutral'}`}><Icon name="clock" size={12} />{overdue ? 'Overdue · ' : ''}{formatDate(t.dueDate, { month: 'short', day: 'numeric' })}</span>}
        {t.linkedDeadlineId && <span className="badge b-navy"><Icon name="calendar" size={12} />Deadline</span>}
      </div>
      {t.status !== 'done' || can(me, 'task.write') ? (
        <div className="row wrap">
          {NEXT[t.status].map((to) => (
            <button key={to} className="btn btn-ghost btn-sm" disabled={!canMove(to)} onClick={() => dispatch({ type: 'setTaskStatus', taskId: t.id, status: to })}
              title={!canMove(to) && to === 'done' && t.reviewerId ? 'Reviewer approval required' : ''}>
              {to === 'in_review' ? 'Send for review' : to === 'done' ? (t.status === 'in_review' ? 'Approve' : 'Complete') : to === 'todo' ? 'Reopen' : to === 'in_progress' && t.status === 'in_review' ? 'Return' : 'Start'}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TaskBoard({ tasks, showMatter }: { tasks: Task[]; showMatter?: boolean }) {
  const cols: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
  return (
    <div className="board">
      {cols.map((c) => {
        const list = tasks.filter((t) => t.status === c).sort((a, b) => (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'));
        return (
          <div className="col" key={c}>
            <h3>{TASK_LABEL[c]}<span>{list.length}</span></h3>
            {list.map((t) => <TaskCard key={t.id} t={t} showMatter={showMatter} />)}
            {!list.length && <div className="small muted" style={{ padding: 8 }}>Nothing here.</div>}
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── Documents ─────────────────────────

const DOC_TYPES: DocType[] = ['Complaint', 'Answer', 'Scheduling Order', 'Contract', 'Term Sheet', 'Board Consent', 'Lease', 'Notice Letter', 'Agency Charge', 'Engagement Letter', 'Correspondence'];

export function UploadModal({ matterId, onClose }: { matterId?: string; onClose: (docId?: string) => void }) {
  const { state, dispatch, me } = useStore();
  const matters = state.matters.filter((m) => m.teamIds.includes(me.id));
  const [mId, setMId] = useState(matterId ?? matters[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>('Correspondence');
  const [docDate, setDocDate] = useState(DEMO_TODAY);
  const [text, setText] = useState('');
  const [privileged, setPriv] = useState(false);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(txt|md)$/i.test(f.name)) { alert('The browser demo accepts .txt files. Production supports PDF and DOCX via Textract.'); return; }
    setText(await f.text());
    if (!title) setTitle(f.name.replace(/\.\w+$/, ''));
  };

  const submit = () => {
    const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const doc: MatterDocument = {
      id: uid('d'), matterId: mId, title: title.trim(), docType, uploadedBy: me.id, uploadedAt: new Date().toISOString(),
      documentDate: docDate, pages: Math.max(1, Math.ceil(text.length / 3000)), sizeKb: Math.max(1, Math.round(text.length / 1024)),
      paragraphs, status: 'uploaded', privileged,
    };
    dispatch({ type: 'addDocument', doc });
    onClose(doc.id);
  };

  return (
    <Modal title="Upload document" onClose={() => onClose()} footer={
      <>
        <button className="btn btn-ghost" onClick={() => onClose()}>Cancel</button>
        <button className="btn btn-primary" disabled={!title.trim() || !text.trim() || !mId} onClick={submit}><Icon name="upload" size={15} /> Upload</button>
      </>
    }>
      <div className="notice info small"><Icon name="lock" size={16} /><div>Demo mode: text stays in this browser. In production the file uploads via a presigned URL to the tenant's encrypted S3 prefix. Use fictional content only.</div></div>
      {!matterId && <label className="field">Matter<select className="input" value={mId} onChange={(e) => setMId(e.target.value)}>{matters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.name}</option>)}</select></label>}
      <div className="form-grid">
        <label className="field">Title<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field">Document type<select className="input" value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="field">Document date<input className="input" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} /></label>
        <label className="field">File (.txt)<input className="input" type="file" accept=".txt,.md" onChange={(e) => onFile(e.target.files?.[0])} /></label>
      </div>
      <label className="field">Or paste text (blank line between paragraphs)
        <textarea className="input" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={'NOTICE OF DEPOSITION. Dated October 20, 2026.\n\nThe deposition of the corporate representative shall take place on November 18, 2026.\n\nObjections must be served within 10 days after service of this notice.'} />
      </label>
      <label className="row small"><input type="checkbox" checked={privileged} onChange={(e) => setPriv(e.target.checked)} /> Mark as privileged / attorney work product</label>
    </Modal>
  );
}

// ───────────────────────── Communications ─────────────────────────

export function CommLog({ matterId, items }: { matterId: string; items: Communication[] }) {
  const { dispatch, me, userById } = useStore();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ channel: 'Call' as Communication['channel'], direction: 'outbound' as Communication['direction'], subject: '', participants: '', summary: '', date: DEMO_TODAY });
  return (
    <div className="panel">
      <div className="panel-head"><h3>Client communication log</h3><button className="btn btn-primary btn-sm" disabled={!can(me, 'comm.write')} onClick={() => setOpen(true)}><Icon name="plus" size={14} /> Log communication</button></div>
      {items.length ? (
        <table className="data">
          <thead><tr><th>Date</th><th>Channel</th><th>Subject & summary</th><th>Participants</th><th>Logged by</th></tr></thead>
          <tbody>
            {[...items].sort((a, b) => b.date.localeCompare(a.date)).map((c) => (
              <tr key={c.id}>
                <td className="small" style={{ whiteSpace: 'nowrap' }}>{formatDate(c.date)}</td>
                <td><span className="badge b-navy">{c.channel}</span><div className="small muted">{c.direction}</div></td>
                <td><strong>{c.subject}</strong><div className="small muted">{c.summary}</div></td>
                <td className="small">{c.participants}</td>
                <td className="small">{userById(c.loggedBy)?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="empty">No communications logged yet.</div>}
      {open && (
        <Modal title="Log communication" onClose={() => setOpen(false)} footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!f.subject.trim()} onClick={() => {
              dispatch({ type: 'addCommunication', comm: { id: uid('c'), matterId, ...f, date: f.date + 'T12:00:00Z', loggedBy: me.id } });
              setOpen(false);
            }}>Save</button>
          </>
        }>
          <div className="form-grid">
            <label className="field">Date<input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="field">Channel<select className="input" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value as Communication['channel'] })}>{['Email', 'Call', 'Meeting', 'Letter', 'Portal'].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="field">Direction<select className="input" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value as Communication['direction'] })}><option value="outbound">Outbound</option><option value="inbound">Inbound</option><option value="internal">Internal</option></select></label>
            <label className="field">Participants<input className="input" value={f.participants} onChange={(e) => setF({ ...f, participants: e.target.value })} /></label>
          </div>
          <label className="field">Subject<input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></label>
          <label className="field">Summary<textarea className="input" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></label>
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────── Audit ─────────────────────────

export function AuditTable({ events, showMatter }: { events: AuditEvent[]; showMatter?: boolean }) {
  const { state, userById } = useStore();
  if (!events.length) return <div className="empty">No audit events.</div>;
  return (
    <table className="data">
      <thead><tr><th>When (UTC)</th><th>Actor</th><th>Action</th><th>Target</th>{showMatter && <th>Matter</th>}<th>Detail</th></tr></thead>
      <tbody>
        {events.map((e) => {
          const m = state.matters.find((x) => x.id === e.matterId);
          return (
            <tr key={e.id}>
              <td className="mono" style={{ whiteSpace: 'nowrap' }}>{e.at.replace('T', ' ').slice(0, 16)}</td>
              <td className="small">{userById(e.actorId)?.name ?? e.actorId}</td>
              <td><span className={`badge ${e.action.startsWith('ai.') ? 'b-bronze' : e.action.startsWith('deadline.') ? 'b-success' : 'b-navy'}`}>{e.action}</span></td>
              <td className="small">{e.target}</td>
              {showMatter && <td className="small">{m?.number ?? '—'}</td>}
              <td className="small muted">{e.detail}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ───────────────────────── Recommendations ─────────────────────────

export function RecommendationsPanel({ matters, limit }: { matters: Matter[]; limit?: number }) {
  const { state } = useStore();
  const recs = matters.flatMap((m) => recommendationsFor(state, m).map((r) => ({ ...r, m })));
  const rank = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => rank[a.severity] - rank[b.severity]);
  const shown = limit ? recs.slice(0, limit) : recs;
  return (
    <div className="panel ai-panel">
      <div className="panel-head">
        <h3 className="row"><Icon name="bolt" size={17} /> Workflow recommendations</h3>
        <span className="badge b-neutral">{recs.length}</span>
      </div>
      {shown.length ? shown.map((r) => (
        <div className="rec" key={r.id}>
          <span className={`sev ${r.severity}`} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}>{r.message}</div>
            {matters.length > 1 && <div className="small muted">{r.m.number} · {r.m.name}</div>}
          </div>
          {r.actionHref && <Link className="btn btn-ghost btn-sm" to={r.actionHref}>{r.actionLabel}</Link>}
        </div>
      )) : <div className="empty">No open recommendations. Matter records look complete.</div>}
    </div>
  );
}

// ───────────────────────── Matter creation ─────────────────────────

const PRACTICE: PracticeArea[] = ['Commercial Litigation', 'Corporate / M&A', 'Real Estate', 'Employment', 'Regulatory'];
const CHECKLIST: Record<PracticeArea, DocType[]> = {
  'Commercial Litigation': ['Engagement Letter', 'Complaint', 'Scheduling Order', 'Answer'],
  'Corporate / M&A': ['Engagement Letter', 'Term Sheet', 'Board Consent', 'Contract'],
  'Real Estate': ['Engagement Letter', 'Lease', 'Notice Letter'],
  Employment: ['Engagement Letter', 'Agency Charge', 'Correspondence'],
  Regulatory: ['Engagement Letter', 'Correspondence'],
};

export function MatterFormModal({ matter, onClose }: { matter?: Matter; onClose: (id?: string) => void }) {
  const { state, dispatch, me } = useStore();
  const editing = !!matter;
  const [f, setF] = useState({
    name: matter?.name ?? '',
    client: matter?.client ?? '',
    clientType: matter?.clientType ?? ('law_firm_client' as Matter['clientType']),
    practiceArea: matter?.practiceArea ?? ('Commercial Litigation' as PracticeArea),
    leadId: matter?.leadId ?? (me.role === 'legal_ops' ? 'u1' : me.id),
    teamIds: matter?.teamIds ?? [me.role === 'legal_ops' ? 'u1' : me.id],
    description: matter?.description ?? '',
    retentionPolicy: matter?.retentionPolicy ?? ('ret-10y' as Matter['retentionPolicy']),
    status: matter?.status ?? ('intake' as Matter['status']),
  });
  const staff = state.users.filter((u) => u.role !== 'viewer');
  const toggle = (id: string) => setF({ ...f, teamIds: f.teamIds.includes(id) ? f.teamIds.filter((x) => x !== id) : [...f.teamIds, id] });

  const save = () => {
    const teamIds = Array.from(new Set([f.leadId, ...f.teamIds]));
    if (editing) {
      const added = teamIds.filter((x) => !matter!.teamIds.includes(x)).map((x) => state.users.find((u) => u.id === x)?.name);
      const removed = matter!.teamIds.filter((x) => !teamIds.includes(x)).map((x) => state.users.find((u) => u.id === x)?.name);
      const detail = [
        f.leadId !== matter!.leadId && `Lead → ${state.users.find((u) => u.id === f.leadId)?.name}`,
        added.length && `Added: ${added.join(', ')}`,
        removed.length && `Removed: ${removed.join(', ')}`,
        f.status !== matter!.status && `Status → ${f.status}`,
      ].filter(Boolean).join('; ');
      dispatch({ type: 'updateMatter', matterId: matter!.id, patch: { ...f, teamIds }, auditAction: 'matter.assign', detail: detail || 'Details updated' });
      onClose(matter!.id);
    } else {
      const n = 164 + state.matters.length;
      const m: Matter = {
        id: uid('m'), number: `MW-2026-0${n}`, ...f, teamIds, openedOn: new Date().toISOString().slice(0, 10),
        billing: { billingCode: '', clientMatterRef: '', arrangement: f.clientType === 'internal_business_unit' ? 'Internal cost center' : 'Hourly', timeLoggedHours: 0 },
        requiredDocTypes: CHECKLIST[f.practiceArea],
      };
      dispatch({ type: 'createMatter', matter: m });
      onClose(m.id);
    }
  };

  return (
    <Modal title={editing ? 'Edit matter & assignment' : 'Create matter'} onClose={() => onClose()} footer={
      <>
        <button className="btn btn-ghost" onClick={() => onClose()}>Cancel</button>
        <button className="btn btn-primary" disabled={!f.name.trim() || !f.client.trim()} onClick={save}>{editing ? 'Save changes' : 'Create matter'}</button>
      </>
    }>
      <label className="field">Matter name<input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Ashgrove Supply — Distribution Agreement Dispute" /></label>
      <div className="form-grid">
        <label className="field">Client<input className="input" value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} /></label>
        <label className="field">Client type<select className="input" value={f.clientType} onChange={(e) => setF({ ...f, clientType: e.target.value as Matter['clientType'] })}><option value="law_firm_client">External client (law firm)</option><option value="internal_business_unit">Internal business unit</option></select></label>
        <label className="field">Practice area<select className="input" value={f.practiceArea} onChange={(e) => setF({ ...f, practiceArea: e.target.value as PracticeArea })}>{PRACTICE.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="field">Responsible lead<select className="input" value={f.leadId} onChange={(e) => setF({ ...f, leadId: e.target.value })}>{staff.filter((u) => u.role === 'partner' || u.role === 'associate').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="field">Retention policy<select className="input" value={f.retentionPolicy} onChange={(e) => setF({ ...f, retentionPolicy: e.target.value as Matter['retentionPolicy'] })}>{Object.entries(retentionPolicies).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <label className="field">Status<select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Matter['status'] })}><option value="intake">Intake</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="closed">Closed</option></select></label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="small" style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Matter team (only team members can open this matter's documents)</legend>
        <div className="chips">
          {staff.map((u) => (
            <label key={u.id} className="chip" style={{ background: f.teamIds.includes(u.id) || u.id === f.leadId ? 'var(--bronze-100)' : undefined }}>
              <input type="checkbox" checked={f.teamIds.includes(u.id) || u.id === f.leadId} disabled={u.id === f.leadId} onChange={() => toggle(u.id)} />
              {u.name} <span className="muted small">· {ROLE_LABEL[u.role]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">Description<textarea className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      {!editing && <div className="small muted">Document checklist for {f.practiceArea}: {CHECKLIST[f.practiceArea].join(', ')}.</div>}
    </Modal>
  );
}
