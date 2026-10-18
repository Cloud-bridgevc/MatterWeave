// Document analysis and grounded Q&A on Amazon Bedrock.
//
// Design rules (mirrors the product's legal safeguards):
//  • Documents are sent as paragraph-numbered text; every summary point,
//    entity and candidate date MUST cite paragraph numbers that exist.
//  • Output is schema-constrained (structured outputs) and then re-validated
//    here — citations to non-existent paragraphs are dropped, not trusted.
//  • Dates are returned as *candidates* only. The model is told not to apply
//    court rules, holidays or service methods; those are for human reviewers.
//  • Answers come only from supplied passages; "insufficient support" is a
//    first-class outcome.
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-opus-5-5';
export const PROMPT_VERSION = 'analyze-v3';

const client = new AnthropicBedrockMantle({ awsRegion: process.env.AWS_REGION! });

const Cite = z.array(z.number().int().nonnegative()).min(1);

export const AnalysisSchema = z.object({
  summary: z.array(z.object({ text: z.string(), paragraphs: Cite })).max(8),
  entities: z.array(
    z.object({
      kind: z.enum(['party', 'court', 'person', 'date', 'amount', 'reference']),
      value: z.string(),
      paragraphs: Cite,
    }),
  ),
  key_passages: z.array(z.object({ label: z.string(), paragraph: z.number().int().nonnegative() })).max(5),
  candidate_dates: z.array(
    z.object({
      title: z.string(),
      date: z.string().describe('ISO 8601 YYYY-MM-DD'),
      basis: z.enum(['explicit', 'computed']),
      computation: z.string().nullable().describe('For computed dates: the period, anchor date and arithmetic used'),
      confidence: z.enum(['high', 'medium', 'low']),
      paragraph: z.number().int().nonnegative(),
    }),
  ),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

const ANALYZE_SYSTEM = `You assist legal professionals with administrative document review. You do not give legal advice.

You will receive one document as numbered paragraphs ([P0], [P1], ...). Produce:
- summary: up to 8 concise, neutral points. Every point must cite the paragraph numbers it is drawn from and must not state anything those paragraphs do not support.
- entities: parties, courts/agencies, judicial officers, dates, monetary amounts and references (case numbers, sections, exhibits), each with its paragraph numbers.
- key_passages: up to 5 paragraphs most important for a reviewer, with a short label.
- candidate_dates: dates that may be deadlines, obligations, or scheduled events.
  * basis "explicit" when the date appears in the text; "computed" when derived from a stated period and an anchor date that also appears in the document.
  * For computed dates, give the arithmetic in plain calendar days in "computation". Do NOT apply court rules, holidays, weekends, service methods or contract notice mechanics — reviewers do that.
  * If a period depends on an event whose date is not in the document, omit it.
  * Do not list caption, filing or signature dates as obligations.
These are candidates for human verification, not determinations.`;

export async function analyzeDocument(title: string, docType: string, paragraphs: string[]) {
  const numbered = paragraphs.map((p, i) => `[P${i}] ${p}`).join('\n\n');
  const response = await client.messages.parse({
    model: MODEL_ID,
    max_tokens: 16000,
    output_config: { effort: 'high', format: zodOutputFormat(AnalysisSchema) },
    system: [{ type: 'text', text: ANALYZE_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Document title: ${title}\nDocument type: ${docType}\n\n${numbered}` }],
  });

  if (response.stop_reason === 'refusal') {
    return { ok: false as const, reason: 'refusal', usage: response.usage };
  }
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
    return { ok: false as const, reason: 'incomplete_output', usage: response.usage };
  }
  return { ok: true as const, analysis: validateCitations(response.parsed_output, paragraphs.length), usage: response.usage };
}

/** Drop anything that cites a paragraph that does not exist; never "repair" it. */
function validateCitations(a: Analysis, n: number): Analysis {
  const ok = (p: number) => p >= 0 && p < n;
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  return {
    summary: a.summary.filter((s) => s.paragraphs.every(ok)),
    entities: a.entities.filter((e) => e.paragraphs.every(ok)),
    key_passages: a.key_passages.filter((k) => ok(k.paragraph)),
    candidate_dates: a.candidate_dates.filter((d) => ok(d.paragraph) && isoDate.test(d.date) && !Number.isNaN(Date.parse(d.date))),
  };
}

// ───────────────────────── Grounded Q&A ─────────────────────────

export const AnswerSchema = z.object({
  supported: z.boolean().describe('false when the passages do not contain enough information to answer'),
  answer: z.array(z.object({ text: z.string(), passage_ids: z.array(z.string()).min(1) })),
});

const ANSWER_SYSTEM = `You answer questions for legal staff using ONLY the passages provided. You do not give legal advice and you do not use outside knowledge.
Each answer sentence must cite the passage ids it relies on. If the passages do not support an answer, set supported=false and return an empty answer list.`;

export async function answerFromPassages(question: string, passages: { id: string; docTitle: string; text: string }[]) {
  const context = passages.map((p) => `<passage id="${p.id}" document="${p.docTitle.replace(/"/g, "'")}">\n${p.text}\n</passage>`).join('\n');
  const response = await client.messages.parse({
    model: MODEL_ID,
    max_tokens: 4000,
    output_config: { effort: 'medium', format: zodOutputFormat(AnswerSchema) },
    system: ANSWER_SYSTEM,
    messages: [{ role: 'user', content: `${context}\n\nQuestion: ${question}` }],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) return { supported: false, answer: [] };
  const valid = new Set(passages.map((p) => p.id));
  const out = response.parsed_output;
  const answer = out.answer.filter((a) => a.passage_ids.every((id) => valid.has(id)));
  return { supported: out.supported && answer.length > 0, answer };
}
