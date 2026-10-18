import { useMemo } from 'react';
import { canSeeMatter } from '../state/permissions';
import { useStore } from '../state/store';

/** Records the current user is allowed to see (ethical walls applied). */
export function useVisible() {
  const { state, me } = useStore();
  return useMemo(() => {
    const matters = state.matters.filter((m) => canSeeMatter(me, m));
    const ids = new Set(matters.map((m) => m.id));
    // Read-only billing users see matter records but not document content.
    const documents = me.role === 'viewer' ? [] : state.documents.filter((d) => ids.has(d.matterId));
    return {
      matters,
      matterIds: ids,
      documents,
      deadlines: state.deadlines.filter((d) => ids.has(d.matterId)),
      tasks: state.tasks.filter((t) => ids.has(t.matterId)),
      communications: state.communications.filter((c) => ids.has(c.matterId)),
      audit: state.audit.filter((a) => !a.matterId || ids.has(a.matterId)),
    };
  }, [state, me]);
}
