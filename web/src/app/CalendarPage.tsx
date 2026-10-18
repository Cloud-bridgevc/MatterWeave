import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../ai/engine';
import { Icon } from '../components/ui';
import { DEMO_TODAY } from '../data/demo';
import { DeadlineCard } from './components';
import { useVisible } from './hooks';

export default function CalendarPage() {
  const v = useVisible();
  const [cursor, setCursor] = useState(DEMO_TODAY.slice(0, 7)); // YYYY-MM
  const [showCandidates, setShowCandidates] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [matter, setMatter] = useState('all');

  const [y, mo] = cursor.split('-').map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    setCursor(d.toISOString().slice(0, 7));
  };

  const inScope = <T extends { matterId: string }>(x: T) => matter === 'all' || x.matterId === matter;
  const dls = v.deadlines.filter(inScope).filter((d) => d.status === 'verified' || (showCandidates && d.status === 'candidate'));
  const tasks = showTasks ? v.tasks.filter(inScope).filter((t) => t.dueDate && t.status !== 'done') : [];
  const pending = v.deadlines.filter(inScope).filter((d) => d.status === 'candidate').sort((a, b) => a.date.localeCompare(b.date));
  const num = (id: string) => v.matters.find((m) => m.id === id)?.number.slice(-4);

  return (
    <div className="content">
      <div className="page-title">
        <div><h1>Deadline calendar</h1><div className="sub">Verified deadlines are solid. AI candidates are dashed and are <strong>not</strong> docketed until verified.</div></div>
        <div className="row wrap">
          <select className="input" style={{ width: 'auto' }} value={matter} onChange={(e) => setMatter(e.target.value)}>
            <option value="all">All my matters</option>
            {v.matters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.client}</option>)}
          </select>
          <label className="row small"><input type="checkbox" checked={showCandidates} onChange={(e) => setShowCandidates(e.target.checked)} /> Show candidates</label>
          <label className="row small"><input type="checkbox" checked={showTasks} onChange={(e) => setShowTasks(e.target.checked)} /> Show task due dates</label>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
            <h3 style={{ minWidth: 170, textAlign: 'center' }}>{formatDate(cursor + '-01', { month: 'long', year: 'numeric' })}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => shift(1)} aria-label="Next month">›</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(DEMO_TODAY.slice(0, 7))}>Today</button>
          </div>
          <div className="row small wrap cal-legend">
            <span className="ev verified">Verified</span>
            <span className="ev candidate">AI candidate</span>
            <span className="ev task">Task due</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div className="cal" style={{ minWidth: 640 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="dow">{d}</div>)}
            {days.map((d) => (
              <div key={d} className={`day${d.slice(0, 7) !== cursor ? ' out' : ''}${d === DEMO_TODAY ? ' today' : ''}`}>
                <span className="num">{Number(d.slice(8))}</span>
                {dls.filter((x) => x.date === d).map((x) => (
                  <Link key={x.id} to={`/app/matters/${x.matterId}/deadlines`} className={`ev ${x.status}`} title={`${x.title} — ${x.status === 'candidate' ? 'UNVERIFIED AI candidate' : 'Verified'}`}>
                    {x.status === 'candidate' && '? '}{num(x.matterId)} · {x.title}
                  </Link>
                ))}
                {tasks.filter((t) => t.dueDate === d).map((t) => (
                  <Link key={t.id} to={`/app/matters/${t.matterId}/tasks`} className="ev task" title={t.title}>✓ {t.title}</Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3 className="row"><Icon name="spark" size={16} /> Verification queue <span className="badge b-warn">{pending.length}</span></h3></div>
        <div className="panel-body stack">
          {pending.length ? pending.map((d) => <DeadlineCard key={d.id} d={d} showMatter />) : <div className="empty">No unverified candidates. Every date on the calendar has been reviewed.</div>}
        </div>
      </div>
    </div>
  );
}
