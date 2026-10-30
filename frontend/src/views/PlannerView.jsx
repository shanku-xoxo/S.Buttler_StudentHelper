import React, { useState, useEffect } from 'react';
import { Plus, Clock, RefreshCw, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import { getTasks, createTask, updateTask, getWorkloadSummary, redistributeWorkload } from '../services/api';

export default function PlannerView() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [horizon, setHorizon] = useState('semester'); // daily, monthly, semester
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Task Form
  const [newTask, setNewTask] = useState({
    title: '',
    estimated_hours: 2.5,
    priority: 'Medium',
    description: ''
  });

  const loadPlannerData = async () => {
    try {
      const [tList, sum] = await Promise.all([
        getTasks(null, null, horizon),
        getWorkloadSummary()
      ]);
      setTasks(tList);
      setSummary(sum);
    } catch (e) {
      console.error('Failed to load planner:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlannerData();
  }, [horizon]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await createTask(newTask);
      setShowModal(false);
      setNewTask({ title: '', estimated_hours: 2.5, priority: 'Medium', description: '' });
      loadPlannerData();
    } catch (err) {
      alert('Failed to create task: ' + err.message);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      loadPlannerData();
    } catch (err) {
      alert('Failed to update task status: ' + err.message);
    }
  };

  const handleRedistribute = async () => {
    try {
      const res = await redistributeWorkload({ available_days: 4, max_daily_hours: 4.0 });
      alert(`Workload Successfully Redistributed!\n\nRescheduled ${res.rescheduled_tasks_count} tasks across ${res.available_days} days.\nDaily Workload Target: ${res.daily_workload_hours.join(', ')} hours/day.`);
      loadPlannerData();
    } catch (err) {
      alert('Redistribution failed: ' + err.message);
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'Pending');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      {/* Top Header & Horizon Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
            {['daily', 'monthly', 'semester'].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: horizon === h ? 'var(--bg-surface-raised)' : 'transparent',
                  color: horizon === h ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: horizon === h ? 600 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {h} Planning
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={handleRedistribute}>
            <RefreshCw size={14} /> Redistribute Workload
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Dynamic Workload Summary Bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'linear-gradient(90deg, var(--bg-surface) 0%, var(--bg-surface-raised) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pending Tasks</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{summary?.pending_tasks || 0}</span>
          </div>
          <div style={{ height: '30px', width: '1px', backgroundColor: 'var(--border-hairline)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Remaining Workload</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>{summary?.remaining_estimated_hours || 0} hrs</span>
          </div>
          <div style={{ height: '30px', width: '1px', backgroundColor: 'var(--border-hairline)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pacing Recommendation</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>{summary?.recommended_daily_hours || 0} hrs/day</span>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', minHeight: '450px' }}>
        {/* Column 1: To Do */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-base)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>To Do ({todoTasks.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todoTasks.map(task => (
              <div key={task.id} className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge" style={{ backgroundColor: 'var(--bg-surface-raised)', color: 'var(--text-secondary)' }}>
                    <Clock size={12} style={{ marginRight: '4px' }} /> {task.estimated_hours} hrs
                  </span>
                  <button className="btn btn-outline" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => handleStatusChange(task.id, 'In Progress')}>
                    Start →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-base)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>In Progress ({inProgressTasks.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {inProgressTasks.map(task => (
              <div key={task.id} className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderColor: 'var(--accent)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                    <Clock size={12} style={{ marginRight: '4px' }} /> {task.estimated_hours} hrs
                  </span>
                  <button className="btn btn-primary" style={{ fontSize: '11px', padding: '2px 6px' }} onClick={() => handleStatusChange(task.id, 'Completed')}>
                    Complete ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-base)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>Completed ({completedTasks.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {completedTasks.map(task => (
              <div key={task.id} className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.7 }}>
                <span style={{ fontSize: '13px', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>{task.title}</span>
                <span style={{ fontSize: '11px', color: '#10B981' }}>✓ Completed ({task.actual_hours || task.estimated_hours}h)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Add Academic Task</h3>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                className="input"
                placeholder="Task Title (e.g. Study Normalization)"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    value={newTask.estimated_hours}
                    onChange={e => setNewTask({ ...newTask, estimated_hours: parseFloat(e.target.value) })}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Priority</label>
                  <select
                    className="input"
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
