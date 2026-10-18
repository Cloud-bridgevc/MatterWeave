import { useState } from 'react';
import { Icon } from '../components/ui';
import { can } from '../state/permissions';
import { useStore } from '../state/store';
import { CreateTaskModal, TaskBoard } from './components';
import { useVisible } from './hooks';

export default function TasksPage() {
  const { me } = useStore();
  const v = useVisible();
  const [view, setView] = useState<'mine' | 'review' | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const tasks = v.tasks.filter((t) => (view === 'all' ? true : view === 'mine' ? t.assigneeId === me.id : t.reviewerId === me.id));
  return (
    <div className="content">
      <div className="page-title">
        <div><h1>Tasks & review workflow</h1><div className="sub">To do → In progress → In review → Done. Tasks with a reviewer require their approval to complete.</div></div>
        <div className="row">
          <div className="row" style={{ gap: 4, background: 'var(--warm-100)', padding: 3, borderRadius: 8 }}>
            {(['all', 'mine', 'review'] as const).map((k) => (
              <button key={k} className="btn btn-sm" style={{ background: view === k ? 'white' : 'transparent', boxShadow: view === k ? 'var(--shadow)' : 'none' }} onClick={() => setView(k)}>
                {k === 'all' ? 'All tasks' : k === 'mine' ? 'Assigned to me' : 'Awaiting my review'}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" disabled={!can(me, 'task.write')} onClick={() => setCreating(true)}><Icon name="plus" size={16} /> New task</button>
        </div>
      </div>
      <TaskBoard tasks={tasks} showMatter />
      {creating && <CreateTaskModal onClose={() => setCreating(false)} />}
    </div>
  );
}
