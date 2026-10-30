import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Clock, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { getCalendarEvents, getWorkloadSummary, getTasks, getDefaultNotes, getModules } from '../services/api';

export default function DashboardView({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [sumRes, evtsRes, tasksRes] = await Promise.all([
          getWorkloadSummary(),
          getCalendarEvents(),
          getTasks()
        ]);
        setSummary(sumRes);
        setEvents(evtsRes.slice(0, 4));
        setTasks(tasksRes.slice(0, 4));
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
        <div className="card" style={{ height: '120px' }}>Loading workspace dashboard...</div>
      </div>
    );
  }

  const completionPct = summary && summary.total_tasks > 0 
    ? Math.round((summary.completed_tasks / summary.total_tasks) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Welcome & AI Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(27, 28, 31, 1) 100%)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              AI Academic Workspace
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Welcome back to S.Butler
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            You have {events.length} upcoming deadlines and {summary?.pending_tasks || 0} active study tasks planned.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('assistant')}>
          Chat with Assistant <ArrowRight size={16} />
        </button>
      </div>

      {/* 4 Summary Blocks Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" onClick={() => onNavigate('calendar')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Upcoming Events</span>
            <Calendar size={16} style={{ color: 'var(--status-exam)' }} />
          </div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{events.length}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Exams & Assignment deadlines</span>
        </div>

        <div className="card" onClick={() => onNavigate('planner')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending Tasks</span>
            <CheckSquare size={16} style={{ color: 'var(--status-assignment)' }} />
          </div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{summary?.pending_tasks || 0}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tasks in To-Do queue</span>
        </div>

        <div className="card" onClick={() => onNavigate('planner')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Planned Workload</span>
            <Clock size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{summary?.remaining_estimated_hours || 0} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recalculated remaining study time</span>
        </div>

        <div className="card" onClick={() => onNavigate('notes')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Daily Target</span>
            <FileText size={16} style={{ color: 'var(--status-study)' }} />
          </div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{summary?.recommended_daily_hours || 0} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs/day</span></span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Recommended study pace</span>
        </div>
      </div>

      {/* Weekly Progress Bar */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Weekly Academic Completion Progress</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>{completionPct}%</span>
        </div>
        <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--bg-surface-raised)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${completionPct}%`,
            backgroundColor: 'var(--accent)',
            borderRadius: '4px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Two Column Section: Events & Tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Upcoming Events Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming Deadlines & Events</h3>
            <button className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => onNavigate('calendar')}>View All</button>
          </div>
          {events.length === 0 ? (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>No upcoming deadlines scheduled.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {events.map((evt) => (
                <div key={evt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: 'var(--bg-surface-raised)', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: evt.event_type === 'Exam' ? 'var(--status-exam)' : 'var(--status-assignment)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{evt.title}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{evt.event_type}</span>
                    </div>
                  </div>
                  <span className="badge" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-secondary)' }}>{evt.due_date || 'Upcoming'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Queue Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Academic Tasks Queue</h3>
            <button className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => onNavigate('planner')}>Open Planner</button>
          </div>
          {tasks.length === 0 ? (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>No active tasks in queue.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tasks.map((task) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: 'var(--bg-surface-raised)', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Est: {task.estimated_hours} hrs</span>
                  </div>
                  <span className={`badge ${task.status === 'Completed' ? 'badge-class' : 'badge-assignment'}`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
