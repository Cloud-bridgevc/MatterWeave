import { useState } from 'react';
import { Icon } from '../components/ui';
import { can } from '../state/permissions';
import { useStore } from '../state/store';
import { AuditTable } from './components';
import { useVisible } from './hooks';

export default function AuditPage() {
  const { me } = useStore();
  const v = useVisible();
  const [kind, setKind] = useState('all');
  if (!can(me, 'audit.read')) {
    return <div className="content"><div className="panel empty"><Icon name="lock" size={28} /><h2 style={{ marginTop: 10 }}>Audit history is restricted</h2><p>Audit access is limited to partners, attorneys and legal operations.</p></div></div>;
  }
  const events = v.audit.filter((e) => kind === 'all' || e.action.startsWith(kind));
  const exportCsv = () => {
    const rows = [['at', 'actor', 'matter', 'action', 'target', 'detail'], ...events.map((e) => [e.at, e.actorId, e.matterId ?? '', e.action, e.target, e.detail ?? ''])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'matterweave-audit-demo.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="content">
      <div className="page-title">
        <div><h1>Audit history</h1><div className="sub">Append-only record of uploads, AI runs, searches, verifications, assignments and changes. Times in UTC.</div></div>
        <div className="row">
          <select className="input" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All events</option><option value="ai.">AI activity</option><option value="deadline.">Deadline decisions</option><option value="document.">Documents</option><option value="matter.">Matters & assignment</option><option value="task.">Tasks</option>
          </select>
          <button className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>
      <div className="panel" style={{ overflowX: 'auto' }}><AuditTable events={events} showMatter /></div>
    </div>
  );
}
