# HubSpot CRM Plan

HubSpot is MatterWeave's **sales and customer-success system**. It holds information about prospects and customer *organizations* — never matter content.

## Data separation (non-negotiable)

| Allowed in HubSpot | Never in HubSpot |
|---|---|
| Prospect contact details submitted on the website | Matter names, numbers, clients of our customers, parties |
| Organization segment, team size, practice areas of interest | Documents, extracted text, summaries, search queries |
| Demo scheduling, deal stages, contract value | Deadlines, tasks, communications logs |
| Account-level product usage (seat count, plan, active users — aggregated) | Any per-matter or per-user activity detail |

Enforcement:
- `crm-sync` runs in a **separate AWS account** with no route, role or credential to the product database or document bucket.
- Usage metrics sent to HubSpot come from a nightly aggregate job that emits only `{tenant_id → seats, active_users_30d, plan}`; the job's SQL is reviewed and allow-listed.
- The demo form tells visitors not to submit confidential information.

## Objects and custom properties

| Object | Custom properties |
|---|---|
| Contact | `mw_lead_source`, `mw_marketing_consent`, `mw_persona` (partner, GC, legal ops, docketing, IT/security) |
| Company | `mw_segment` (law_firm / corporate_legal / other), `mw_legal_team_size`, `mw_tenant_id` (set at onboarding), `mw_plan`, `mw_isolation_model` |
| Deal | `mw_practice_areas`, `mw_preferred_demo_time`, `mw_request_notes`, `mw_security_review_status` |
| Ticket | Onboarding and support (no matter data — support staff use in-product, audited support access instead) |

## Pipelines

**Law Firm Sales** and **Corporate Legal Sales** (separate pipelines; different stakeholders and procurement):

1. Demo requested → 2. Demo scheduled → 3. Demo completed → 4. Security review (questionnaire, DPA, architecture pack) → 5. Pilot (demo data or sandbox tenant) → 6. Proposal → 7. Closed won / Closed lost

**Customer Onboarding** (ticket pipeline, starts on Closed won):

1. Tenant provisioned (isolation model, region, KMS) → 2. SSO/SCIM connected → 3. Retention policies and matter checklists configured → 4. Pilot matters migrated by the customer → 5. Training complete → 6. Live (handoff to Customer Success)

## Demo scheduling

- Website form → `crm-sync` → contact upsert + company + deal in stage *Demo requested*.
- Workflow sends the HubSpot Meetings link for the owning rep (round-robin by segment and time zone preference).
- Meeting booked → deal moves to *Demo scheduled*; reminder sequences paused on booking.

## Workflows

- Route by `mw_segment`: law firm → Law Firm AE team; corporate legal → Corporate AE team.
- Security-review stage creates a task for the security team and attaches the NDA-gated security pack.
- Closed won → creates onboarding ticket, sets `mw_tenant_id` when provisioning completes (provisioning system calls HubSpot; HubSpot never calls the product).
- Marketing emails only to contacts with `mw_marketing_consent = true`.

## Credentials and compliance

- HubSpot private-app token with minimal scopes (`crm.objects.contacts.write`, `crm.objects.companies.write`, `crm.objects.deals.write`) in Secrets Manager; rotated quarterly.
- Data subject requests handled in HubSpot's GDPR tools; product data subject requests handled separately by the customer as controller.
