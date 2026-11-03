const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function getAuthHeaders(contentType = 'application/json') {
  const token = localStorage.getItem('unshell_token');
  const headers = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function investigateByAPI(crn) {
  const res = await fetch(`${BASE}/investigate`, {
    method: 'POST',
    headers: getAuthHeaders('application/json'),
    body: JSON.stringify({ mode: 'api', crn }),
  });
  if (!res.ok) {
    let detail = `Investigation failed (HTTP ${res.status}). Please try again.`;
    try {
      const body = await res.json();
      const raw = body?.detail?.error ?? body?.detail ?? body?.error ?? null;
      if (raw && typeof raw === 'string' && raw.length < 300) {
        detail = raw;
      }
    } catch (e) {
      void e;
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function investigateByDocument(pdfFile) {
  const form = new FormData();
  form.append('file', pdfFile);
  form.append('mode', 'document');

  // No Content-Type header so browser sets boundary multipart automatically
  const headers = getAuthHeaders(null);

  const res = await fetch(`${BASE}/investigate/document`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    let detail = `Document investigation failed (HTTP ${res.status}).`;
    try {
      const b = await res.json();
      if (b.error) detail = b.error;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function resumeInvestigation(threadId, pdfFile) {
  const form = new FormData();
  form.append('file', pdfFile);

  const headers = getAuthHeaders(null);

  const res = await fetch(`${BASE}/approve/${threadId}`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}

export async function fetchHistory(limit = 20) {
  const res = await fetch(`${BASE}/history?limit=${limit}`, {
    headers: getAuthHeaders(null),
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Please sign in to access your saved investigations.');
    }
    throw new Error(`History error: ${res.status}`);
  }
  return res.json();
}

export async function fetchInvestigationById(id) {
  const res = await fetch(`${BASE}/history/${id}`, {
    headers: getAuthHeaders(null),
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized. Sign in to view this record.');
    }
    if (res.status === 404) {
      throw new Error('Investigation record not found or access restricted.');
    }
    throw new Error(`History error: ${res.status}`);
  }
  return res.json();
}

export async function deleteInvestigationApi(id) {
  const res = await fetch(`${BASE}/history/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(null),
  });
  if (!res.ok) throw new Error(`Delete error: ${res.status}`);
  return res.json();
}
