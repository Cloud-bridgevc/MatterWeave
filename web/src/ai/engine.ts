// ─────────────────────────────────────────────────────────────────────────────
// Demo AI provider.
//
// In production these operations run asynchronously in AWS Lambda against
// Amazon Bedrock (see infra/lambda/). For the browser demo we use a
// deterministic, rule-based implementation with the SAME output contract:
//   • every summary point and entity carries a SourceRef back to a paragraph
//   • every date-derived deadline is a *candidate* until a human verifies it
//   • search answers are composed only from retrieved passages; if nothing
//     relevant is retrieved, the assistant says so instead of guessing.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Deadline,
  DocumentAnalysis,
  ExtractedEntity,
  MatterDocument,
  SourceRef,
  SummaryPoint,
} from '../types';

export const DEMO_MODEL_LABEL = 'demo-extractor-v1 (rule-based stand-in for Amazon Bedrock)';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DATE_RE = new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{1,2}),\\s+(\\d{4})\\b`, 'g');

const NUMBER_WORDS: Record<string, number> = {
  ten: 10, fourteen: 14, thirty: 30, sixty: 60, ninety: 90, 'one hundred twenty': 120, 'one hundred eighty': 180,
};

export function toIso(month: string, day: string, year: string): string {
  const m = MONTHS.indexOf(month) + 1;
  return `${year}-${String(m).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}

function datesIn(text: string): { raw: string; iso: string; index: number }[] {
  const out: { raw: string; iso: string; index: number }[] = [];
  for (const m of text.matchAll(DATE_RE)) {
    out.push({ raw: m[0], iso: toIso(m[1], m[2], m[3]), index: m.index ?? 0 });
  }
  return out;
}

