const API_BASE = '/api';

export async function fetchJson(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let detail = 'API Request Failed';
    try {
      const errJson = JSON.parse(errorText);
      detail = errJson.detail || detail;
    } catch (e) {
      detail = errorText || detail;
    }
    throw new Error(detail);
  }

  return response.json();
}

// 1. System & Health
export const getHealth = () => fetchJson('/health');

// 2. Academic Hierarchy
export const getYears = () => fetchJson('/academic/years');
export const createYear = (data) => fetchJson('/academic/years', { method: 'POST', body: JSON.stringify(data) });

export const getSemesters = () => fetchJson('/academic/semesters');
export const createSemester = (data) => fetchJson('/academic/semesters', { method: 'POST', body: JSON.stringify(data) });

export const getSubjects = (semesterId) => fetchJson(`/academic/subjects${semesterId ? `?semester_id=${semesterId}` : ''}`);
export const createSubject = (data) => fetchJson('/academic/subjects', { method: 'POST', body: JSON.stringify(data) });

export const getModules = (subjectId) => fetchJson(`/academic/modules${subjectId ? `?subject_id=${subjectId}` : ''}`);
export const createModule = (data) => fetchJson('/academic/modules', { method: 'POST', body: JSON.stringify(data) });

// 3. Documents & Notes
export const uploadDocument = async (moduleId, file) => {
  const formData = new FormData();
  if (moduleId && moduleId !== 'null' && moduleId !== 'undefined') {
    formData.append('module_id', moduleId);
  }
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Document Upload Failed');
  return res.json();
};

export const searchDocuments = (query, moduleId) => 
  fetchJson(`/documents/search?query=${encodeURIComponent(query)}${moduleId ? `&module_id=${moduleId}` : ''}`);

export const getDefaultNotes = (moduleId) => fetchJson(`/documents/notes/default/${moduleId}`);

export const appendNote = async (noteId, content, topicHeader) => {
  const formData = new FormData();
  formData.append('content', content);
  if (topicHeader) formData.append('topic_header', topicHeader);

  const res = await fetch(`${API_BASE}/documents/notes/${noteId}/append`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Append Note Failed');
  return res.json();
};

export const getDocumentsList = (moduleId) => 
  fetchJson(`/documents/list${moduleId ? `?module_id=${moduleId}` : ''}`);

export const getDocumentDetails = (documentId) => 
  fetchJson(`/documents/${documentId}`);

export const deleteDocument = (documentId) => 
  fetchJson(`/documents/${documentId}`, { method: 'DELETE' });

export const getNotesList = (moduleId) => 
  fetchJson(`/documents/notes/list${moduleId ? `?module_id=${moduleId}` : ''}`);

// 4. AI Assistant
export const sendChatMessage = (data) => {
  const apiKey = localStorage.getItem('sbutler_gemini_api_key');
  const payload = apiKey ? { ...data, api_key: apiKey } : data;
  return fetchJson('/ai/chat', { method: 'POST', body: JSON.stringify(payload) });
};
export const confirmAction = (proposedActionId, confirm) => 
  fetchJson('/ai/confirm-action', { method: 'POST', body: JSON.stringify({ proposed_action_id: proposedActionId, confirm }) });
export const summarizeModule = (moduleId) => 
  fetchJson('/ai/summarize-module', { method: 'POST', body: JSON.stringify({ module_id: moduleId }) });

// 5. Calendar & Deadlines
export const getCalendarEvents = (subjectId, dateStr, monthStr) => {
  const params = new URLSearchParams();
  if (subjectId) params.append('subject_id', subjectId);
  if (dateStr) params.append('date_str', dateStr);
  if (monthStr) params.append('month_str', monthStr);
  return fetchJson(`/calendar/events?${params.toString()}`);
};
export const createCalendarEvent = (data) => fetchJson('/calendar/events', { method: 'POST', body: JSON.stringify(data) });
export const updateCalendarEvent = (id, data) => fetchJson(`/calendar/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCalendarEvent = (id) => fetchJson(`/calendar/events/${id}`, { method: 'DELETE' });

// 6. Todo & Dynamic Planner
export const getTasks = (subjectId, moduleId, horizon, status) => {
  const params = new URLSearchParams();
  if (subjectId) params.append('subject_id', subjectId);
  if (moduleId) params.append('module_id', moduleId);
  if (horizon) params.append('horizon', horizon);
  if (status) params.append('status', status);
  return fetchJson(`/tasks?${params.toString()}`);
};
export const createTask = (data) => fetchJson('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id, data) => fetchJson(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const getWorkloadSummary = (subjectId) => fetchJson(`/tasks/workload/summary${subjectId ? `?subject_id=${subjectId}` : ''}`);
export const redistributeWorkload = (data, subjectId) => 
  fetchJson(`/tasks/redistribute${subjectId ? `?subject_id=${subjectId}` : ''}`, { method: 'POST', body: JSON.stringify(data) });
