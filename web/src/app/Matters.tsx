import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDate } from '../ai/engine';
import { Icon, MatterStatusBadge } from '../components/ui';
import { can } from '../state/permissions';
import { useStore } from '../state/store';
import { MatterFormModal } from './components';
import { useVisible } from './hooks';

export default function Matters() {
  const { me, userById } = useStore();
  const v = useVisible();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('all');
  const creating = params.get('new') === '1' && can(me, 'matter.create');

  const list = v.matters.filter(
    (m) => (status === 'all' || m.status === status) && (m.name + m.client + m.number + m.practiceArea).toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="content">
      <div className="page-title">
        <div><h1>Matters</h1><div className="sub">Matters where you are on the team{me.role === 'legal_ops' || me.role === 'viewer' ? ' (firm-wide coordination view)' : ''}.</div></div>
        <button className="btn btn-primary" disabled={!can(me, 'matter.create')} onClick={() => setParams({ new: '1' })} title={can(me, 'matter.create') ? '' : 'Matter creation is limited to partners and legal operations'}>
          <Icon name="plus" size={16} /> New matter
        </button>
      </div>
      <div className="panel">
        <div className="panel-head">
          <input className="input" style={{ maxWidth: 320 }} placeholder="Filter by name, client, number…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <select className="input" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option><option value="intake">Intake</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="closed">Closed</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data">
            <thead><tr><th>Number</th><th>Matter</th><th>Client</th><th>Practice area</th><th>Team</th><th>Opened</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => nav(`/app/matters/${m.id}`)}>
                  <td className="mono">{m.number}</td>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td className="small">{m.client}<div className="muted">{m.clientType === 'internal_business_unit' ? 'Internal' : 'External client'}</div></td>
                  <td className="small">{m.practiceArea}</td>
                  <td><div className="row" style={{ gap: 3 }}>{m.teamIds.map((id) => <span key={id} className={`avatar sm${id === m.leadId ? '' : ' navy'}`} title={userById(id)?.name + (id === m.leadId ? ' (lead)' : '')}>{userById(id)?.initials}</span>)}</div></td>
                  <td className="small">{formatDate(m.openedOn)}</td>
                  <td><MatterStatusBadge s={m.status} /></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="empty">No matters match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {creating && <MatterFormModal onClose={(id) => { setParams({}); if (id) nav(`/app/matters/${id}`); }} />}
    </div>
  );
}
