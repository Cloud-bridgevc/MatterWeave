// Domain model shared by the dashboard. Mirrors infra/db/schema.sql.

export type Role = 'partner' | 'associate' | 'paralegal' | 'legal_ops' | 'viewer';

export interface User {
  id: string;
  name: string;
  role: Role;
  title: string;
  initials: string;
}

export type MatterStatus = 'intake' | 'active' | 'on_hold' | 'closed';
export type PracticeArea =
  | 'Commercial Litigation'
  | 'Corporate / M&A'
  | 'Real Estate'
  | 'Employment'
  | 'Regulatory';

export interface Matter {
  id: string;
  number: string;
  name: string;
  client: string;
  clientType: 'law_firm_client' | 'internal_business_unit';
  practiceArea: PracticeArea;
  status: MatterStatus;
  leadId: string;
  teamIds: string[];
  openedOn: string; // ISO date
  description: string;
  billing: BillingRef;
  retentionPolicy: RetentionPolicyId;
  requiredDocTypes: DocType[];
}

export interface BillingRef {
  billingCode: string;
  clientMatterRef: string;
  arrangement: 'Hourly' | 'Fixed fee' | 'Capped fee' | 'Internal cost center';
  budget?: number;
  timeLoggedHours: number;
  ledesTaskCode?: string;
}

export type RetentionPolicyId = 'ret-7y' | 'ret-10y' | 'ret-hold';

export type DocType =
  | 'Complaint'
  | 'Answer'
  | 'Scheduling Order'
  | 'Contract'
  | 'Term Sheet'
  | 'Board Consent'
  | 'Lease'
  | 'Notice Letter'
  | 'Agency Charge'
  | 'Engagement Letter'
  | 'Correspondence';

export interface MatterDocument {
  id: string;
  matterId: string;
  title: string;
  docType: DocType;
  uploadedBy: string;
  uploadedAt: string;
  documentDate: string; // ISO date the document is dated
  pages: number;
  sizeKb: number;
  paragraphs: string[];
  status: 'uploaded' | 'processing' | 'analyzed';
  privileged: boolean;
}

// ---------- AI outputs (always "candidate" until a human verifies) ----------

export interface SourceRef {
  docId: string;
  paragraph: number; // zero-based index into MatterDocument.paragraphs
}

export interface ExtractedEntity {
  kind: 'party' | 'date' | 'reference' | 'amount' | 'court' | 'person';
  value: string;
  source: SourceRef;
}

export interface SummaryPoint {
  text: string;
  sources: SourceRef[];
}

export interface DocumentAnalysis {
  docId: string;
  generatedAt: string;
  model: string;
  summary: SummaryPoint[];
  entities: ExtractedEntity[];
  keyPassages: { label: string; source: SourceRef }[];
}

export type DeadlineStatus = 'candidate' | 'verified' | 'rejected';

export interface Deadline {
  id: string;
  matterId: string;
  title: string;
  date: string; // ISO date
  basis: 'explicit' | 'computed';
  computation?: string;
  confidence: 'high' | 'medium' | 'low';
  source?: SourceRef;
  status: DeadlineStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
  createdBy: 'ai' | string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface Task {
  id: string;
  matterId: string;
  title: string;
  assigneeId: string;
  reviewerId?: string;
  dueDate?: string;
  status: TaskStatus;
  linkedDeadlineId?: string;
  linkedDocId?: string;
  createdAt: string;
  createdBy: string;
}

export interface Communication {
  id: string;
  matterId: string;
  date: string;
  channel: 'Email' | 'Call' | 'Meeting' | 'Letter' | 'Portal';
  direction: 'inbound' | 'outbound' | 'internal';
  subject: string;
  participants: string;
  summary: string;
  loggedBy: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  matterId?: string;
  action: string;
  target: string;
  detail?: string;
}

export interface Recommendation {
  id: string;
  matterId: string;
  severity: 'high' | 'medium' | 'low';
  kind: 'missing_document' | 'overdue_task' | 'upcoming_date' | 'incomplete_record' | 'unverified_deadline';
  message: string;
  actionLabel?: string;
  actionHref?: string;
}
