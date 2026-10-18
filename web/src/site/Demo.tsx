import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import { HUBSPOT_MAPPING, submitDemoRequest, type DemoRequest } from '../integrations/hubspot';

const AREAS = ['Litigation', 'Corporate / M&A', 'Real Estate', 'Employment', 'Regulatory', 'IP'];

const empty: DemoRequest = {
  firstname: '', lastname: '', email: '', company: '', jobtitle: '', organization_type: 'law_firm',
  team_size: '11–50', practice_areas: [], preferred_time: 'Morning (ET)', message: '', consent_marketing: false,
};

export default function Demo() {
  const [f, setF] = useState<DemoRequest>(empty);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [mode, setMode] = useState<'api' | 'demo'>('demo');
  const [err, setErr] = useState('');
  const set = <K extends keyof DemoRequest>(k: K, v: DemoRequest[K]) => setF((x) => ({ ...x, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setState('sending');
    const r = await submitDemoRequest(f);
    setMode(r.mode);
    if (r.ok) setState('done');
    else { setErr(r.error ?? 'Something went wrong'); setState('error'); }
  };

  return (
    <>
      <section className="page-hero" style={{ paddingBottom: 40 }}>
        <div className="container">
          <span className="eyebrow">Request a demo</span>
          <h1>See MatterWeave with a legal workflow specialist.</h1>
          <p>Tell us a little about your team. We will tailor a 30-minute walkthrough using demonstration matters — no confidential information required.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container two-col" style={{ gap: 40 }}>
          <div className="card">
            {state === 'done' ? (
              <div className="stack" style={{ textAlign: 'center', padding: '28px 8px' }}>
                <div className="icon-tile" style={{ margin: '0 auto' }}><Icon name="check" /></div>
                <h2>Thank you, {f.firstname || 'there'}.</h2>
                <p className="muted">
                  {mode === 'demo'
                    ? 'This is a demonstration site: your request was saved only in this browser and was not sent anywhere.'
                    : 'Your request has been received. A specialist will contact you within one business day.'}
                </p>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <Link to="/app" className="btn btn-primary">Explore the demo workspace</Link>
                  <button className="btn btn-ghost" onClick={() => { setF(empty); setState('idle'); }}>Submit another</button>
                </div>
              </div>
            ) : (
              <form className="stack" onSubmit={onSubmit} style={{ gap: 16 }}>
                <div className="form-grid">
                  <label className="field">First name<input className="input" required value={f.firstname} onChange={(e) => set('firstname', e.target.value)} /></label>
                  <label className="field">Last name<input className="input" required value={f.lastname} onChange={(e) => set('lastname', e.target.value)} /></label>
                  <label className="field">Work email<input className="input" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
                  <label className="field">Job title<input className="input" value={f.jobtitle} onChange={(e) => set('jobtitle', e.target.value)} /></label>
                  <label className="field">Organization<input className="input" required value={f.company} onChange={(e) => set('company', e.target.value)} /></label>
                  <label className="field">Organization type
                    <select className="input" value={f.organization_type} onChange={(e) => set('organization_type', e.target.value as DemoRequest['organization_type'])}>
                      <option value="law_firm">Law firm</option>
                      <option value="corporate_legal">Corporate legal department</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="field">Legal team size
                    <select className="input" value={f.team_size} onChange={(e) => set('team_size', e.target.value)}>
                      {['1–10', '11–50', '51–200', '201–1,000', '1,000+'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="field">Preferred demo time
                    <select className="input" value={f.preferred_time} onChange={(e) => set('preferred_time', e.target.value)}>
                      {['Morning (ET)', 'Afternoon (ET)', 'Morning (PT)', 'Afternoon (PT)', 'Morning (GMT)'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
                <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="small" style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>Practice areas of interest</legend>
                  <div className="chips">
                    {AREAS.map((a) => (
                      <label key={a} className="chip" style={{ background: f.practice_areas.includes(a) ? 'var(--bronze-100)' : undefined }}>
                        <input type="checkbox" checked={f.practice_areas.includes(a)} onChange={(e) => set('practice_areas', e.target.checked ? [...f.practice_areas, a] : f.practice_areas.filter((x) => x !== a))} />
                        {a}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="field">What would you like to see?
                  <textarea className="input" value={f.message} onChange={(e) => set('message', e.target.value)} placeholder="e.g. Scheduling order intake and docketing review for a 40-lawyer litigation group" />
                </label>
                <div className="notice info small">
                  <Icon name="shield" size={16} />
                  <div>Please do not include confidential or client information. This form feeds our sales CRM, which is kept entirely separate from customer matter data.</div>
                </div>
                <label className="row small" style={{ alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={f.consent_marketing} onChange={(e) => set('consent_marketing', e.target.checked)} style={{ marginTop: 4 }} />
                  <span>I'd like to receive occasional product updates from MatterWeave. (Optional — you can unsubscribe at any time.)</span>
                </label>
                {state === 'error' && <div className="notice">{err}</div>}
                <button className="btn btn-bronze" disabled={state === 'sending'} type="submit">
                  {state === 'sending' ? <><span className="spinner" /> Sending…</> : 'Request my demo'}
                </button>
              </form>
            )}
          </div>
          <div className="stack" style={{ gap: 20 }}>
            <div className="card">
              <h3>What to expect</h3>
              <ul className="check-list">
                <li>A walkthrough tailored to law firm or in-house workflows</li>
                <li>Document intelligence on fictional pleadings, orders and agreements</li>
                <li>The candidate-to-verified deadline workflow</li>
                <li>Security architecture and data separation Q&amp;A</li>
              </ul>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 17 }}>Where your request goes</h3>
              <p className="small">Demo requests create records in our sales CRM (HubSpot). Matter workspaces live in a separate, tenant-isolated system and are never synced to CRM.</p>
              <table className="data small">
                <tbody>{HUBSPOT_MAPPING.map(([a, b]) => <tr key={a}><td className="mono">{a}</td><td>{b}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
