import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import * as demo from '../data/demo';
import { analyzeDocument } from '../ai/engine';
import type {
  AuditEvent,
  Communication,
  Deadline,
  DocumentAnalysis,
  Matter,
  MatterDocument,
  Task,
  TaskStatus,
  User,
} from '../types';

export interface AppState {
  version: number;
  currentUserId: string;
  users: User[];
  matters: Matter[];
  documents: MatterDocument[];
  analyses: Record<string, DocumentAnalysis>;
  deadlines: Deadline[];
  tasks: Task[];
  communications: Communication[];
  audit: AuditEvent[];
}

const STATE_VERSION = 3;
const STORAGE_KEY = 'matterweave.demo.state';

function initialState(): AppState {
  return {
    version: STATE_VERSION,
    currentUserId: 'u3',
    users: demo.users,
    matters: demo.matters,
    documents: demo.documents,
    // Documents seeded as already analyzed get their analysis precomputed.
    analyses: Object.fromEntries(
      demo.documents.filter((d) => d.status === 'analyzed').map((d) => [d.id, { ...analyzeDocument(d), generatedAt: d.uploadedAt }]),
    ),
    deadlines: demo.deadlines,
    tasks: demo.tasks,
    communications: demo.communications,
    audit: demo.auditSeed,
  };
}

type Action =
  | { type: 'switchUser'; userId: string }
  | { type: 'createMatter'; matter: Matter }
  | { type: 'updateMatter'; matterId: string; patch: Partial<Matter>; auditAction: string; detail?: string }
  | { type: 'addDocument'; doc: MatterDocument }
  | { type: 'setDocStatus'; docId: string; status: MatterDocument['status'] }
  | { type: 'storeAnalysis'; analysis: DocumentAnalysis; candidates: Deadline[] }
  | { type: 'verifyDeadline'; id: string; note: string; date?: string; title?: string }
  | { type: 'rejectDeadline'; id: string; note: string }
  | { type: 'addDeadline'; deadline: Deadline }
  | { type: 'createTask'; task: Task }
  | { type: 'setTaskStatus'; taskId: string; status: TaskStatus }
  | { type: 'addCommunication'; comm: Communication }
  | { type: 'logSearch'; matterId?: string; query: string }
  | { type: 'reset' };

