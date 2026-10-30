import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, User, Paperclip, Sparkles, Calendar,
  FileText, Check, X, Upload, Folder, Search, Eye,
  AlertCircle, File, ChevronRight, BookOpen, Trash2,
  FileCode, Loader2
} from 'lucide-react';
import {
  sendChatMessage, confirmAction, getModules,
  uploadDocument, getDocumentsList, getDocumentDetails
} from '../services/api';
import FormattedMessage from '../components/common/FormattedMessage';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileTypeColor(type) {
  const t = (type || '').toLowerCase();
  if (t === 'pdf') return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' };
  if (t === 'docx' || t === 'doc') return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' };
  if (t === 'pptx' || t === 'ppt') return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
  return { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF', border: 'rgba(107, 114, 128, 0.3)' };
}

export default function AIAssistantView({ onOpenConfirmation }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      content: 'Hello! I am S.Butler, your AI academic assistant. You can ask me questions, attach or upload documents (PDF, DOCX, TXT, PPTX), request summaries, notes, or report your academic progress.',
      sources: []
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');

  // Document attachment states
  const [attachedDocs, setAttachedDocs] = useState([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Library Picker Modal state
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryDocs, setLibraryDocs] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  // Document Preview Modal state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    async function loadData() {
      try {
        const mods = await getModules();
        setModules(mods);
      } catch (e) {
        console.error('Failed to load modules:', e);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load documents for Library Modal
  const openLibraryModal = async () => {
    setShowLibraryModal(true);
    setLoadingLibrary(true);
    try {
      const docs = await getDocumentsList(selectedModuleId || undefined);
      setLibraryDocs(docs);
    } catch (e) {
      console.error('Failed to fetch documents for library:', e);
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Upload document directly
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setIsUploadingDoc(true);
      setUploadStatusText(`Uploading & parsing "${file.name}"...`);

      try {
        const doc = await uploadDocument(selectedModuleId || null, file);
        setAttachedDocs(prev => {
          if (prev.some(d => d.id === doc.id)) return prev;
          return [...prev, doc];
        });
      } catch (err) {
        alert(`Failed to upload ${file.name}: ` + err.message);
      } finally {
        setIsUploadingDoc(false);
        setUploadStatusText('');
      }
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUploadFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDraggingOver(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleUploadFiles(files);
    }
  };

  const toggleAttachFromLibrary = (doc) => {
    setAttachedDocs(prev => {
      const exists = prev.some(d => d.id === doc.id);
      if (exists) {
        return prev.filter(d => d.id !== doc.id);
      } else {
        return [...prev, doc];
      }
    });
  };

  const removeAttachedDoc = (docId) => {
    setAttachedDocs(prev => prev.filter(d => d.id !== docId));
  };

  const openDocumentPreview = async (docIdOrTitle) => {
    setLoadingPreview(true);
    setPreviewDoc({ title: 'Loading preview...' });
    try {
      let doc = null;
      if (typeof docIdOrTitle === 'number') {
        doc = await getDocumentDetails(docIdOrTitle);
      } else {
        // Find in attachedDocs or libraryDocs by title
        const match = [...attachedDocs, ...libraryDocs].find(d => d.title === docIdOrTitle);
        if (match) {
          doc = await getDocumentDetails(match.id);
        } else {
          doc = { title: docIdOrTitle, extracted_text: 'Preview not available for this source directly.' };
        }
      }
      setPreviewDoc(doc);
    } catch (e) {
      setPreviewDoc({ title: 'Error', extracted_text: 'Failed to load document text: ' + e.message });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async (e, customPrompt) => {
    e?.preventDefault();
    const promptToSend = customPrompt || inputMessage;
    if ((!promptToSend.trim() && attachedDocs.length === 0) || loading || isUploadingDoc) return;

    const userText = promptToSend.trim() || (attachedDocs.length > 0 ? `Analyze attached document: ${attachedDocs.map(d => d.title).join(', ')}` : '');
    setInputMessage('');

    const currentAttached = [...attachedDocs];
    const newMsg = {
      id: Date.now(),
      sender: 'user',
      content: userText,
      attachedDocs: currentAttached
    };
    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const docIds = currentAttached.map(d => d.id);
      const res = await sendChatMessage({
        conversation_id: conversationId,
        message: userText,
        module_id: selectedModuleId ? parseInt(selectedModuleId) : undefined,
        document_id: docIds[0] || undefined,
        document_ids: docIds.length > 0 ? docIds : undefined
      });

      if (!conversationId && res.conversation_id) {
        setConversationId(res.conversation_id);
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        content: res.message,
        sources: res.retrieved_context_sources || [],
        proposals: res.proposed_actions || [],
        documentId: res.document_id,
        documentTitle: res.document_title,
        documentType: res.document_type
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'assistant',
        content: 'Error: Failed to connect to AI Service. ' + err.message
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered documents for library picker modal
  const filteredLibraryDocs = libraryDocs.filter(d =>
    d.title.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
    (d.file_type && d.file_type.toLowerCase().includes(librarySearchQuery.toLowerCase()))
  );

  return (
    <div
      style={{ display: 'flex', height: 'calc(100vh - 110px)', gap: '20px', position: 'relative' }}
      className="animate-fade-in"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        accept=".pdf,.docx,.doc,.txt,.pptx,.ppt"
        multiple
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          backdropFilter: 'blur(4px)',
          border: '2px dashed var(--accent)',
          borderRadius: '8px',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: 'var(--text-primary)',
          pointerEvents: 'none'
        }}>
          <Upload size={48} style={{ color: 'var(--accent)', animation: 'bounce 1s infinite' }} />
          <span style={{ fontSize: '18px', fontWeight: 600 }}>Drop your documents here</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>PDF, DOCX, TXT, or PPTX will be uploaded and attached to the chat</span>
        </div>
      )}

      {/* Main Chat Thread Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '8px',
        border: '1px solid var(--border-hairline)',
        overflow: 'hidden'
      }}>

        {/* Chat Thread Header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Bot size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                S.Butler AI Assistant
                <span className="badge" style={{ fontSize: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                  Online
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Academic RAG & Document Grounding
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Quick Upload / Attach Button in Header */}
            <button
              className="btn btn-outline"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => fileInputRef.current?.click()}
              title="Upload document to attach to chat"
            >
              <Upload size={14} />
              <span>Upload Doc</span>
            </button>

            <button
              className="btn btn-outline"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={openLibraryModal}
              title="Select from existing uploaded course materials"
            >
              <BookOpen size={14} />
              <span>Library Docs</span>
            </button>

            {modules.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Module:</span>
                <select
                  className="input"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                  value={selectedModuleId}
                  onChange={e => setSelectedModuleId(e.target.value)}
                >
                  <option value="">All / General Knowledge</option>
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{
              display: 'flex',
              gap: '12px',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: msg.sender === 'user' ? '80%' : '90%'
            }}>
              {msg.sender === 'assistant' && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Bot size={16} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {/* User's Attached Documents Cards in Message */}
                {msg.sender === 'user' && msg.attachedDocs && msg.attachedDocs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                    {msg.attachedDocs.map(doc => {
                      const colors = getFileTypeColor(doc.file_type);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => openDocumentPreview(doc.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            backgroundColor: 'var(--bg-surface)',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                          title="Click to preview extracted content"
                        >
                          <span style={{
                            padding: '2px 5px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: colors.bg,
                            color: colors.text,
                            textTransform: 'uppercase'
                          }}>
                            {doc.file_type || 'DOC'}
                          </span>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.title}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {formatBytes(doc.file_size)}
                          </span>
                          <Eye size={12} style={{ color: 'var(--text-secondary)', marginLeft: '4px' }} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Message Content Bubble */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: msg.sender === 'user' ? 'var(--bg-surface-raised)' : 'var(--bg-base)',
                  border: '1px solid var(--border-hairline)',
                  borderLeft: msg.sender === 'assistant' ? '3px solid var(--accent)' : undefined,
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  lineHeight: '1.6'
                }}>
                  <FormattedMessage text={msg.content} />
                </div>

                {/* RAG Document Context Sources in Assistant Message */}
                {msg.sender === 'assistant' && ((msg.sources && msg.sources.length > 0) || msg.documentTitle) && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={12} style={{ color: 'var(--accent)' }} />
                      Document Grounding:
                    </span>
                    {/* Primary Document if present */}
                    {msg.documentTitle && (
                      <button
                        onClick={() => openDocumentPreview(msg.documentId || msg.documentTitle)}
                        className="badge"
                        style={{
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          backgroundColor: 'var(--accent-subtle)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={11} />
                        {msg.documentTitle}
                        <Eye size={10} style={{ marginLeft: '2px' }} />
                      </button>
                    )}
                    {/* Other Sources */}
                    {msg.sources && msg.sources.filter(s => s !== msg.documentTitle).map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => openDocumentPreview(src)}
                        className="badge"
                        style={{
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 6px',
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={10} />
                        {src}
                      </button>
                    ))}
                  </div>
                )}

                {/* Proposed Action Chips */}
                {msg.proposals && msg.proposals.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>Proposed Actions (Confirmation Required):</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {msg.proposals.map((prop) => (
                        <button
                          key={prop.id}
                          className="btn btn-outline"
                          style={{ borderColor: 'var(--accent)', color: 'var(--accent)', fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => onOpenConfirmation(prop)}
                        >
                          <Sparkles size={14} />
                          {prop.action_type === 'ADD_CALENDAR_EVENT' && 'Add to Calendar'}
                          {prop.action_type === 'UPDATE_PROGRESS' && 'Update Progress'}
                          {prop.action_type === 'SAVE_NOTE' && 'Save as Note'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Bot size={16} className="animate-spin" />
              S.Butler is analyzing document context and synthesizing response...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Uploading File Banner Indicator */}
        {isUploadingDoc && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderTop: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: 'var(--accent)'
          }}>
            <Loader2 size={14} className="animate-spin" />
            <span>{uploadStatusText}</span>
          </div>
        )}

        {/* Attached Documents Bar (Above Input) */}
        {attachedDocs.length > 0 && (
          <div style={{
            padding: '10px 16px 4px 16px',
            backgroundColor: 'var(--bg-surface-raised)',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileText size={12} style={{ color: 'var(--accent)' }} />
                Attached Documents ({attachedDocs.length}):
              </span>
              <button
                type="button"
                onClick={() => setAttachedDocs([])}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--status-exam)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Clear all
              </button>
            </div>

            {/* Document Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {attachedDocs.map(doc => {
                const colors = getFileTypeColor(doc.file_type);
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 10px',
                      backgroundColor: 'var(--bg-surface)',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  >
                    <span style={{
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      textTransform: 'uppercase'
                    }}>
                      {doc.file_type || 'DOC'}
                    </span>
                    <span
                      onClick={() => openDocumentPreview(doc.id)}
                      style={{
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                      title="Click to preview extracted content"
                    >
                      {doc.title}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {formatBytes(doc.file_size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachedDoc(doc.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--status-exam)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      title="Detach document"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Chips based on attached document */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Suggestions:</span>
              <button
                type="button"
                className="badge"
                style={{ fontSize: '10px', cursor: 'pointer', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
                onClick={() => handleSend(null, "Please provide a comprehensive summary of this document, outlining main topics and takeaways.")}
              >
                ⚡ Summarize document
              </button>
              <button
                type="button"
                className="badge"
                style={{ fontSize: '10px', cursor: 'pointer', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
                onClick={() => handleSend(null, "What are the core formulas, definitions, and key points in this document?")}
              >
                ⚡ Key formulas & definitions
              </button>
              <button
                type="button"
                className="badge"
                style={{ fontSize: '10px', cursor: 'pointer', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)' }}
                onClick={() => handleSend(null, "Create concise exam revision study notes from this document.")}
              >
                ⚡ Generate revision notes
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            backgroundColor: 'var(--bg-base)'
          }}
        >
          {/* Attach / Upload Document Button */}
          <button
            type="button"
            className="btn btn-outline"
            style={{
              padding: '8px 10px',
              color: attachedDocs.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
              borderColor: attachedDocs.length > 0 ? 'var(--accent)' : 'var(--border-subtle)',
              backgroundColor: attachedDocs.length > 0 ? 'var(--accent-subtle)' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => fileInputRef.current?.click()}
            title="Attach file from computer (PDF, DOCX, TXT, PPTX)"
            disabled={loading || isUploadingDoc}
          >
            <Paperclip size={16} />
            <span style={{ fontSize: '12px', display: 'none' }}>Attach</span>
          </button>

          {/* Library Picker Button */}
          <button
            type="button"
            className="btn btn-outline"
            style={{
              padding: '8px 10px',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-subtle)'
            }}
            onClick={openLibraryModal}
            title="Attach from uploaded course materials library"
            disabled={loading || isUploadingDoc}
          >
            <Folder size={16} />
          </button>

          <input
            className="input"
            placeholder={
              attachedDocs.length > 0
                ? `Ask question about ${attachedDocs.map(d => d.title).join(', ')}...`
                : "Ask academic question, attach notes/doc, or report exam dates..."
            }
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            disabled={loading || isUploadingDoc}
            style={{ flex: 1, padding: '10px 14px' }}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || isUploadingDoc || (!inputMessage.trim() && attachedDocs.length === 0)}
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. Saved Documents Library Modal                             */}
      {/* ------------------------------------------------------------- */}
      {showLibraryModal && (
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
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Folder size={20} style={{ color: 'var(--accent)' }} />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Attach from Saved Documents
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Select course materials or upload a new file to chat with
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Upload Bar inside Modal */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-hairline)',
              display: 'flex',
              gap: '10px'
            }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  placeholder="Search uploaded documents..."
                  value={librarySearchQuery}
                  onChange={e => setLibrarySearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', width: '100%' }}
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                <span>Upload New</span>
              </button>
            </div>

            {/* Document List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loadingLibrary ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  Loading your saved documents...
                </div>
              ) : filteredLibraryDocs.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <FileText size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                  <p>No documents found.</p>
                  <p style={{ fontSize: '11px', marginTop: '4px' }}>Click "Upload New" above to add your first lecture note, PDF, or slides.</p>
                </div>
              ) : (
                filteredLibraryDocs.map(doc => {
                  const colors = getFileTypeColor(doc.file_type);
                  const isAttached = attachedDocs.some(d => d.id === doc.id);
                  return (
                    <div
                      key={doc.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: isAttached ? 'var(--accent-subtle)' : 'var(--bg-base)',
                        border: isAttached ? '1px solid var(--accent)' : '1px solid var(--border-hairline)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: colors.bg,
                          color: colors.text,
                          textTransform: 'uppercase',
                          flexShrink: 0
                        }}>
                          {doc.file_type || 'DOC'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {formatBytes(doc.file_size)} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => openDocumentPreview(doc.id)}
                          title="Preview text"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          className={isAttached ? 'btn btn-primary' : 'btn btn-outline'}
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            backgroundColor: isAttached ? 'var(--accent)' : undefined,
                            color: isAttached ? '#fff' : 'var(--text-primary)'
                          }}
                          onClick={() => toggleAttachFromLibrary(doc)}
                        >
                          {isAttached ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={12} /> Attached
                            </span>
                          ) : (
                            'Attach'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-base)'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {attachedDocs.length} document{attachedDocs.length === 1 ? '' : 's'} currently attached
              </span>
              <button
                className="btn btn-primary"
                onClick={() => setShowLibraryModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Document Preview Modal                                    */}
      {/* ------------------------------------------------------------- */}
      {previewDoc && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: 'var(--accent)' }} />
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {previewDoc.title}
                  </h3>
                  {previewDoc.file_size && (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {previewDoc.file_type?.toUpperCase()} • {formatBytes(previewDoc.file_size)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: 'var(--bg-base)' }}>
              {loadingPreview ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  Extracting document preview...
                </div>
              ) : (
                <div style={{
                  fontSize: '12px',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)'
                }}>
                  {previewDoc.extracted_text || 'No text extracted from this document.'}
                </div>
              )}
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)'
            }}>
              <button
                className="btn btn-outline"
                onClick={() => setPreviewDoc(null)}
              >
                Close
              </button>
              {previewDoc.id && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (!attachedDocs.some(d => d.id === previewDoc.id)) {
                      setAttachedDocs(prev => [...prev, previewDoc]);
                    }
                    setPreviewDoc(null);
                  }}
                >
                  {attachedDocs.some(d => d.id === previewDoc.id) ? 'Already Attached' : 'Attach to Chat'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
