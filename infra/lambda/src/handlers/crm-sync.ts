// POST /demo-requests (public, WAF rate-limited, no auth)
// Writes prospect data to HubSpot. This function has NO database credentials
// and NO access to the documents bucket — it lives in a separate "marketing"
// boundary so matter data cannot flow into the CRM by construction.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { z } from 'zod';
import { getSecretJson } from '../shared/secrets.js';

const Body = z.object({
  firstname: z.string().min(1).max(80),
  lastname: z.string().min(1).max(80),
  email: z.string().email().max(200),
  company: z.string().min(1).max(200),
  jobtitle: z.string().max(120).optional().default(''),
  organization_type: z.enum(['law_firm', 'corporate_legal', 'other']),
  team_size: z.string().max(20),
  practice_areas: z.array(z.string().max(40)).max(10),
  preferred_time: z.string().max(40),
  message: z.string().max(2000).optional().default(''),
  consent_marketing: z.boolean(),
});

const HS = 'https://api.hubapi.com';

async function hs(token: string, path: string, init: RequestInit) {
  const res = await fetch(HS + path, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers ?? {}) } });
  if (!res.ok && res.status !== 409) throw new Error(`HubSpot ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  const parsed = Body.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) return { statusCode: 400, body: JSON.stringify({ error: 'invalid_request' }) };
  const f = parsed.data;
  const { token } = await getSecretJson<{ token: string }>(process.env.HUBSPOT_SECRET_ARN!);

  // Upsert contact by email.
  const contact = await hs(token, '/crm/v3/objects/contacts/batch/upsert', {
    method: 'POST',
    body: JSON.stringify({ inputs: [{ idProperty: 'email', id: f.email, properties: { email: f.email, firstname: f.firstname, lastname: f.lastname, jobtitle: f.jobtitle, mw_lead_source: 'website_demo_request', mw_marketing_consent: String(f.consent_marketing) } }] }),
  });
  const contactId = contact?.results?.[0]?.id;

  // Create company + deal in the Demo pipeline, associated to the contact.
  const company = await hs(token, '/crm/v3/objects/companies', {
    method: 'POST',
    body: JSON.stringify({ properties: { name: f.company, mw_segment: f.organization_type, mw_legal_team_size: f.team_size } }),
  });
  await hs(token, '/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        dealname: `${f.company} — Demo`,
        pipeline: process.env.HUBSPOT_DEMO_PIPELINE_ID,
        dealstage: process.env.HUBSPOT_STAGE_DEMO_REQUESTED,
        mw_practice_areas: f.practice_areas.join(';'),
        mw_preferred_demo_time: f.preferred_time,
        mw_request_notes: f.message,
      },
      associations: [
        { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] },
        { to: { id: company?.id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }] },
      ].filter((a) => a.to.id),
    }),
  });

  return { statusCode: 202, body: JSON.stringify({ ok: true }) };
};
