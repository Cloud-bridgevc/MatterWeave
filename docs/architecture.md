# MatterWeave — AWS Architecture

## Overview

```
                       ┌──────────────── Marketing boundary (separate AWS account) ───────────────┐
 Public site (S3+CF) ──┤ API GW /demo-requests ─► Lambda crm-sync ─► HubSpot (private app token)  │
                       └──────────────────────────────────────────────────────────────────────────┘

                       ┌──────────────────────── Product boundary (per region) ────────────────────────┐
 App (S3+CloudFront) ──► API Gateway (JWT authorizer: Cognito / customer SAML)                          │
                       │   ├─ presign-upload ──► S3 mw-documents (SSE-KMS, per-tenant prefix + CMK)     │
                       │   ├─ search ─────────► RDS PostgreSQL (RLS) ─► Bedrock (grounded answer)       │
                       │   ├─ verify-deadline ► RDS PostgreSQL (trigger-enforced verification)          │
                       │   └─ matters/tasks/comms CRUD ► RDS PostgreSQL                                 │
                       │                                                                                │
                       │ S3 ObjectCreated ─► SQS mw-document-ingest (DLQ) ─► Lambda process-document    │
                       │        ├─ Textract (PDF/scans, async via SNS)                                  │
                       │        ├─ Bedrock (Claude via Mantle client, structured outputs)               │
                       │        └─ RDS: passages, analyses, *candidate* deadlines, ai_runs, audit       │
                       │ EventBridge (daily) ─► Lambda retention-sweeper ─► disposition review tasks    │
                       │ CloudTrail (incl. S3 data events) ─► log-archive account (Object Lock)         │
                       └────────────────────────────────────────────────────────────────────────────────┘
```

| Concern | Service | Notes |
|---|---|---|
| Protected document storage | Amazon S3 | `tenants/<tenant>/matters/<matter>/docs/<doc>/v<n>`; versioning on; SSE-KMS with per-tenant CMK; Block Public Access; TLS-only bucket policy; optional Object Lock for regulated tenants |
| Matter records & tasks | Amazon RDS for PostgreSQL (or Aurora) | Encrypted storage and snapshots; IAM/Secrets Manager credentials with rotation; private subnets only; schema in `infra/db/schema.sql` |
| Document analysis & summaries | Amazon Bedrock | Claude (`anthropic.claude-opus-5-5`) through `AnthropicBedrockMantle`; schema-constrained output re-validated in `infra/lambda/src/shared/bedrock.ts`; in-region inference; Bedrock does not use customer prompts to train models |
| Asynchronous processing | AWS Lambda + SQS | Partial-batch failure reporting, DLQ with alarm, idempotent writes (dedupe on matter/date/source) |
| Identity | Amazon Cognito + SAML/OIDC federation | `custom:tenant_id` and `custom:mw_user_id` claims; MFA enforced at IdP; SCIM deprovisioning |

## Tenant isolation

1. **Identity** — tenant and user come only from the verified JWT (`shared/auth.ts`). Request input never sets `tenant_id`.
2. **Database** — every table has `tenant_id` with `FORCE ROW LEVEL SECURITY`; each transaction sets `app.tenant_id`/`app.user_id` (`shared/db.ts`). Restrictive `matter_wall` policies add ethical walls (matter-team membership).
3. **Storage** — per-tenant prefixes and per-tenant KMS keys. Workers verify object metadata against the key prefix and the `documents` row before processing.
4. **Dedicated option** — high-sensitivity tenants get a dedicated AWS account (same IaC, separate RDS, bucket and keys) under AWS Organizations with SCPs.

## Least privilege

- One IAM role per Lambda (`infra/iam/lambda-roles.json`). Only `process-document` and `search` may call Bedrock; only `process-document` may decrypt documents, and only via S3.
- `crm-sync` has no database credentials and no S3/KMS permissions; it runs in a separate account.
- Database roles: `mw_app` (no DELETE), `mw_worker` (processing tables only), `mw_audit_writer`; `audit_events` is INSERT-only for every application role.
- Bucket policy denies non-TLS access, unencrypted puts and deletes by anyone other than the retention disposition role (`infra/iam/document-bucket-policy.json`).

## Encryption

- In transit: TLS 1.2+ (CloudFront, API Gateway, RDS `rejectUnauthorized`), presigned URLs valid 5 minutes for a single object.
- At rest: S3 SSE-KMS with bucket keys (per-tenant CMK), RDS KMS encryption, encrypted SQS queues and CloudWatch log groups, Secrets Manager for DB and HubSpot credentials.
- Dedicated plan: customer-managed keys in the customer's account via KMS grants; revoking the grant renders documents unreadable.

## Audit logging

- Application audit trail (`audit_events`): uploads, AI runs (model + prompt version + token counts), searches (question text), deadline verifications/rejections (with AI date vs corrected date), assignments, billing edits, retention actions.
- AWS CloudTrail management + S3 data events to a log-archive account with Object Lock.
- Logs exclude document text; Lambda logs record IDs and error classes only.

## Configurable document retention

- `retention_policies` per tenant (e.g., 7 or 10 years after close; `requires_approval`).
- `legal_hold` on matters suspends disposition; S3 lifecycle rules exclude held prefixes and Object Lock legal holds are applied to their objects.
- `retention-sweeper` opens disposition-review tasks; nothing is hard-deleted without an approval, and the deletion itself is audited.

## AI safeguards enforced in code

| Safeguard | Where |
|---|---|
| Citations must reference real paragraphs; invalid ones are dropped | `bedrock.ts` → `validateCitations` |
| Dates stored only as `candidate` | `process-document.ts` insert; `deadlines.status` default |
| Only partner/attorney/paralegal can verify; note + reviewer required | DB trigger `enforce_deadline_verifier` + `verification_complete` check; `verify-deadline.ts` attestation |
| Search answers only from authorized, retrieved passages; explicit "not supported" | `search.ts` (RLS-filtered retrieval) + `answerFromPassages` |
| No filing integrations | There is no outbound integration to courts, e-filing or agencies |
| Refusals / truncated output handled, never stored as partial results | `analyzeDocument` returns `ok: false`; document marked `failed` |
