import { Link } from 'react-router-dom';
import { addDays, formatDate } from '../ai/engine';
import { DeadlineBadge, Icon, MatterStatusBadge } from '../components/ui';
import { DEMO_TODAY } from '../data/demo';
import { can } from '../state/permissions';
import { useStore } from '../state/store';
import { RecommendationsPanel } from './components';
import { useVisible } from './hooks';

export default function Dashboard() {
  const { me, userById } = useStore();
  const v = useVisible();
  const horizon = addDays(DEMO_TODAY, 30);
  const upcoming = v.deadlines.filter((d) => d.status !== 'rejected' && d.date >= DEMO_TODAY && d.date <= addDays(DEMO_TODAY, 60)).sort((a, b) => a.date.localeCompare(b.date));
  const candidates = v.deadlines.filter((d) => d.status === 'candidate');
  const overdue = v.tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < DEMO_TODAY);
  const mine = v.tasks.filter((t) => t.status !== 'done' && (t.assigneeId === me.id || t.reviewerId === me.id));

  return (
    <div className="content">
      <div className="page-title">
        <div>
          <h1>Good morning, {me.name.split(' ')[0]}</h1>
          <div className="sub">{formatDate(DEMO_TODAY, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {v.matters.length} matters visible to you</div>
        </div>
        <div className="row">
          <Link to="/app/search" className="btn btn-ghost"><Icon name="spark" size={16} /> Ask the documents</Link>
          {can(me, 'matter.create') && <Link to="/app/matters?new=1" className="btn btn-primary"><Icon name="plus" size={16} /> New matter</Link>}
        </div>
      </div>

      <div className="kpis">
        <div className="panel kpi"><div className="label">Active matters</div><div className="value">{v.matters.filter((m) => m.status !== 'closed').length}</div><div className="hint">{v.matters.filter((m) => m.status === 'intake').length} in intake</div></div>
        <div className="panel kpi"><div className="label">Verified dates · next 30 days</div><div className="value">{v.deadlines.filter((d) => d.status === 'verified' && d.date >= DEMO_TODAY && d.date <= horizon).length}</div><div className="hint">Docketed and approved</div></div>
        <div className="panel kpi" style={{ borderTop: '3px solid var(--bronze)' }}><div className="label">AI candidates awaiting review</div><div className="value">{candidates.length}</div><div className="hint">Not yet deadlines</div></div>
        <div className="panel kpi"><div className="label">Overdue tasks</div><div className="value" style={{ color: overdue.length ? 'var(--danger)' : undefined }}>{overdue.length}</div><div className="hint">{mine.length} open tasks assigned to or awaiting you</div></div>
      </div>

      <div className="two-col">
        <div className="stack" style={{ gap: 22 }}>
          <div className="panel">
            <div className="panel-head"><h3>Matter overview</h3><Link to="/app/matters" className="small">All matters →</Link></div>
            <table className="data">
              <thead><tr><th>Matter</th><th>Lead</th><th>Status</th><th>Next date</th></tr></thead>
              <tbody>
                {v.matters.map((m) => {
                  const next = v.deadlines.filter((d) => d.matterId === m.id && d.status !== 'rejected' && d.date >= DEMO_TODAY).sort((a, b) => a.date.localeCompare(b.date))[0];
                  return (
                    <tr key={m.id}>
                      <td><Link to={`/app/matters/${m.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>{m.name}</Link><div className="small muted">{m.number} · {m.practiceArea}</div></td>
                      <td className="small">{userById(m.leadId)?.name}</td>
                      <td><MatterStatusBadge s={m.status} /></td>
                      <td className="small">{next ? <>{formatDate(next.date)}<div>{next.status === 'candidate' ? <span className="badge b-warn">unverified</span> : <span className="muted">{next.title}</span>}</div></> : <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
                {!v.matters.length && <tr><td colSpan={4} className="empty">You are not on any matter teams.</td></tr>}
              </tbody>
            </table>
          </div>
          <RecommendationsPanel matters={v.matters} limit={8} />
        </div>

        <div className="stack" style={{ gap: 22 }}>
          <div className="panel">
            <div className="panel-head"><h3>Upcoming dates · 60 days</h3><Link to="/app/calendar" className="small">Calendar →</Link></div>
            <div className="panel-body stack" style={{ gap: 10 }}>
              {upcoming.length ? upcoming.map((d) => {
                const m = v.matters.find((x) => x.id === d.matterId);
                return (
                  <Link key={d.id} to={`/app/matters/${d.matterId}/deadlines`} className={`dl-card ${d.status}`} style={{ textDecoration: 'none' }}>
                    <div className="row"><strong style={{ fontSize: 14 }}>{d.title}</strong><span className="spacer" /><DeadlineBadge d={d} /></div>
                    <div className="row"><span className="dl-date" style={{ fontSize: 16 }}>{formatDate(d.date)}</span><span className="small muted">{m?.number}</span></div>
                  </Link>
                );
              }) : <div className="empty">No dates in the next 60 days. Analyze documents to identify candidates.</div>}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Get started with the demo</h3></div>
            <div className="panel-body stack small">
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="badge b-bronze">1</span><span>Open the <Link to="/app/documents/d2">Case Management and Scheduling Order</Link> and click <strong>Analyze document</strong>.</span></div>
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="badge b-bronze">2</span><span>Check the source-cited summary, then review candidate dates on the <Link to="/app/matters/m1/deadlines">Deadlines</Link> tab.</span></div>
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="badge b-bronze">3</span><span>Verify a date (as Priya Raman or an attorney) and <strong>Create task</strong> from it.</span></div>
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="badge b-bronze">4</span><span>Switch to <em>Tom Becker (read-only)</em> in the sidebar to see permissions applied.</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
