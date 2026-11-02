# MatterWeave

AI-native legal matter coordination and document intelligence for law firms and corporate legal departments.

Website: https://matterweave.site · LinkedIn: https://www.linkedin.com/company/matterweave/

> **Demonstration build.** All matters, people, organizations and documents are fictional. AI output is assistance for administrative coordination and document review — not legal advice. MatterWeave never files documents and never treats an AI-identified date as a deadline until authorized legal staff verify it.

## What's here

| Path | Contents |
|---|---|
| `web/` | React + TypeScript (Vite) app: public website **and** the product dashboard with demo data |
| `web/src/ai/engine.ts` | Browser demo AI: source-cited summaries, entity extraction, candidate-deadline identification, grounded search (rule-based stand-in with the same output contract as the Bedrock pipeline) |
| `web/src/ai/recommendations.ts` | Workflow recommendations (missing documents, overdue tasks, unverified/upcoming dates, incomplete records) |
| `web/src/data/demo.ts` | Fictional matters, documents, tasks, communications |
| `infra/db/schema.sql` | PostgreSQL schema with row-level security, ethical walls, verification trigger, append-only audit |
| `infra/lambda/` | Lambda handlers: presigned upload, document processing (Textract + Bedrock), grounded search, deadline verification, retention sweeper, HubSpot sync |
| `infra/iam/` | Least-privilege role and bucket policies |
| `docs/architecture.md` | AWS architecture, tenant isolation, encryption, audit, retention |
| `docs/hubspot-integration.md` | CRM plan and data-separation rules |

## Run the demo

```bash
npm --prefix web install
```

```bash
npm --prefix web run dev
```

Open http://localhost:5173 for the public site and http://localhost:5173/app for the workspace.

### Suggested walkthrough

1. **Workspace → Document library → Case Management and Scheduling Order → Analyze document.** See the summary with `¶` citations (click one to jump to the passage), extracted parties/dates/references, and candidate dates.
2. **Matter → Deadlines.** Candidates are dashed and unverified. *Review & verify* requires a note and an attestation; you can correct the date (the correction is logged).
3. **Create task** from a verified deadline (due date defaults to 7 days before).
4. **AI search** — ask "When does fact discovery close?" (grounded, cited) or "What is the weather in Paris?" (declines: no supporting source).
5. **Switch user** in the sidebar: Sofia Lindqvist sees only the Northvale matter (ethical wall); Tom Becker (read-only) cannot see documents or verify dates.
6. **Audit history** records every upload, AI run, search, verification and assignment.

Demo state persists in your browser's local storage; use **Reset demo** in the sidebar to start over. The demo runs on a fixed date (Oct 18, 2026) so overdue and upcoming logic is stable.

## Production AI path

`infra/lambda/src/shared/bedrock.ts` calls Claude on Amazon Bedrock (`anthropic.claude-opus-5-5`, override with `BEDROCK_MODEL_ID`) using structured outputs, then re-validates that every citation references a real paragraph. Candidate dates are inserted with `status = 'candidate'`; only the `verify-deadline` endpoint (guarded by a database trigger restricted to partner/attorney/paralegal roles) can make them `verified`.

## Launch readiness (glow-up)

- Website (`web/`): problem section with three sourced statistics, what-we-solve, comparison table, AI section, founder cards, roadmap and FAQ, with scroll-reveal motion that respects reduced motion. Sections live in `web/src/site/Glow.tsx` (generated markup); styles and motion in `web/public/glow.css` and `web/public/glow.js`.
- New routes: `/privacy`, `/terms` (review drafts). Footer credits the founders.
- Hosting: `web/vercel.json` now rewrites deep links to `index.html` (the app uses browser routing) and adds security headers; `web/public/_redirects` and `_headers` do the same on Netlify/Cloudflare Pages.
- Ship assets in `web/public/`: favicon, OG image, icons, manifest, sitemap (with lastmod), founders JSON-LD in `web/index.html`.
- Fixed horizontal overflow on phones (demo form, matters, tasks board).

### Content to confirm before launch
- Contact email `hello@matterweave.site` is a placeholder — create the forward or replace it.
- Statistics (ABA Profile of Legal Malpractice Claims 2020–2023 via Lawyers Mutual NC; Clio Legal Trends 2024) — re-check figures and links.
- Founder bios describe roles only; replace with confirmed biographies.
- Privacy notice and terms need operator details and governing law.
