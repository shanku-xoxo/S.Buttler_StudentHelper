import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, CheckSquare, Edit3, Trash2 } from 'lucide-react';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getTasks } from '../services/api';

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Event Form
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'Exam',
    due_date: selectedDate,
    description: ''
  });

  const loadCalendar = async () => {
    try {
      const [evts, tskList] = await Promise.all([
        getCalendarEvents(),
        getTasks()
      ]);
      setEvents(evts);
      setTasks(tskList);
    } catch (e) {
      console.error('Failed to load calendar events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    try {
      await createCalendarEvent({
        ...newEvent,
        due_date: newEvent.due_date || selectedDate
      });
      setShowAddModal(false);
      setNewEvent({ title: '', event_type: 'Exam', due_date: selectedDate, description: '' });
      loadCalendar();
    } catch (err) {
      alert('Failed to create event: ' + err.message);
    }
  };

  const handleSaveEditEvent = async (e) => {
    e.preventDefault();
    if (!editingEvent || !editingEvent.title.trim()) return;

    try {
      await updateCalendarEvent(editingEvent.id, {
        title: editingEvent.title,
        event_type: editingEvent.event_type,
        due_date: editingEvent.due_date,
        description: editingEvent.description
      });
      setEditingEvent(null);
      loadCalendar();
    } catch (err) {
      alert('Failed to update event: ' + err.message);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteCalendarEvent(eventId);
      setEditingEvent(null);
      loadCalendar();
    } catch (err) {
      alert('Failed to delete event: ' + err.message);
    }
  };

  const dayEvents = events.filter(e => e.due_date === selectedDate || e.start_time?.startsWith(selectedDate));
  const linkedTasks = tasks.filter(t => dayEvents.some(e => e.id === t.calendar_event_id));

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 110px)' }} className="animate-fade-in">
      {/* Calendar Month Grid */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CalendarIcon size={20} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>September 2026</h2>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Event
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-exam)' }} /> Exam
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-assignment)' }} /> Assignment
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-class)' }} /> Class
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-study)' }} /> Study Session
          </div>
        </div>

        {/* Simple Month Grid View */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', flex: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: '4px' }}>
              {day}
            </div>
          ))}

          {Array.from({ length: 30 }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `2026-09-${dayNum < 10 ? '0' + dayNum : dayNum}`;
            const isSelected = selectedDate === dateStr;
            const dayEvts = events.filter(e => e.due_date === dateStr);

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  backgroundColor: isSelected ? 'var(--bg-surface-raised)' : 'var(--bg-base)',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-hairline)',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '60px'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {dayNum}
                </span>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {dayEvts.map((e, idx) => (
                    <span
                      key={idx}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: e.event_type === 'Exam' ? 'var(--status-exam)' : 'var(--status-assignment)'
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail Panel */}
      <div className="card" style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Schedule for {selectedDate}
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {dayEvents.length} event(s) scheduled
          </span>
        </div>

        {/* Events List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {dayEvents.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No events scheduled for this date.</span>
          ) : (
            dayEvents.map(evt => (
              <div key={evt.id} style={{ padding: '12px', backgroundColor: 'var(--bg-surface-raised)', borderRadius: '6px', border: '1px solid var(--border-hairline)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{evt.title}</span>
                  <span className={`badge badge-${evt.event_type.toLowerCase()}`}>{evt.event_type}</span>
                </div>

                {evt.description && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{evt.description}</span>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--border-hairline)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Due: {evt.due_date || 'No Date'}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => setEditingEvent(evt)}
                    >
                      <Edit3 size={12} /> Edit Date
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '3px 6px' }}
                      onClick={() => handleDelete(evt.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Linked Planner Tasks Section */}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-hairline)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Linked Planner Tasks</span>
            </div>
            {linkedTasks.length === 0 ? (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No linked planner tasks for these events.</span>
            ) : (
              linkedTasks.map(t => (
                <div key={t.id} style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '6px 8px', backgroundColor: 'var(--bg-base)', borderRadius: '4px' }}>
                  • {t.title} ({t.estimated_hours}h)
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual Add Event Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Add Calendar Event</h3>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                className="input"
                placeholder="Event Title (e.g. DBMS Exam)"
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />
              <select
                className="input"
                value={newEvent.event_type}
                onChange={e => setNewEvent({ ...newEvent, event_type: e.target.value })}
              >
                <option value="Exam">Exam</option>
                <option value="Assignment">Assignment</option>
                <option value="Class">Class</option>
                <option value="Lab">Lab</option>
                <option value="Study">Study Session</option>
              </select>
              <input
                type="date"
                className="input"
                value={newEvent.due_date}
                onChange={e => setNewEvent({ ...newEvent, due_date: e.target.value })}
              />
              <textarea
                className="input"
                placeholder="Description / Topics covered"
                rows={3}
                value={newEvent.description}
                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event / Change Date Modal */}
      {editingEvent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card animate-fade-in" style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Edit Event / Change Date</h3>
            </div>
            <form onSubmit={handleSaveEditEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Event Title</label>
                <input
                  className="input"
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Event Type</label>
                  <select
                    className="input"
                    value={editingEvent.event_type}
                    onChange={e => setEditingEvent({ ...editingEvent, event_type: e.target.value })}
                  >
                    <option value="Exam">Exam</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Class">Class</option>
                    <option value="Lab">Lab</option>
                    <option value="Study">Study Session</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>Event Date</label>
                  <input
                    type="date"
                    className="input"
                    style={{ borderColor: 'var(--accent)' }}
                    value={editingEvent.due_date || ''}
                    onChange={e => setEditingEvent({ ...editingEvent, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={editingEvent.description || ''}
                  onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-hairline)' }}>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(editingEvent.id)}>
                  Delete Event
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setEditingEvent(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
