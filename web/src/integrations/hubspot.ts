// Demo-request submission.
//
// Production path: the browser POSTs to our own API (API Gateway → Lambda
// `crm-sync`), which validates the payload and writes to HubSpot via a private
// app token held in Secrets Manager. The browser never talks to HubSpot with a
// credential, and NOTHING from matter workspaces flows through this path — it
// only carries prospect-supplied marketing/sales fields.
//
// Demo path (no VITE_API_BASE configured): the submission is kept in this
// browser only and nothing leaves the machine.

export interface DemoRequest {
  firstname: string;
  lastname: string;
  email: string;
  company: string;
  jobtitle: string;
  organization_type: 'law_firm' | 'corporate_legal' | 'other';
  team_size: string;
  practice_areas: string[];
  preferred_time: string;
  message: string;
  consent_marketing: boolean;
}

export type SubmitResult = { mode: 'api' | 'demo'; ok: boolean; error?: string };

export async function submitDemoRequest(req: DemoRequest): Promise<SubmitResult> {
  const base = import.meta.env.VITE_API_BASE as string | undefined;
  if (base) {
    try {
      const res = await fetch(`${base}/demo-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      return { mode: 'api', ok: res.ok, error: res.ok ? undefined : `Request failed (${res.status})` };
    } catch (e) {
      return { mode: 'api', ok: false, error: (e as Error).message };
    }
  }
  try {
    const key = 'matterweave.demo.requests';
    const prior = JSON.parse(localStorage.getItem(key) ?? '[]');
    localStorage.setItem(key, JSON.stringify([...prior, { ...req, submittedAt: new Date().toISOString() }]));
  } catch {
    /* storage unavailable — still report success for the demo */
  }
  return { mode: 'demo', ok: true };
}

/** How form fields map onto HubSpot objects (see docs/hubspot-integration.md). */
export const HUBSPOT_MAPPING = [
  ['firstname, lastname, email, jobtitle', 'Contact (standard properties)'],
  ['company, organization_type, team_size', 'Company (name, mw_segment, mw_legal_team_size)'],
  ['practice_areas, preferred_time, message', 'Deal in "Demo Pipeline" → stage "Demo requested"'],
  ['consent_marketing', 'Contact subscription preferences (legal basis recorded)'],
] as const;
