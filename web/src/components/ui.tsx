import { useEffect, useState, type ReactNode } from 'react';
import type { Deadline, MatterStatus, TaskStatus } from '../types';

type IconName =
  | 'logo' | 'grid' | 'folder' | 'file' | 'search' | 'calendar' | 'check' | 'chat' | 'clock' | 'shield'
  | 'spark' | 'alert' | 'plus' | 'users' | 'lock' | 'key' | 'database' | 'cloud' | 'scale' | 'building'
  | 'arrow' | 'x' | 'upload' | 'history' | 'bolt' | 'eye' | 'link' | 'menu';

const PATHS: Record<IconName, string> = {
  logo: 'M4 18V6l5 7 3-5 3 5 5-7v12',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  file: 'M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 17h6',
  search: 'M11 4a7 7 0 105.2 11.7L20 20M11 4a7 7 0 017 7',
  calendar: 'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8 3v4M16 3v4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chat: 'M4 5h16v11H9l-5 4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  shield: 'M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  alert: 'M12 4l9 16H3zM12 10v4M12 17.5v.01',
  plus: 'M12 5v14M5 12h14',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.3a3.5 3.5 0 010 6.4M18 14.8c1.8.7 3 2.5 3.5 5.2',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  key: 'M14.5 9.5a4 4 0 11-1.2-2.8M13.3 6.7L20 13l-2 2-1.5-1.5L15 15l-1.5-1.5',
  database: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  cloud: 'M7 18a4 4 0 01-.6-8A6 6 0 0118 9a4.5 4.5 0 01-.5 9z',
  scale: 'M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 006 0zM19 7l-3 6a3 3 0 006 0z',
  building: 'M5 21V5a1 1 0 011-1h8a1 1 0 011 1v16M15 9h3a1 1 0 011 1v11M3 21h18M8 8h3M8 12h3M8 16h3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  x: 'M6 6l12 12M18 6L6 18',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  history: 'M3 12a9 9 0 103-6.7L3 8M3 3v5h5M12 8v4l3 2',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  menu: 'M4 7h16M4 12h16M4 17h16',
};

export function Icon({ name, size = 18, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <span className="logo" style={{ color: light ? 'white' : 'var(--navy-900)' }}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={light ? '#16263d' : '#0f1b2d'} />
        <path d="M7 22V10l5 7 4-7 4 7 5-7v12" stroke="#B8875A" strokeWidth="2.4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      MatterWeave
    </span>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="panel-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3600);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return { toast: setMsg, toastNode: node };
}

export function MatterStatusBadge({ s }: { s: MatterStatus }) {
  const map = { intake: ['b-bronze', 'Intake'], active: ['b-success', 'Active'], on_hold: ['b-warn', 'On hold'], closed: ['b-neutral', 'Closed'] } as const;
  return <span className={`badge ${map[s][0]}`}><span className="dot" />{map[s][1]}</span>;
}

export function DeadlineBadge({ d }: { d: Deadline }) {
  if (d.status === 'verified') return <span className="badge b-success"><Icon name="check" size={12} stroke={2.4} />Verified</span>;
  if (d.status === 'rejected') return <span className="badge b-neutral">Rejected</span>;
  return <span className="badge b-warn"><Icon name="spark" size={12} />AI candidate · unverified</span>;
}

export const TASK_LABEL: Record<TaskStatus, string> = { todo: 'To do', in_progress: 'In progress', in_review: 'In review', done: 'Done' };

export function AiDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="notice">
      <Icon name="alert" size={16} />
      <div>
        <strong>AI-assisted output — not legal advice.</strong>{' '}
        {compact
          ? 'Verify against the cited source before relying on it.'
          : 'Summaries, extracted information and candidate dates are generated to support administrative coordination and document review. They may be incomplete or wrong. Review the cited passages; dates must be verified by authorized legal staff before they are docketed.'}
      </div>
    </div>
  );
}
