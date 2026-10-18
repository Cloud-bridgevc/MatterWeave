-- MatterWeave — PostgreSQL schema (Amazon RDS / Aurora PostgreSQL 15+)
--
-- Tenant isolation: every tenant-owned table carries tenant_id and is protected
-- by ROW LEVEL SECURITY. The application connects as role `mw_app` and sets
--   SET LOCAL app.tenant_id = '<uuid>'; SET LOCAL app.user_id = '<uuid>';
-- at the start of each transaction (from the verified JWT, never from request
-- input). Policies additionally enforce matter-team membership (ethical walls).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector, for passage embeddings

-- ───────────────────────────── Roles ─────────────────────────────
DO $$ BEGIN
  CREATE ROLE mw_app NOLOGIN;        -- API Lambdas
  CREATE ROLE mw_worker NOLOGIN;     -- async processing Lambdas
  CREATE ROLE mw_audit_writer NOLOGIN;
  CREATE ROLE mw_readonly NOLOGIN;   -- reporting
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION current_tenant() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION current_app_user() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

-- ───────────────────────────── Tenancy & identity ─────────────────────────────
CREATE TABLE tenants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  segment         text NOT NULL CHECK (segment IN ('law_firm', 'corporate_legal')),
  kms_key_arn     text NOT NULL,                 -- per-tenant CMK for S3 objects
  s3_prefix       text NOT NULL UNIQUE,          -- tenants/<id>/
  isolation_model text NOT NULL DEFAULT 'pooled' CHECK (isolation_model IN ('pooled', 'dedicated_account')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE user_role AS ENUM ('partner', 'associate', 'paralegal', 'legal_ops', 'viewer', 'tenant_admin');

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  idp_subject text NOT NULL,                      -- Cognito / SAML subject
  email       citext,
  full_name   text NOT NULL,
  role        user_role NOT NULL,
  active      boolean NOT NULL DEFAULT true,      -- SCIM deprovisioning flips this
  UNIQUE (tenant_id, idp_subject)
);

-- ───────────────────────────── Retention ─────────────────────────────
CREATE TABLE retention_policies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id),
  name              text NOT NULL,
  retain_years      int  CHECK (retain_years > 0),           -- after matter close
  requires_approval boolean NOT NULL DEFAULT true,
  is_legal_hold     boolean NOT NULL DEFAULT false
);

-- ───────────────────────────── Matters ─────────────────────────────
CREATE TYPE matter_status AS ENUM ('intake', 'active', 'on_hold', 'closed');

CREATE TABLE matters (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id),
  number             text NOT NULL,
  name               text NOT NULL,
  client_name        text NOT NULL,
  client_type        text NOT NULL CHECK (client_type IN ('law_firm_client', 'internal_business_unit')),
  practice_area      text NOT NULL,
  status             matter_status NOT NULL DEFAULT 'intake',
  lead_user_id       uuid NOT NULL REFERENCES users(id),
  description        text,
  retention_policy_id uuid REFERENCES retention_policies(id),
  legal_hold         boolean NOT NULL DEFAULT false,
  opened_on          date NOT NULL DEFAULT current_date,
  closed_on          date,
  -- Time & billing reference fields (system of record remains the billing system)
  billing_code       text,
  client_matter_ref  text,
  fee_arrangement    text,
  budget_cents       bigint,
  ledes_task_code    text,
  time_logged_hours  numeric(10,2) DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, number)
);

CREATE TABLE matter_members (
  tenant_id  uuid NOT NULL REFERENCES tenants(id),
  matter_id  uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id),
  added_by   uuid REFERENCES users(id),
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (matter_id, user_id)
);

CREATE TABLE matter_required_doc_types (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  doc_type  text NOT NULL,
  PRIMARY KEY (matter_id, doc_type)
);

-- ───────────────────────────── Documents ─────────────────────────────
CREATE TABLE documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  matter_id      uuid NOT NULL REFERENCES matters(id),
  title          text NOT NULL,
  doc_type       text NOT NULL,
  document_date  date,
  s3_key         text NOT NULL,                  -- tenants/<tenant>/matters/<matter>/docs/<id>/v<n>
  s3_version_id  text,
  sha256         text NOT NULL,
  size_bytes     bigint NOT NULL,
  page_count     int,
  privileged     boolean NOT NULL DEFAULT false,
  status         text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'failed')),
  uploaded_by    uuid NOT NULL REFERENCES users(id),
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz                      -- soft delete; hard delete only via retention job
);

-- Paragraph-level text used for citations and retrieval.
CREATE TABLE document_passages (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ordinal     int  NOT NULL,                    -- zero-based paragraph index
  page        int,
  text        text NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  embedding   vector(1024),                     -- pgvector; Titan Text Embeddings v2
  UNIQUE (document_id, ordinal)
);
CREATE INDEX ON document_passages USING gin (tsv);
CREATE INDEX ON document_passages USING hnsw (embedding vector_cosine_ops);

