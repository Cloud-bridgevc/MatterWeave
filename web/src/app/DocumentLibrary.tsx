import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate } from '../ai/engine';
import { Icon } from '../components/ui';
import { can } from '../state/permissions';
import { useStore } from '../state/store';
import type { MatterDocument } from '../types';
import { UploadModal } from './components';
import { useVisible } from './hooks';

export function DocTable({ docs, showMatter }: { docs: MatterDocument[]; showMatter?: boolean }) {
  const { state, userById } = useStore();
  const nav = useNavigate();
  if (!docs.length) return <div className="empty">No documents.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data">
        <thead><tr><th>Document</th>{showMatter && <th>Matter</th>}<th>Type</th><th>Dated</th><th>Uploaded</th><th>AI status</th></tr></thead>
        <tbody>
          {docs.map((d) => {
            const m = state.matters.find((x) => x.id === d.matterId);
            return (
              <tr key={d.id} className="clickable" onClick={() => nav(`/app/documents/${d.id}`)}>
                <td><div className="row" style={{ gap: 8 }}><Icon name="file" size={16} /><strong>{d.title}</strong>{d.privileged && <span className="badge b-danger">Privileged</span>}</div><div className="small muted">{d.pages} pp · {d.sizeKb} KB · SSE-KMS</div></td>
                {showMatter && <td className="small">{m?.number}<div className="muted">{m?.client}</div></td>}
                <td className="small">{d.docType}</td>
                <td className="small">{formatDate(d.documentDate)}</td>
                <td className="small">{formatDate(d.uploadedAt)}<div className="muted">{userById(d.uploadedBy)?.name}</div></td>
                <td>{d.status === 'analyzed' ? <span className="badge b-success">Analyzed</span> : d.status === 'processing' ? <span className="badge b-navy">Processing…</span> : <span className="badge b-neutral">Not analyzed</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DocumentLibrary() {
  const { me } = useStore();
  const v = useVisible();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [up, setUp] = useState(false);
  const types = Array.from(new Set(v.documents.map((d) => d.docType)));
  const list = v.documents
    .filter((d) => (type === 'all' || d.docType === type) && (d.title + d.paragraphs.join(' ')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return (
    <div className="content">
      <div className="page-title">
        <div><h1>Document library</h1><div className="sub">Documents across matters you are authorized to access. Stored encrypted per tenant.</div></div>
        <div className="row">
          <Link to="/app/search" className="btn btn-ghost"><Icon name="spark" size={16} /> Ask a question</Link>
          <button className="btn btn-primary" disabled={!can(me, 'document.upload')} onClick={() => setUp(true)}><Icon name="upload" size={16} /> Upload</button>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <input className="input" style={{ maxWidth: 340 }} placeholder="Filter by title or text…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" style={{ maxWidth: 200 }} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        {me.role === 'viewer' ? <div className="empty">Read-only billing access does not include document content.</div> : <DocTable docs={list} showMatter />}
      </div>
      {up && <UploadModal onClose={(id) => { setUp(false); if (id) nav(`/app/documents/${id}`); }} />}
    </div>
  );
}
