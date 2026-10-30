import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, RefreshCw, Cpu, Plus, Check } from 'lucide-react';
import { getYears, createYear, getSemesters, createSemester, getSubjects, createSubject, getModules, createModule } from '../services/api';

export default function SettingsView() {
  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modules, setModules] = useState([]);

  const [yearName, setYearName] = useState('2025-2026');
  const [semName, setSemName] = useState('Semester 4');
  const [subjName, setSubjName] = useState('Database Management Systems');
  const [modName, setModName] = useState('Module 2 - Relational DBMS');

  const loadAll = async () => {
    try {
      const [y, s, sub, m] = await Promise.all([getYears(), getSemesters(), getSubjects(), getModules()]);
      setYears(y);
      setSemesters(s);
      setSubjects(sub);
      setModules(m);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateHierarchy = async (e) => {
    e.preventDefault();
    try {
      const yr = await createYear({ name: yearName });
      const sem = await createSemester({ name: semName, academic_year_id: yr.id });
      const sub = await createSubject({ name: subjName, semester_id: sem.id, code: 'CS301' });
      await createModule({ name: modName, subject_id: sub.id, code: 'MOD2' });

      alert('Academic Structure successfully configured!');
      loadAll();
    } catch (err) {
      alert('Setup failed: ' + err.message);
    }
  };

  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('sbutler_gemini_api_key') || '');
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    if (geminiApiKey.trim()) {
      localStorage.setItem('sbutler_gemini_api_key', geminiApiKey.trim());
    } else {
      localStorage.removeItem('sbutler_gemini_api_key');
    }
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>System Settings & AI Setup</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Configure your Gemini/LLM AI Chatbot engine, workspace structure, and database.</span>
      </div>

      {/* AI Chatbot Configuration */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--accent-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>AI Chatbot Engine (ChatGPT / Gemini Mode)</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Provide a free Gemini API key to enable 100% full LLM responses for all queries.</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px', borderRadius: '12px', backgroundColor: geminiApiKey ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', color: geminiApiKey ? '#4ade80' : '#fbbf24' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: geminiApiKey ? '#4ade80' : '#fbbf24' }}></span>
            {geminiApiKey ? 'Gemini AI Active' : 'Offline / Smart RAG Mode'}
          </div>
        </div>

        <form onSubmit={handleSaveApiKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Google Gemini API Key (Free)
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="password"
                className="input"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {keySaved ? <Check size={16} /> : null}
                {keySaved ? 'Saved!' : 'Save Key'}
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Don't have a key? Get a 100% free API key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                Google AI Studio
              </a>.
            </span>
          </div>
        </form>
      </div>

      {/* Quick Setup Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '10px' }}>
          <SettingsIcon size={18} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Create Academic Structure</h3>
        </div>

        <form onSubmit={handleCreateHierarchy} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Academic Year</label>
            <input className="input" value={yearName} onChange={e => setYearName(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Semester Name</label>
            <input className="input" value={semName} onChange={e => setSemName(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Subject Name</label>
            <input className="input" value={subjName} onChange={e => setSubjName(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Module / Category Name</label>
            <input className="input" value={modName} onChange={e => setModName(e.target.value)} required />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Save Academic Structure
            </button>
          </div>
        </form>
      </div>

      {/* Existing Structure Status */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Active Workspace Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '13px' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--bg-base)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Years</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{years.length}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'var(--bg-base)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Semesters</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{semesters.length}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'var(--bg-base)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Subjects</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{subjects.length}</div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'var(--bg-base)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Modules</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{modules.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
