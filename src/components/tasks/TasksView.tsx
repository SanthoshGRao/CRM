import React, { useState } from 'react';
import { Task } from '../../types/crm';
import { StorageEngine } from '../../services/storage';
import { Plus, CheckSquare, Square, Calendar, AlertCircle } from 'lucide-react';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => StorageEngine.getTasks());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'medium' as Task['priority'],
    relatedTo: '',
  });

  const refresh = () => setTasks(StorageEngine.getTasks());

  const handleToggle = (id: string) => {
    StorageEngine.toggleTaskStatus(id);
    refresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    StorageEngine.addTask({
      ...form,
      status: 'pending',
      assignedTo: 'Santhosh Kumar',
    });

    refresh();
    setIsModalOpen(false);
    setForm({
      title: '',
      description: '',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      priority: 'medium',
      relatedTo: '',
    });
  };

  const getPriorityStyle = (p: Task['priority']) => {
    switch (p) {
      case 'urgent': return { bg: '#fee2e2', text: '#b91c1c' };
      case 'high': return { bg: '#ffedd5', text: '#c2410c' };
      case 'medium': return { bg: '#fef3c7', text: '#b45309' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Task Checklist</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Keep track of sales calls, emails, and upcoming client commitments.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const pStyle = getPriorityStyle(task.priority);

            return (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  opacity: isCompleted ? 0.6 : 1,
                  background: isCompleted ? '#f8fafc' : '#ffffff',
                }}
              >
                <button
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: isCompleted ? '#16a34a' : '#94a3b8' }}
                  onClick={() => handleToggle(task.id)}
                >
                  {isCompleted ? <CheckSquare size={22} /> : <Square size={22} />}
                </button>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </div>
                  {task.relatedTo && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Related to: {task.relatedTo}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                    <Calendar size={14} />
                    <span>{task.dueDate}</span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: pStyle.bg,
                      color: pStyle.text,
                    }}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Create New Task</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Schedule follow-up demo call"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Related Account / Company</label>
                <input
                  className="form-input"
                  placeholder="e.g. TechCorp Solutions"
                  value={form.relatedTo}
                  onChange={(e) => setForm({ ...form, relatedTo: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
