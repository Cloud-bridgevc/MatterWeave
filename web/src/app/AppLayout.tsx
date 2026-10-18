import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Icon, Logo } from '../components/ui';
import { DEMO_TODAY } from '../data/demo';
import { formatDate } from '../ai/engine';
import { ROLE_LABEL } from '../state/permissions';
import { useStore } from '../state/store';
import { useVisible } from './hooks';

export default function AppLayout() {
  const { state, dispatch, me } = useStore();
  const v = useVisible();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const pending = v.deadlines.filter((d) => d.status === 'candidate').length;
  const openTasks = v.tasks.filter((t) => t.status !== 'done').length;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav(`/app/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div>
      <div className="demo-ribbon">
        <strong>DEMONSTRATION ENVIRONMENT</strong> — all matters, people and documents are fictional. AI output is illustrative and is not legal advice. Demo date: {formatDate(DEMO_TODAY)}.
      </div>
      <div className="app">
        <aside className="sidebar">
          <div className="brand"><Link to="/app" style={{ textDecoration: 'none' }}><Logo /></Link></div>
          <nav>
            <div className="nav-label">Workspace</div>
            <NavLink end to="/app" className="nav"><Icon name="grid" size={17} />Overview</NavLink>
            <NavLink to="/app/matters" className="nav"><Icon name="folder" size={17} />Matters</NavLink>
            <NavLink to="/app/documents" className="nav"><Icon name="file" size={17} />Document library</NavLink>
            <NavLink to="/app/search" className="nav"><Icon name="spark" size={17} />AI search</NavLink>
            <div className="nav-label">Coordination</div>
            <NavLink to="/app/calendar" className="nav"><Icon name="calendar" size={17} />Deadline calendar{pending > 0 && <span className="count" title="Unverified AI candidates">{pending}</span>}</NavLink>
            <NavLink to="/app/tasks" className="nav"><Icon name="check" size={17} />Tasks & review<span className="count" style={{ background: 'var(--navy-600)' }}>{openTasks}</span></NavLink>
            <NavLink to="/app/audit" className="nav"><Icon name="history" size={17} />Audit history</NavLink>
          </nav>
          <div className="foot">
            <div className="user-switch stack" style={{ gap: 6 }}>
              <label htmlFor="who" style={{ color: '#6f819b', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Demo: view as</label>
              <select id="who" value={state.currentUserId} onChange={(e) => dispatch({ type: 'switchUser', userId: e.target.value })}>
                {state.users.map((u) => <option key={u.id} value={u.id}>{u.name} — {ROLE_LABEL[u.role]}</option>)}
              </select>
            </div>
            <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
              <Link to="/" style={{ color: '#9aa7ba' }}>← Public site</Link>
              <button className="btn btn-sm" style={{ background: 'transparent', color: '#9aa7ba', padding: 0 }} onClick={() => { if (confirm('Reset all demo data to its original state?')) dispatch({ type: 'reset' }); }}>Reset demo</button>
            </div>
          </div>
        </aside>
        <div className="main">
          <div className="topbar">
            <form className="search" onSubmit={onSearch}>
              <Icon name="search" size={16} />
              <input className="input" placeholder="Ask about your matter documents… e.g. “When does fact discovery close?”" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
            <span className="spacer" />
            <div className="row">
              <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{me.name}</div>
                <div className="muted small">{me.title}</div>
              </div>
              <span className="avatar">{me.initials}</span>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