let auditSeq = 0;
function audit(state: AppState, action: string, target: string, matterId?: string, detail?: string): AuditEvent[] {
  const ev: AuditEvent = {
    id: `a-${Date.now().toString(36)}-${(auditSeq++).toString(36)}`,
    at: new Date().toISOString(),
    actorId: state.currentUserId,
    matterId,
    action,
    target,
    detail,
  };
  return [ev, ...state.audit];
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'switchUser': {
      const u = state.users.find((x) => x.id === a.userId);
      const next = { ...state, currentUserId: a.userId };
      return { ...next, audit: audit(next, 'session.switch_user', u?.name ?? a.userId) };
    }
    case 'createMatter':
      return {
        ...state,
        matters: [a.matter, ...state.matters],
        audit: audit(state, 'matter.create', a.matter.number + ' — ' + a.matter.name, a.matter.id),
      };
    case 'updateMatter': {
      const m = state.matters.find((x) => x.id === a.matterId);
      return {
        ...state,
        matters: state.matters.map((x) => (x.id === a.matterId ? { ...x, ...a.patch } : x)),
        audit: audit(state, a.auditAction, m?.number ?? a.matterId, a.matterId, a.detail),
      };
    }
    case 'addDocument':
      return {
        ...state,
        documents: [a.doc, ...state.documents],
        audit: audit(state, 'document.upload', a.doc.title, a.doc.matterId, `${a.doc.docType}; stored encrypted (SSE-KMS)`),
      };
    case 'setDocStatus':
      return { ...state, documents: state.documents.map((d) => (d.id === a.docId ? { ...d, status: a.status } : d)) };
    case 'storeAnalysis': {
      const doc = state.documents.find((d) => d.id === a.analysis.docId);
      // Skip candidates that duplicate an existing deadline for the same matter/date/source.
      const fresh = a.candidates.filter(
        (c) =>
          !state.deadlines.some(
            (d) => d.matterId === c.matterId && d.date === c.date && d.source?.docId === c.source?.docId && d.source?.paragraph === c.source?.paragraph,
          ),
      );
      return {
        ...state,
        analyses: { ...state.analyses, [a.analysis.docId]: a.analysis },
        documents: state.documents.map((d) => (d.id === a.analysis.docId ? { ...d, status: 'analyzed' } : d)),
        deadlines: [...state.deadlines, ...fresh],
        audit: audit(
          state,
          'ai.analyze_document',
          doc?.title ?? a.analysis.docId,
          doc?.matterId,
          `${a.analysis.summary.length} summary points, ${a.analysis.entities.length} entities, ${fresh.length} new candidate dates (unverified)`,
        ),
      };
    }
    case 'verifyDeadline': {
      const d = state.deadlines.find((x) => x.id === a.id);
      if (!d) return state;
      const changed = a.date && a.date !== d.date ? ` Date corrected ${d.date} → ${a.date}.` : '';
      return {
        ...state,
        deadlines: state.deadlines.map((x) =>
          x.id === a.id
            ? { ...x, status: 'verified', date: a.date ?? x.date, title: a.title ?? x.title, verifiedBy: state.currentUserId, verifiedAt: new Date().toISOString(), verificationNote: a.note }
            : x,
        ),
        audit: audit(state, 'deadline.verify', a.title ?? d.title, d.matterId, (a.note + changed).trim()),
      };
    }
    case 'rejectDeadline': {
      const d = state.deadlines.find((x) => x.id === a.id);
      if (!d) return state;
      return {
        ...state,
        deadlines: state.deadlines.map((x) =>
          x.id === a.id ? { ...x, status: 'rejected', verifiedBy: state.currentUserId, verifiedAt: new Date().toISOString(), verificationNote: a.note } : x,
        ),
        audit: audit(state, 'deadline.reject', d.title, d.matterId, a.note),
      };
    }
    case 'addDeadline':
      return {
        ...state,
        deadlines: [...state.deadlines, a.deadline],
        audit: audit(state, 'deadline.create_manual', a.deadline.title, a.deadline.matterId, `Entered and verified by user for ${a.deadline.date}`),
      };
    case 'createTask':
      return {
        ...state,
        tasks: [a.task, ...state.tasks],
        audit: audit(state, 'task.create', a.task.title, a.task.matterId, a.task.linkedDeadlineId ? 'Created from verified deadline' : undefined),
      };
    case 'setTaskStatus': {
      const t = state.tasks.find((x) => x.id === a.taskId);
      return {
        ...state,
        tasks: state.tasks.map((x) => (x.id === a.taskId ? { ...x, status: a.status } : x)),
        audit: audit(state, 'task.status', t?.title ?? a.taskId, t?.matterId, `${t?.status} → ${a.status}`),
      };
    }
    case 'addCommunication':
      return { ...state, communications: [a.comm, ...state.communications], audit: audit(state, 'communication.log', a.comm.subject, a.comm.matterId) };
    case 'logSearch':
      return { ...state, audit: audit(state, 'ai.search', `"${a.query}"`, a.matterId) };
    case 'reset':
      return { ...initialState(), audit: [...initialState().audit] };
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* storage unavailable — fall back to seed data */
  }
  return initialState();
}

interface Ctx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  me: User;
  userById: (id?: string) => User | undefined;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);
  const value = useMemo<Ctx>(() => {
    const byId = new Map(state.users.map((u) => [u.id, u]));
    return { state, dispatch, me: byId.get(state.currentUserId)!, userById: (id) => (id ? byId.get(id) : undefined) };
  }, [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
