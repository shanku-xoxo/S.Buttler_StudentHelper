import React, { useState, useEffect } from 'react';
import { FileText, Upload, Search, Sparkles, Folder, Plus, Save, BookOpen, Trash2, Eye, X, File, FileCode, CheckCircle } from 'lucide-react';
import {
  getSemesters, getSubjects, getModules,
  uploadDocument, searchDocuments, getDefaultNotes,
  appendNote, summarizeModule, getDocumentsList,
  getDocumentDetails, deleteDocument
} from '../services/api';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function NotesView() {
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);

  const [notes, setNotes] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'notes_editor'

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [appendHeader, setAppendHeader] = useState('');
  const [appendContent, setAppendContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    async function loadTree() {
      try {
        const sems = await getSemesters();
        setSemesters(sems);
        const subjs = await getSubjects();
        setSubjects(subjs);
        const mods = await getModules();
        setModules(mods);

        if (mods.length > 0) {
          setSelectedModule(mods[0]);
        }
      } catch (e) {
        console.error('Failed to load academic tree:', e);
      }
    }
    loadTree();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      loadNotesForModule(selectedModule.id);
      loadUploadedDocs(selectedModule.id);
    }
  }, [selectedModule]);

  const loadNotesForModule = async (modId) => {
    try {
      const defaultNote = await getDefaultNotes(modId);
      setNotes(defaultNote);
    } catch (e) {
      console.error('Failed to load default notes:', e);
    }
  };

  const loadUploadedDocs = async (modId) => {
    try {
      const docs = await getDocumentsList(modId);
      setUploadedDocs(docs);
    } catch (e) {
      console.error('Failed to load uploaded documents:', e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedModule) return;

    setUploading(true);
    try {
      await uploadDocument(selectedModule.id, file);
      alert(`Document '${file.name}' successfully uploaded and indexed!`);
      loadNotesForModule(selectedModule.id);
      loadUploadedDocs(selectedModule.id);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId, docTitle) => {
    if (!window.confirm(`Are you sure you want to delete '${docTitle}'?`)) return;
    try {
      await deleteDocument(docId);
      if (selectedModule) loadUploadedDocs(selectedModule.id);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePreviewDocument = async (docId) => {
    try {
      const details = await getDocumentDetails(docId);
      setPreviewDoc(details);
    } catch (err) {
      alert('Failed to load document text: ' + err.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchDocuments(searchQuery, selectedModule?.id);
      setSearchResults(results);
    } catch (err) {
      alert('Search failed: ' + err.message);
    }
  };

  const handleAppend = async (e) => {
    e.preventDefault();
    if (!appendContent.trim() || !notes) return;

    try {
      const updated = await appendNote(notes.id, appendContent, appendHeader);
      setNotes(updated);
      setAppendContent('');
      setAppendHeader('');
      alert('Note content appended successfully!');
    } catch (err) {
      alert('Append failed: ' + err.message);
    }
  };

  const handleSummarize = async () => {
    if (!selectedModule) return;
    setSummarizing(true);
    try {
      const res = await summarizeModule(selectedModule.id);
      alert(`Whole-Module Summary generated for '${res.module_name}' and appended to notes.txt!`);
      loadNotesForModule(selectedModule.id);
    } catch (err) {
      alert('Module summary failed: ' + err.message);
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 110px)' }} className="animate-fade-in">
      {/* Left Tree Panel */}
      <div className="card" style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '10px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Academic Material Tree</h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {modules.map((mod) => {
            const isSelected = selectedModule?.id === mod.id;
            return (
              <div
                key={mod.id}
                onClick={() => setSelectedModule(mod)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: isSelected ? 'var(--bg-surface-raised)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  fontSize: '13px'
                }}
              >
                <Folder size={16} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        {/* Module Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedModule ? selectedModule.name : 'Select a Module'}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Notes & Document Manager</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={handleSummarize} disabled={summarizing || !selectedModule}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              {summarizing ? 'Generating Summary...' : 'Summarize Module'}
            </button>

            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload Document'}
              <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.txt,.docx,.pptx" />
            </label>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '8px' }}>
          <button
            className="btn"
            onClick={() => setActiveTab('documents')}
            style={{
              backgroundColor: activeTab === 'documents' ? 'var(--bg-surface-raised)' : 'transparent',
              color: activeTab === 'documents' ? 'var(--accent)' : 'var(--text-secondary)',
              border: activeTab === 'documents' ? '1px solid var(--accent)' : '1px solid transparent',
              fontSize: '13px'
            }}
          >
            <FileText size={16} /> Uploaded Documents ({uploadedDocs.length})
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('notes_editor')}
            style={{
              backgroundColor: activeTab === 'notes_editor' ? 'var(--bg-surface-raised)' : 'transparent',
              color: activeTab === 'notes_editor' ? 'var(--accent)' : 'var(--text-secondary)',
              border: activeTab === 'notes_editor' ? '1px solid var(--accent)' : '1px solid transparent',
              fontSize: '13px'
            }}
          >
            <BookOpen size={16} /> Module Notes File ({notes?.file_name || 'notes.txt'})
          </button>
        </div>

        {/* Keyword Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: '34px' }}
              placeholder="Search keyword in uploaded module documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-outline">Search</button>
        </form>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', backgroundColor: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>Search Results ({searchResults.length}):</span>
            {searchResults.map((r, i) => (
              <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                • <strong>{r.title}</strong>: "{r.snippet}"
              </div>
            ))}
          </div>
        )}

        {/* TAB 1: UPLOADED DOCUMENTS EXPLORER */}
        {activeTab === 'documents' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {uploadedDocs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', backgroundColor: 'var(--bg-base)', borderRadius: '8px', border: '1px dashed var(--border-hairline)', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Upload size={32} style={{ marginBottom: '10px', color: 'var(--accent)' }} />
                <div>No uploaded documents in this module yet.</div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click 'Upload Document' above to add PDFs, Word, PowerPoint, or Text notes!</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {uploadedDocs.map((doc) => (
                  <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-hairline)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={doc.title}>
                          {doc.title}
                        </span>
                      </div>
                      <span className="badge" style={{ fontSize: '10px', textTransform: 'uppercase', backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>
                        {doc.file_type}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Size: {formatBytes(doc.file_size)}</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', borderTop: '1px solid var(--border-hairline)', paddingTop: '10px' }}>
                      <button
                        className="btn btn-outline"
                        style={{ flex: 1, fontSize: '12px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        onClick={() => handlePreviewDocument(doc.id)}
                      >
                        <Eye size={14} /> Preview Text
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', fontSize: '12px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleDeleteDocument(doc.id, doc.title)}
                        title="Delete Document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEFAULT NOTES EDITOR & VIEWER */}
        {activeTab === 'notes_editor' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Module Notes File ({notes?.file_name || 'notes.txt'})
              </h3>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: 'var(--bg-base)',
              borderRadius: '6px',
              border: '1px solid var(--border-hairline)',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap',
              minHeight: '180px',
              maxHeight: '300px',
              overflowY: 'auto',
              color: 'var(--text-primary)'
            }}>
              {notes?.content || '=== MODULE NOTES ===\n\nNo notes appended yet.'}
            </div>

            {/* Append Note Form */}
            <form onSubmit={handleAppend} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <input
                className="input"
                placeholder="Topic Heading (optional)"
                value={appendHeader}
                onChange={e => setAppendHeader(e.target.value)}
              />
              <textarea
                className="input"
                rows={3}
                placeholder="Type notes or formulas to append to notes.txt..."
                value={appendContent}
                onChange={e => setAppendContent(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={!appendContent.trim()}>
                  <Save size={16} /> Append to Notes
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '700px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: 'var(--accent)' }} />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{previewDoc.title}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Type: {previewDoc.file_type.toUpperCase()} | Size: {formatBytes(previewDoc.file_size)} | Uploaded: {new Date(previewDoc.uploaded_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <button className="btn btn-outline" style={{ padding: '4px' }} onClick={() => setPreviewDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              backgroundColor: 'var(--bg-base)',
              borderRadius: '6px',
              border: '1px solid var(--border-hairline)',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)',
              lineHeight: '1.6'
            }}>
              {previewDoc.extracted_text || 'No text extracted from document.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-hairline)', paddingTop: '12px' }}>
              <button className="btn btn-primary" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
