import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { answerQuestion, type GroundedAnswer } from '../ai/engine';
import { AiDisclaimer, Icon } from '../components/ui';
import { useStore } from '../state/store';
import { Cite } from './components';
import { useVisible } from './hooks';

const EXAMPLES = [
  'When does fact discovery close?',
  'What is the cure period for a breach?',
  'When does the exclusivity period end?',
  'How much notice is needed to exercise the renewal option?',
  'When is the position statement due?',
  'What damages does Harrow seek?',
  'What law governs the MSA?',
];

function highlight(text: string, q: string): ReactNode {
  const terms = q.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
  if (!terms.length) return text;
  const re = new RegExp(`\\b(${terms.map((t) => t.replace(/s$/, '')).join('|')})\\w*`, 'gi');
  return text.replace(re, '\u0000$&\u0000').split('\u0000').map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p));
}

export default function SearchAssistant() {
  const { dispatch } = useStore();
  const v = useVisible();
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState('all');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [result, setResult] = useState<GroundedAnswer | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = (query: string) => {
    if (!query.trim()) return;
    setBusy(true);
    lastAsked.current = query;
    setParams({ q: query }, { replace: true });
    const docs = v.documents.filter((d) => scope === 'all' || d.matterId === scope);
    setTimeout(() => {
      setResult(answerQuestion(query, docs));
      dispatch({ type: 'logSearch', matterId: scope === 'all' ? undefined : scope, query });
      setBusy(false);
    }, 450);
  };

  // Run queries arriving via the URL (e.g. from the top-bar search box).
  const urlQ = params.get('q') ?? '';
  const lastAsked = useRef('');
  useEffect(() => {
    if (urlQ && urlQ !== lastAsked.current) { setQ(urlQ); ask(urlQ); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); ask(q); };
  const docTitle = (id: string) => v.documents.find((d) => d.id === id)?.title ?? id;

  return (
    <div className="content">
      <div className="page-title">
        <div><h1>Document search assistant</h1><div className="sub">Answers are grounded only in documents you are authorized to access ({v.documents.length} documents across {v.matters.length} matters).</div></div>
      </div>

      <form className="panel panel-body stack" onSubmit={onSubmit}>
        <div className="row wrap">
          <input className="input" style={{ flex: 1, minWidth: 260, fontSize: 16, padding: '12px 14px' }} placeholder="Ask a question about your matter documents…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" style={{ width: 'auto' }} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All my matters</option>
            {v.matters.map((m) => <option key={m.id} value={m.id}>{m.number} · {m.client}</option>)}
          </select>
          <button className="btn btn-bronze" disabled={busy || !v.documents.length}>{busy ? <span className="spinner" /> : <Icon name="spark" size={16} />} Ask</button>
        </div>
        <div className="chips">{EXAMPLES.map((e) => <button type="button" key={e} className="chip" onClick={() => { setQ(e); ask(e); }}>{e}</button>)}</div>
        {!v.documents.length && <div className="notice">Your role has no document access, so the assistant has nothing to search.</div>}
      </form>

      {result && (
        <div className="two-col">
          <div className="panel ai-panel">
            <div className="panel-head"><span className="ai-tag"><Icon name="spark" size={13} /> Answer</span>{result.grounded ? <span className="badge b-success">Grounded in {new Set(result.answer.flatMap((a) => a.sources.map((s) => s.docId))).size} document(s)</span> : <span className="badge b-warn">No supporting source found</span>}</div>
            <div className="panel-body stack">
              <div className="small muted">“{result.query}”</div>
              {result.grounded ? (
                <div className="answer">
                  {result.answer.map((a, i) => (
                    <div key={i}>
                      {a.text}
                      {a.sources.map((s, j) => <Cite key={j} s={s} />)}
                      <div className="small muted">{a.sources.map((s) => docTitle(s.docId)).join(', ')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="notice info"><Icon name="search" size={16} /><div>{result.note}</div></div>
              )}
              {result.grounded && <div className="small muted">{result.note}</div>}
              <AiDisclaimer compact />
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Retrieved passages</h3><span className="small muted">Top {result.hits.length} by relevance</span></div>
            <div className="panel-body stack">
              {result.hits.length ? result.hits.map((h, i) => (
                <div className="hit" key={i}>
                  <div className="row small" style={{ marginBottom: 6 }}><strong>{h.docTitle}</strong><Cite s={h.source} /><span className="spacer" /><span className="muted mono">{h.score.toFixed(2)}</span></div>
                  <div style={{ fontFamily: 'var(--serif)' }}>{highlight(h.text, result.query)}</div>
                </div>
              )) : <div className="empty">No passages matched.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
