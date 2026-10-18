import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { analyzeDocument, extractDeadlineCandidates, formatDate } from '../ai/engine';
import { AiDisclaimer, Icon } from '../components/ui';
import { can, canSeeMatter } from '../state/permissions';
import { useStore } from '../state/store';
import type { ExtractedEntity } from '../types';
import { Cite, CreateTaskModal, DeadlineCard } from './components';

const KIND_LABEL: Record<ExtractedEntity['kind'], string> = {
  party: 'Parties', court: 'Court / agency', person: 'Judicial officer', date: 'Dates', amount: 'Amounts', reference: 'References',
};

export default function DocumentView() {
  const { docId } = useParams();
  const [params, setParams] = useSearchParams();
  const { state, dispatch, me, userById } = useStore();
  const [running, setRunning] = useState(false);
  const [tasking, setTasking] = useState(false);
  const refs = useRef<Record<number, HTMLDivElement | null>>({});
  const doc = state.documents.find((d) => d.id === docId);
  const matter = doc && state.matters.find((m) => m.id === doc.matterId);
  const analysis = doc ? state.analyses[doc.id] : undefined;
  const hl = params.get('p') !== null ? Number(params.get('p')) : null;

  useEffect(() => {
    if (hl !== null) refs.current[hl]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [hl, docId]);

  if (!doc || !matter) return <Navigate to="/app/documents" replace />;
  if (!canSeeMatter(me, matter) || me.role === 'viewer') {
    return <div className="content"><div className="panel empty"><Icon name="lock" size={28} /><h2 style={{ marginTop: 10 }}>Access restricted</h2><p>You are not authorized to view this document.</p></div></div>;
  }

  const candidates = state.deadlines.filter((d) => d.source?.docId === doc.id);

  const run = () => {
    setRunning(true);
    dispatch({ type: 'setDocStatus', docId: doc.id, status: 'processing' });
    // Simulates the async Lambda → Bedrock job; production polls job status.
    setTimeout(() => {
      dispatch({ type: 'storeAnalysis', analysis: analyzeDocument(doc), candidates: extractDeadlineCandidates(doc) });
      setRunning(false);
    }, 1100);
  };

  const focus = (p: number) => setParams({ p: String(p) }, { replace: true });
  const grouped = analysis
    ? (Object.keys(KIND_LABEL) as ExtractedEntity['kind'][]).map((k) => [k, analysis.entities.filter((e) => e.kind === k)] as const).filter(([, l]) => l.length)
    : [];

  return (
    <div className="content">
      <div className="page-title">
        <div>
          <div className="small muted"><Link to={`/app/matters/${matter.id}/documents`}>{matter.number} · {matter.name}</Link></div>
          <h1>{doc.title}</h1>
          <div className="sub row wrap" style={{ marginTop: 6 }}>
            <span className="badge b-navy">{doc.docType}</span>
            <span>Dated {formatDate(doc.documentDate)}</span>·<span>Uploaded by {userById(doc.uploadedBy)?.name}</span>·<span>{doc.paragraphs.length} paragraphs</span>
            {doc.privileged && <span className="badge b-danger">Privileged</span>}
            <span className="badge b-bronze">Fictional demo document</span>
          </div>
        </div>
        <div className="row">
          <button className="btn btn-ghost" disabled={!can(me, 'task.write')} onClick={() => setTasking(true)}><Icon name="plus" size={16} /> Task</button>
          <button className="btn btn-bronze" disabled={running || !can(me, 'ai.run')} onClick={run}>
            {running ? <><span className="spinner" /> Analyzing…</> : <><Icon name="spark" size={16} /> {analysis ? 'Re-run analysis' : 'Analyze document'}</>}
          </button>
        </div>
      </div>

      <div className="two-col" style={{ gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)' }}>
        <div className="panel doc-viewer" style={{ position: 'sticky', top: 80 }}>
          <div className="panel-head" style={{ fontFamily: 'var(--sans)' }}><h3 style={{ fontFamily: 'var(--sans)', fontSize: 14 }}>Source document</h3><span className="small muted">Click a citation to jump to its paragraph</span></div>
          <div style={{ padding: '10px 0', maxHeight: 'calc(100vh - 220px)', overflow: 'auto' }}>
            {doc.paragraphs.map((p, i) => (
              <div key={i} ref={(el) => (refs.current[i] = el)} className={`para${hl === i ? ' hl' : ''}`} onClick={() => focus(i)}>
                <span className="pn">¶{i + 1}</span><div>{p}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          {!analysis && !running && (
            <div className="panel panel-body empty">
              <Icon name="spark" size={26} />
              <h3 style={{ marginTop: 10 }}>Not analyzed yet</h3>
              <p className="small">Run analysis to generate a source-cited summary, extract parties, dates and references, and identify candidate deadlines for review.</p>
              <button className="btn btn-bronze" disabled={!can(me, 'ai.run')} onClick={run}><Icon name="spark" size={16} /> Analyze document</button>
              {!can(me, 'ai.run') && <p className="small" style={{ marginTop: 8 }}>Your role cannot run AI analysis.</p>}
            </div>
          )}
          {running && <div className="panel panel-body row"><span className="spinner dark" /> Queued → extracting text → analyzing with model → storing candidates for review…</div>}

          {analysis && (
            <>
              <AiDisclaimer compact />
              <div className="panel ai-panel">
                <div className="panel-head"><span className="ai-tag"><Icon name="spark" size={13} /> AI summary</span><span className="small muted">{formatDate(analysis.generatedAt)}</span></div>
                <div className="panel-body">
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                    {analysis.summary.map((s, i) => <li key={i}>{s.text}{s.sources.map((src, j) => <Cite key={j} s={src} />)}</li>)}
                  </ul>
                  <div className="small muted" style={{ marginTop: 12 }}>Model: {analysis.model}</div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head"><span className="ai-tag"><Icon name="file" size={13} /> Extracted information</span><span className="small muted">{analysis.entities.length} items · click to view source</span></div>
                <div className="panel-body stack">
                  {grouped.map(([k, list]) => (
                    <div className="entity-group" key={k}>
                      <h4>{KIND_LABEL[k]}</h4>
                      <div className="chips">{list.map((e) => <span key={e.value} className="chip" onClick={() => focus(e.source.paragraph)}>{e.value}<span className="muted small">¶{e.source.paragraph + 1}</span></span>)}</div>
                    </div>
                  ))}
                  <div className="entity-group">
                    <h4>Key passages</h4>
                    {analysis.keyPassages.map((k) => <div key={k.source.paragraph} className="small" style={{ cursor: 'pointer' }} onClick={() => focus(k.source.paragraph)}>{k.label} <Cite s={k.source} /></div>)}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <span className="ai-tag"><Icon name="calendar" size={13} /> Candidate dates & deadlines</span>
                  <Link className="small" to={`/app/matters/${matter.id}/deadlines`}>All matter deadlines →</Link>
                </div>
                <div className="panel-body stack">
                  {candidates.length ? candidates.sort((a, b) => a.date.localeCompare(b.date)).map((d) => <DeadlineCard key={d.id} d={d} />) : <div className="empty">No obligation-linked dates identified in this document.</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {tasking && <CreateTaskModal matterId={matter.id} doc={doc} onClose={() => setTasking(false)} />}
    </div>
  );
}
