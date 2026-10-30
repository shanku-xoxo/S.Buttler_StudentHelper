import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, FileText, CheckCircle2 } from 'lucide-react';

export default function ConfirmationModal({ proposal, onClose, onConfirm }) {
  if (!proposal) return null;

  const [payload, setPayload] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (proposal && proposal.payload_json) {
      setPayload(proposal.payload_json);
    }
  }, [proposal]);

  const handleChange = (key, value) => {
    setPayload(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(proposal.id, true, payload);
      onClose();
    } catch (e) {
      alert('Confirmation failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onConfirm(proposal.id, false);
      onClose();
    } catch (e) {
      alert('Rejection failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFields = () => {
    if (proposal.action_type === 'ADD_CALENDAR_EVENT') {
      return (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Event Title</label>
            <input
              className="input"
              value={payload.title || ''}
              onChange={e => handleChange('title', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Event Type</label>
              <select
                className="input"
                value={payload.event_type || 'Exam'}
                onChange={e => handleChange('event_type', e.target.value)}
              >
                <option value="Exam">Exam</option>
                <option value="Assignment">Assignment</option>
                <option value="Class">Class</option>
                <option value="Lab">Lab</option>
                <option value="Study">Study Session</option>
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Due Date</label>
              <input
                type="date"
                className="input"
                value={payload.due_date || ''}
                onChange={e => handleChange('due_date', e.target.value)}
              />
            </div>
          </div>
        </>
      );
    }

    if (proposal.action_type === 'UPDATE_PROGRESS') {
      return (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completed Topic</label>
            <input
              className="input"
              value={payload.topic_name || ''}
              onChange={e => handleChange('topic_name', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Notes / Summary</label>
            <textarea
              className="input"
              rows={3}
              value={payload.notes || ''}
              onChange={e => handleChange('notes', e.target.value)}
            />
          </div>
        </>
      );
    }

    if (proposal.action_type === 'SAVE_NOTE') {
      return (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Note Topic</label>
            <input
              className="input"
              value={payload.topic || ''}
              onChange={e => handleChange('topic', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Note Preview</label>
            <textarea
              className="input"
              rows={4}
              value={payload.content_preview || ''}
              onChange={e => handleChange('content_preview', e.target.value)}
            />
          </div>
        </>
      );
    }

    return null;
  };

  const getIcon = () => {
    if (proposal.action_type === 'ADD_CALENDAR_EVENT') return <Calendar size={20} style={{ color: 'var(--accent)' }} />;
    if (proposal.action_type === 'UPDATE_PROGRESS') return <CheckCircle2 size={20} style={{ color: '#10B981' }} />;
    return <FileText size={20} style={{ color: '#8B5CF6' }} />;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {getIcon()}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Confirm AI Action Proposal
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Type: {proposal.action_type}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {renderFields()}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border-hairline)' }}>
          <button className="btn btn-outline" onClick={handleReject} disabled={loading}>
            Dismiss
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
            <Check size={16} />
            {loading ? 'Executing...' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
