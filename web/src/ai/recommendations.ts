import { DEMO_TODAY } from '../data/demo';
import type { AppState } from '../state/store';
import type { Matter, Recommendation } from '../types';
import { addDays, formatDate } from './engine';

/**
 * Workflow recommendations. These are coordination prompts (what looks
 * missing, late or unverified), not legal judgments. Rules are deterministic
 * so every recommendation can be explained by the record it points at.
 */
export function recommendationsFor(state: AppState, matter: Matter): Recommendation[] {
  const out: Recommendation[] = [];
  const base = `/app/matters/${matter.id}`;
  const docs = state.documents.filter((d) => d.matterId === matter.id);

  for (const t of matter.requiredDocTypes) {
    if (!docs.some((d) => d.docType === t)) {
      out.push({
        id: `${matter.id}-missing-${t}`,
        matterId: matter.id,
        severity: t === 'Engagement Letter' ? 'high' : 'medium',
        kind: 'missing_document',
        message: `No ${t} on file. Matter checklist for ${matter.practiceArea} expects one.`,
        actionLabel: 'Upload',
        actionHref: `${base}/documents`,
      });
    }
  }

  for (const t of state.tasks.filter((t) => t.matterId === matter.id && t.status !== 'done' && t.dueDate)) {
    if (t.dueDate! < DEMO_TODAY) {
      out.push({
        id: `${t.id}-overdue`,
        matterId: matter.id,
        severity: 'high',
        kind: 'overdue_task',
        message: `Task overdue since ${formatDate(t.dueDate!)}: “${t.title}”.`,
        actionLabel: 'Open tasks',
        actionHref: `${base}/tasks`,
      });
    }
  }

  const horizon = addDays(DEMO_TODAY, 30);
  for (const d of state.deadlines.filter((d) => d.matterId === matter.id)) {
    if (d.status === 'candidate') {
      out.push({
        id: `${d.id}-unverified`,
        matterId: matter.id,
        severity: d.date <= horizon ? 'high' : 'medium',
        kind: 'unverified_deadline',
        message: `AI-identified date awaiting verification: “${d.title}” (${formatDate(d.date)}).${d.date < DEMO_TODAY ? ' Candidate date is already in the past.' : ''}`,
        actionLabel: 'Review',
        actionHref: `${base}/deadlines`,
      });
    } else if (d.status === 'verified' && d.date >= DEMO_TODAY && d.date <= horizon) {
      const hasTask = state.tasks.some((t) => t.linkedDeadlineId === d.id);
      out.push({
        id: `${d.id}-upcoming`,
        matterId: matter.id,
        severity: 'medium',
        kind: 'upcoming_date',
        message: `Verified date within 30 days: “${d.title}” on ${formatDate(d.date)}.${hasTask ? '' : ' No linked task yet.'}`,
        actionLabel: hasTask ? 'View' : 'Create task',
        actionHref: `${base}/deadlines`,
      });
    }
  }

  if (!matter.billing.billingCode || !matter.billing.clientMatterRef) {
    out.push({
      id: `${matter.id}-billing`,
      matterId: matter.id,
      severity: 'low',
      kind: 'incomplete_record',
      message: 'Billing code or client-matter reference is blank.',
      actionLabel: 'Complete',
      actionHref: `${base}/billing`,
    });
  }
  if (!state.communications.some((c) => c.matterId === matter.id)) {
    out.push({
      id: `${matter.id}-nocomms`,
      matterId: matter.id,
      severity: 'low',
      kind: 'incomplete_record',
      message: 'No client communications logged on this matter yet.',
      actionLabel: 'Log',
      actionHref: `${base}/communications`,
    });
  }
  const unanalyzed = docs.filter((d) => d.status === 'uploaded').length;
  if (unanalyzed) {
    out.push({
      id: `${matter.id}-unanalyzed`,
      matterId: matter.id,
      severity: 'low',
      kind: 'incomplete_record',
      message: `${unanalyzed} document${unanalyzed > 1 ? 's have' : ' has'} not been analyzed for dates and key terms.`,
      actionLabel: 'Analyze',
      actionHref: `${base}/documents`,
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