-- ───────────────────────────── AI outputs ─────────────────────────────
CREATE TABLE ai_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  document_id     uuid REFERENCES documents(id),
  matter_id       uuid NOT NULL REFERENCES matters(id),
  kind            text NOT NULL CHECK (kind IN ('analyze', 'summarize_matter', 'search')),
  model_id        text NOT NULL,
  prompt_version  text NOT NULL,
  input_tokens    int,
  output_tokens   int,
  status          text NOT NULL DEFAULT 'queued',
  requested_by    uuid NOT NULL REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE TABLE document_analyses (
  document_id  uuid PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  ai_run_id    uuid NOT NULL REFERENCES ai_runs(id),
  summary      jsonb NOT NULL,   -- [{text, sources:[{paragraph}]}]
  entities     jsonb NOT NULL,   -- [{kind, value, paragraph}]
  key_passages jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────── Deadlines (human verification) ─────────────────────────────
CREATE TYPE deadline_status AS ENUM ('candidate', 'verified', 'rejected');

CREATE TABLE deadlines (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id),
  matter_id          uuid NOT NULL REFERENCES matters(id),
  title              text NOT NULL,
  due_date           date NOT NULL,
  basis              text NOT NULL CHECK (basis IN ('explicit', 'computed', 'manual')),
  computation        text,
  confidence         text CHECK (confidence IN ('high', 'medium', 'low')),
  source_document_id uuid REFERENCES documents(id),
  source_ordinal     int,
  status             deadline_status NOT NULL DEFAULT 'candidate',
  created_by_ai_run  uuid REFERENCES ai_runs(id),
  created_by_user    uuid REFERENCES users(id),
  verified_by        uuid REFERENCES users(id),
  verified_at        timestamptz,
  verification_note  text,
  original_ai_date   date,                         -- preserved if reviewer corrects the date
  -- A deadline can only be verified/rejected by a named person with a note.
  CONSTRAINT verification_complete CHECK (
    status = 'candidate' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL AND length(coalesce(verification_note, '')) > 0)
  ),
  CONSTRAINT ai_candidates_start_unverified CHECK (created_by_ai_run IS NULL OR basis <> 'manual')
);

-- Only authorized roles may transition a deadline out of 'candidate'.
CREATE OR REPLACE FUNCTION enforce_deadline_verifier() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r user_role;
BEGIN
  IF NEW.status <> OLD.status AND NEW.status IN ('verified', 'rejected') THEN
    SELECT role INTO r FROM users WHERE id = current_app_user() AND tenant_id = NEW.tenant_id;
    IF r IS NULL OR r NOT IN ('partner', 'associate', 'paralegal') THEN
      RAISE EXCEPTION 'role % may not verify deadlines', r USING ERRCODE = '42501';
    END IF;
    NEW.verified_by := current_app_user();
    NEW.verified_at := now();
    IF NEW.due_date <> OLD.due_date AND OLD.original_ai_date IS NULL THEN NEW.original_ai_date := OLD.due_date; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER deadlines_verify BEFORE UPDATE ON deadlines FOR EACH ROW EXECUTE FUNCTION enforce_deadline_verifier();

-- ───────────────────────────── Tasks & communications ─────────────────────────────
CREATE TABLE tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id),
  matter_id           uuid NOT NULL REFERENCES matters(id),
  title               text NOT NULL,
  assignee_id         uuid REFERENCES users(id),
  reviewer_id         uuid REFERENCES users(id),
  due_date            date,
  status              text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  linked_deadline_id  uuid REFERENCES deadlines(id),
  linked_document_id  uuid REFERENCES documents(id),
  approved_by         uuid REFERENCES users(id),
  created_by          uuid NOT NULL REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE communications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  matter_id    uuid NOT NULL REFERENCES matters(id),
  occurred_at  timestamptz NOT NULL,
  channel      text NOT NULL,
  direction    text NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  subject      text NOT NULL,
  participants text,
  summary      text,
  logged_by    uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────────── Audit (append-only) ─────────────────────────────
CREATE TABLE audit_events (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid REFERENCES users(id),
  actor_type  text NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'ai')),
  matter_id   uuid REFERENCES matters(id),
  action      text NOT NULL,             -- e.g. document.upload, ai.analyze_document, deadline.verify
  target_type text NOT NULL,
  target_id   text NOT NULL,
  detail      jsonb,
  request_id  text,
  source_ip   inet
);
CREATE INDEX ON audit_events (tenant_id, occurred_at DESC);
CREATE INDEX ON audit_events (tenant_id, matter_id, occurred_at DESC);
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM PUBLIC, mw_app, mw_worker;
GRANT INSERT ON audit_events TO mw_audit_writer, mw_app, mw_worker;

-- ───────────────────────────── Row-level security ─────────────────────────────
-- Helper: is the current user on this matter's team (or a firm-wide coordination role)?
CREATE OR REPLACE FUNCTION can_access_matter(m uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM matter_members mm WHERE mm.matter_id = m AND mm.user_id = current_app_user())
      OR EXISTS (SELECT 1 FROM users u WHERE u.id = current_app_user() AND u.role IN ('legal_ops', 'tenant_admin'))
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','retention_policies','matters','matter_members','matter_required_doc_types','documents',
                           'document_passages','ai_runs','document_analyses','deadlines','tasks','communications','audit_events']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_tenant()) WITH CHECK (tenant_id = current_tenant())', t);
  END LOOP;
END $$;

-- Ethical walls on matter-scoped content (restrictive = ANDed with tenant policy).
CREATE POLICY matter_wall ON matters        AS RESTRICTIVE USING (can_access_matter(id));
CREATE POLICY matter_wall ON documents      AS RESTRICTIVE USING (can_access_matter(matter_id));
CREATE POLICY matter_wall ON deadlines      AS RESTRICTIVE USING (can_access_matter(matter_id));
CREATE POLICY matter_wall ON tasks          AS RESTRICTIVE USING (can_access_matter(matter_id));
CREATE POLICY matter_wall ON communications AS RESTRICTIVE USING (can_access_matter(matter_id));
CREATE POLICY matter_wall ON document_passages AS RESTRICTIVE
  USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND can_access_matter(d.matter_id)));

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO mw_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM mw_app;   -- deletion only via retention job role
GRANT SELECT, INSERT, UPDATE ON documents, document_passages, ai_runs, document_analyses, deadlines TO mw_worker;
