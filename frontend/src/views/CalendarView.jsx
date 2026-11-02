import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, CheckSquare, Edit3, Trash2 } from 'lucide-react';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getTasks } from '../services/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDateKey = (year, monthZeroIndexed, day) => {
  const mm = String(monthZeroIndexed + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

const getEventColor = (eventType) => {
  switch (eventType?.toLowerCase()) {
    case 'exam':
      return 'var(--status-exam)';
    case 'assignment':
      return 'var(--status-assignment)';
    case 'class':
      return 'var(--status-class)';
    case 'lab':
      return '#06b6d4';
    case 'study':
    case 'study session':
      return 'var(--status-study)';
    default:
      return 'var(--accent)';
  }
};

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  });
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

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const todayStr = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
    setSelectedDate(todayStr);
  };

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // First day of current month (0: Sun, 1: Mon, ..., 6: Sat)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthCells = Array.from({ length: firstDayIndex }).map((_, i) => {
    const dayNum = daysInPrevMonth - firstDayIndex + 1 + i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dateStr = formatDateKey(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
    return {
      dayNum,
      dateStr,
      isCurrentMonth: false,
      year: prevDate.getFullYear(),
      month: prevDate.getMonth()
    };
  });

  const currentMonthCells = Array.from({ length: daysInMonth }).map((_, i) => {
    const dayNum = i + 1;
    const dateStr = formatDateKey(year, month, dayNum);
    return {
      dayNum,
      dateStr,
      isCurrentMonth: true,
      year,
      month
    };
  });

  const totalCellsSoFar = prevMonthCells.length + currentMonthCells.length;
  const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;

  const nextMonthCells = Array.from({ length: remainingCells }).map((_, i) => {
    const dayNum = i + 1;
    const nextDate = new Date(year, month + 1, dayNum);
    const dateStr = formatDateKey(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    return {
      dayNum,
      dateStr,
      isCurrentMonth: false,
      year: nextDate.getFullYear(),
      month: nextDate.getMonth()
    };
  });

  const calendarGrid = [...prevMonthCells, ...currentMonthCells, ...nextMonthCells];

  const todayStr = (() => {
    const now = new Date();
    return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  })();

  const dayEvents = events.filter(e => e.due_date === selectedDate || e.start_time?.startsWith(selectedDate));
  const linkedTasks = tasks.filter(t => dayEvents.some(e => e.id === t.calendar_event_id));

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 110px)' }} className="animate-fade-in">
      {/* Calendar Month Grid */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarIcon size={20} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '170px' }}>
                {MONTH_NAMES[month]} {year}
              </h2>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={handlePrevMonth}
                title="Previous Month"
                aria-label="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 500 }}
                onClick={handleToday}
                title="Jump to Current Month"
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={handleNextMonth}
                title="Next Month"
                aria-label="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setNewEvent(prev => ({ ...prev, due_date: selectedDate }));
              setShowAddModal(true);
            }}
          >
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

        {/* Month Grid View */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', flex: 1, gridAutoRows: '1fr' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: '4px' }}>
              {day}
            </div>
          ))}

          {calendarGrid.map(cell => {
            const isSelected = selectedDate === cell.dateStr;
            const isToday = cell.dateStr === todayStr;
            const dayEvts = events.filter(e => e.due_date === cell.dateStr || e.start_time?.startsWith(cell.dateStr));

            return (
              <div
                key={cell.dateStr}
                onClick={() => {
                  setSelectedDate(cell.dateStr);
                  if (!cell.isCurrentMonth) {
                    setCurrentDate(new Date(cell.year, cell.month, 1));
                  }
                }}
                style={{
                  backgroundColor: isSelected ? 'var(--bg-surface-raised)' : 'var(--bg-base)',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-hairline)',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '60px',
                  opacity: cell.isCurrentMonth ? 1 : 0.45,
                  transition: 'background-color 0.15s ease, border-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: isSelected || isToday ? 600 : 400,
                    color: isSelected ? 'var(--accent)' : isToday ? 'var(--accent)' : cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}>
                    {cell.dayNum}
                  </span>
                  {isToday && (
                    <span style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--accent)',
                      fontWeight: 600
                    }}>
                      Today
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {dayEvts.slice(0, 4).map((e, idx) => (
                    <span
                      key={idx}
                      title={`${e.event_type}: ${e.title}`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: getEventColor(e.event_type)
                      }}
                    />
                  ))}
                  {dayEvts.length > 4 && (
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: '6px' }}>
                      +{dayEvts.length - 4}
                    </span>
                  )}
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