function sentences(p: string): string[] {
  return p.split(/(?<=[.;])\s+(?=[A-Z0-9"(])/).map((s) => s.trim()).filter(Boolean);
}

// ───────────────────────────── Entity extraction ─────────────────────────────

const PARTY_RE = /((?:(?:[A-Z][\w&'\-]*\.?,?|&)\s){1,6}(?:Inc\.|LLC|L\.P\.|LLP|P\.C\.))/g;
const AMOUNT_RE = /\$\d{1,3}(?:,\d{3})+(?:\.\d{2})?/g;
const REF_RE = /\b(?:Case No\.|Charge No\.)\s*[A-Z0-9\-]+|\bSection\s+\d+(?:\.\d+)?|\bSchedule\s+[A-Z]\b|\bExhibit\s+[A-Z]\b/g;
const COURT_RE = /\b(?:SUPERIOR COURT OF [A-Z ]+COUNTY|[A-Z][A-Za-z]+ CIVIL RIGHTS COMMISSION|WESTBROOK CIVIL RIGHTS COMMISSION)/g;
const JUDGE_RE = /\bHonorable\s+([A-Z][a-z]+(?:\s+[A-Z]\.)?\s+[A-Z][a-z]+)/g;

function cleanParty(s: string) {
  // Drop anything before a sentence break, then leading ALL-CAPS headings and role words.
  const tail = s.split(/(?<=[a-z\]A-Z]{2}\.)\s(?=[A-Z][a-z])/).pop() ?? s;
  return tail
    .replace(/^(?:[A-Z]{2,}\.?\s)+/, '')
    .replace(/^(?:and|between|by|Plaintiff|Defendant|Respondent|Issuer|Lead Investor|Charging Party)[:,]?\s+/i, '')
    .replace(/^[,\s]+/, '')
    .trim();
}

export function extractEntities(doc: MatterDocument): ExtractedEntity[] {
  const seen = new Set<string>();
  const out: ExtractedEntity[] = [];
  const push = (kind: ExtractedEntity['kind'], value: string, paragraph: number) => {
    const key = kind + '|' + value.toLowerCase();
    if (seen.has(key) || value.length < 3) return;
    seen.add(key);
    out.push({ kind, value, source: { docId: doc.id, paragraph } });
  };

  doc.paragraphs.forEach((p, i) => {
    for (const m of p.matchAll(PARTY_RE)) {
      const v = cleanParty(m[1]);
      if (v.split(' ').length <= 6 && !/^(The|This|Any|Each|All)\b/.test(v)) push('party', v, i);
    }
    for (const m of p.matchAll(COURT_RE)) push('court', titleCase(m[0]), i);
    for (const m of p.matchAll(JUDGE_RE)) push('person', 'Hon. ' + m[1], i);
    for (const d of datesIn(p)) push('date', d.raw, i);
    for (const m of p.matchAll(AMOUNT_RE)) push('amount', m[0], i);
    for (const m of p.matchAll(REF_RE)) push('reference', m[0], i);
  });
  return out;
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ───────────────────────────── Summaries ─────────────────────────────

const SALIENT = [
  /\bshall\b/i, /\bagree/i, /\bbreach/i, /\bterminat/i, /\brenew/i, /\bdamages\b/i, /\bresolved\b/i,
  /\bexclusiv/i, /\bclos(e|ing)\b/i, /\bdeadline|no later than|by [A-Z][a-z]+ \d/i, /\$\d/, /\brequests?\b/i,
  /\bcommitted|commitment/i, /\bliabilit/i, /\bposition statement/i, /\bpreserve/i, /\bexpiration/i,
];

function scoreSentence(s: string): number {
  let score = 0;
  for (const re of SALIENT) if (re.test(s)) score += 1;
  if (DATE_RE.test(s)) score += 1.5;
  DATE_RE.lastIndex = 0;
  if (s.length > 320) score -= 1;
  return score;
}

function compress(s: string): string {
  // Light-touch tightening; production uses Bedrock with an instruction to
  // paraphrase only what the cited passage supports.
  return s
    .replace(/\s*\("[^"]+"\)/g, '')
    .replace(/^(\d+\.|Section \d+(\.\d+)?)\s*/, '')
    .replace(/^[A-Z][A-Za-z ]+\.\s(?=[A-Z])/, (m) => (m.length < 40 ? '' : m))
    .trim();
}

export function summarize(doc: MatterDocument, maxPoints = 5): SummaryPoint[] {
  const candidates: { text: string; score: number; paragraph: number; order: number }[] = [];
  let order = 0;
  doc.paragraphs.forEach((p, i) => {
    sentences(p).forEach((s) => {
      candidates.push({ text: s, score: scoreSentence(s) + (i === 0 ? 0.5 : 0), paragraph: i, order: order++ });
    });
  });
  const picked = candidates
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPoints)
    .sort((a, b) => a.order - b.order);

  return picked.map((c) => ({
    text: compress(c.text),
    sources: [{ docId: doc.id, paragraph: c.paragraph }],
  }));
}

// ───────────────────────────── Deadline candidates ─────────────────────────────

const OBLIGATION_HINT = /\b(shall|must|no later than|by|within|not less than|on or before|ending|requests?|set for|completed by|filed by|served by|intends to begin|expiration date is)\b/i;

function inferTitle(sentence: string, paragraph: string, docType: string): string {
  const s = sentence;
  if (/position statement/i.test(s)) return 'Position statement due to agency';
  if (/exclusiv|competing equity/i.test(s)) return 'Exclusivity period ends';
  if (/target closing|close on or before/i.test(s)) return 'Target closing date';
  if (/exercise the renewal option/i.test(s)) return 'Renewal option exercise notice';
  if (/expiration date is/i.test(s)) return 'Lease expiration date';
  if (/initial term.*ending/i.test(s)) return 'Initial contract term ends';
  if (/not to renew|non-renewal/i.test(s)) return 'Non-renewal notice window closes';
  if (/\breceived\b/i.test(s)) return 'Date notice received';
  if (/modernization|construction|works/i.test(s)) return 'Landlord building works begin';
  if (/rebuttal/i.test(s)) return 'Rebuttal expert reports';
  if (/opening expert/i.test(s)) return 'Opening expert reports';
  const label = paragraph.match(/^(?:Section [\d.]+\s+|\d+\.\s*)?([A-Z][A-Za-z ]{2,40})\.\s/);
  if (label && !/^[A-Z ]+$/.test(label[1])) return label[1].trim();
  return `${docType} date`;
}

function relativeDays(s: string): { days: number; anchor: 'before' | 'after' | 'of' } | null {
  const m =
    s.match(/(?:within|not less than)\s+(\d+)\s+days?\s+(after|before|prior to|of)/i) ||
    s.match(/(?:within|not less than)\s+([a-z ]+?)\s+\((\d+)\)\s+days?\s+(after|before|prior to|of)/i);
  if (!m) return null;
  if (m.length === 3) return { days: Number(m[1]), anchor: normAnchor(m[2]) };
  const n = Number(m[2]) || NUMBER_WORDS[m[1].trim().toLowerCase()];
  return { days: n, anchor: normAnchor(m[3]) };
}
function normAnchor(a: string): 'before' | 'after' | 'of' {
  a = a.toLowerCase();
  return a === 'after' ? 'after' : a === 'of' ? 'of' : 'before';
}

let seq = 0;
const newId = () => `dl-ai-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * Identify candidate dates and potential deadlines. Output is NEVER treated as
 * a docketed deadline: status is always 'candidate' and computed dates carry
 * the arithmetic used so a reviewer can check it against applicable rules
 * (court days, holidays, service method, and contract notice mechanics are
 * NOT applied by the extractor).
 */
export function extractDeadlineCandidates(doc: MatterDocument): Deadline[] {
  const out: Deadline[] = [];
  const allDates = doc.paragraphs.flatMap((p, i) => datesIn(p).map((d) => ({ ...d, paragraph: i })));

  doc.paragraphs.forEach((p, i) => {
    for (const s of sentences(p)) {
      if (!OBLIGATION_HINT.test(s)) continue;

      // Explicit dates inside an obligation sentence.
      const ds = datesIn(s);
      const isCaption = i === 0 && /\b(filed|entered|dated|effective|as of)\b/i.test(s);
      if (ds.length && !isCaption) {
        for (const d of ds) {
          out.push({
            id: newId(),
            matterId: doc.matterId,
            title: inferTitle(s, p, doc.docType),
            date: d.iso,
            basis: 'explicit',
            confidence: /\b(shall|no later than|by|on or before)\b/i.test(s) ? 'high' : 'medium',
            source: { docId: doc.id, paragraph: i },
            status: 'candidate',
            createdBy: 'ai',
          });
        }
      }

      // Relative periods ("within 30 days of receipt", "180 days prior to the Expiration Date").
      const rel = relativeDays(s);
      if (rel && !ds.length) {
        const anchor = pickAnchor(s, rel.anchor, allDates, i, doc);
        if (anchor) {
          const date = rel.anchor === 'before' ? addDays(anchor.iso, -rel.days) : addDays(anchor.iso, rel.days);
          out.push({
            id: newId(),
            matterId: doc.matterId,
            title: inferTitle(s, p, doc.docType),
            date,
            basis: 'computed',
            computation: `${rel.days} calendar days ${rel.anchor === 'before' ? 'before' : 'after'} ${anchor.label} (${formatDate(anchor.iso)}). Calendar-day arithmetic only — confirm counting rules, service method, holidays and any notice mechanics.`,
            confidence: anchor.confident ? 'medium' : 'low',
            source: { docId: doc.id, paragraph: i },
            status: 'candidate',
            createdBy: 'ai',
          });
        }
      }
    }
  });

  // De-duplicate on (date, title).
  const seen = new Set<string>();
  return out.filter((d) => {
    const k = d.date + d.title;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function pickAnchor(
  sentence: string,
  _dir: string,
  allDates: { raw: string; iso: string; paragraph: number }[],
  paragraph: number,
  doc: MatterDocument,
): { iso: string; label: string; confident: boolean } | null {
  const text = doc.paragraphs.join(' ');
  if (/receipt/i.test(sentence)) {
    const m = text.match(new RegExp(`received[^.]*?on\\s+((${MONTHS.join('|')})\\s+\\d{1,2},\\s+\\d{4})`, 'i'));
    if (m) {
      const d = datesIn(m[1])[0];
      return { iso: d.iso, label: 'stated date of receipt', confident: true };
    }
    return { iso: doc.documentDate, label: 'document date (receipt date not found — verify)', confident: false };
  }
  if (/expiration date/i.test(sentence)) {
    const m = text.match(new RegExp(`Expiration Date is\\s+((${MONTHS.join('|')})\\s+\\d{1,2},\\s+\\d{4})`));
    if (m) return { iso: datesIn(m[1])[0].iso, label: 'the Expiration Date', confident: true };
  }
  if (/end of the (?:then-current|initial) term/i.test(sentence)) {
    const m = text.match(new RegExp(`ending\\s+((${MONTHS.join('|')})\\s+\\d{1,2},\\s+\\d{4})`));
    if (m) return { iso: datesIn(m[1])[0].iso, label: 'end of the initial term', confident: true };
  }
  if (/close of fact discovery/i.test(sentence)) {
    const m = text.match(new RegExp(`fact discovery shall be completed by\\s+((${MONTHS.join('|')})\\s+\\d{1,2},\\s+\\d{4})`, 'i'));
    if (m) return { iso: datesIn(m[1])[0].iso, label: 'close of fact discovery', confident: true };
  }
  // Event-triggered periods ("30 days after Tenant's exercise notice") have no
  // knowable anchor date yet; we don't guess one.
  void allDates; void paragraph;
  return null;
}

// ───────────────────────────── Full analysis ─────────────────────────────

export function analyzeDocument(doc: MatterDocument): DocumentAnalysis {
  const entities = extractEntities(doc);
  const summary = summarize(doc);
  const keyPassages = doc.paragraphs
    .map((p, i) => ({ p, i, s: sentences(p).reduce((acc, s) => acc + scoreSentence(s), 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map(({ p, i }) => ({ label: p.slice(0, 72).replace(/\s+\S*$/, '') + '…', source: { docId: doc.id, paragraph: i } }));
  return { docId: doc.id, generatedAt: new Date().toISOString(), model: DEMO_MODEL_LABEL, summary, entities, keyPassages };
}

// ───────────────────────────── Grounded search ─────────────────────────────

const STOP = new Set('a an and are as at be by can do does for from has have how i in is it its of on or our shall that the their there this to was what when where which who will with would any must may'.split(' '));

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9$.\s]/g, ' ').split(/\s+/).map(stem).filter((t) => t && !STOP.has(t));
}
function stem(t: string) {
  return t.replace(/\.$/, '').replace(/(ing|ed|es|s)$/, '');
}

export interface SearchHit {
  source: SourceRef;
  docTitle: string;
  text: string;
  score: number;
}

export interface GroundedAnswer {
  query: string;
  grounded: boolean;
  answer: { text: string; sources: SourceRef[] }[];
  hits: SearchHit[];
  note: string;
}

/** BM25-style lexical retrieval over paragraphs the user is authorized to see. */
export function searchPassages(query: string, docs: MatterDocument[], k = 5): SearchHit[] {
  const qt = Array.from(new Set(tokens(query)));
  if (!qt.length) return [];
  const passages = docs.flatMap((d) => d.paragraphs.map((text, paragraph) => ({ d, text, paragraph, toks: tokens(text) })));
  const N = passages.length;
  const avgLen = passages.reduce((a, p) => a + p.toks.length, 0) / Math.max(N, 1);
  const df = new Map<string, number>();
  for (const t of qt) df.set(t, passages.filter((p) => p.toks.includes(t)).length);

  const k1 = 1.4, b = 0.75;
  const scored = passages.map((p) => {
    let score = 0;
    for (const t of qt) {
      const f = p.toks.filter((x) => x === t).length;
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * p.toks.length) / avgLen)));
    }
    return { source: { docId: p.d.id, paragraph: p.paragraph }, docTitle: p.d.title, text: p.text, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

export function answerQuestion(query: string, docs: MatterDocument[]): GroundedAnswer {
  const hits = searchPassages(query, docs);
  const top = hits[0]?.score ?? 0;
  const relevant = hits.filter((h) => h.score >= Math.max(1.2, top * 0.55));
  if (!relevant.length) {
    return {
      query,
      grounded: false,
      answer: [],
      hits,
      note: 'No passage in the authorized documents sufficiently supports an answer. MatterWeave does not answer from general knowledge.',
    };
  }
  const qt = new Set(tokens(query));
  const answer = relevant.slice(0, 3).map((h) => {
    const best = sentences(h.text)
      .map((s) => ({ s, sc: tokens(s).filter((t) => qt.has(t)).length + (DATE_RE.test(s) ? 0.5 : 0) }))
      .sort((a, b) => b.sc - a.sc)[0];
    DATE_RE.lastIndex = 0;
    return { text: best.s, sources: [h.source] };
  });
  return {
    query,
    grounded: true,
    answer,
    hits,
    note: 'Answer is composed only of quoted or closely paraphrased passages from the cited documents. Review sources before relying on it.',
  };
}
