const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Normalizes a UK Company Registration Number (CRN):
 * - Strips spaces and hyphens
 * - Converts to uppercase
 * - Pads purely numeric CRNs (1–7 digits) with leading zeros to 8 digits
 */
export function normalizeCrn(rawCrn = '') {
  const cleaned = String(rawCrn).replace(/[\s-]+/g, '').toUpperCase();
  if (/^\d{1,7}$/.test(cleaned)) {
    return cleaned.padStart(8, '0');
  }
  return cleaned;
}

/**
 * Validates normalized UK CRNs:
 * - 8 digits (e.g. 09446231)
 * - 2 letters + 6 digits or 2 letters + 4 digits + 2 letters (e.g. SC123456, OC301234)
 * - 1 letter + 7 digits (e.g. R0123456)
 */
export const CRN_REGEX = /^(\d{8}|[A-Z]{2}[A-Z0-9]{6}|[A-Z]\d{7})$/i;

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

async function extractErrorMessage(res, fallbackMsg) {
  try {
    const body = await res.json();
    const raw =
      body?.error?.error ??
      body?.detail?.error ??
      body?.detail ??
      body?.error ??
      null;
    if (raw && typeof raw === 'string' && raw.length < 400) {
      return raw;
    }
    if (raw && typeof raw === 'object') {
      return JSON.stringify(raw).slice(0, 300);
    }
  } catch {
    // Ignore JSON parse error and use fallback
  }
  return fallbackMsg;
}

export async function investigateByAPI(crn) {
  const cleanCrn = normalizeCrn(crn);
  const maxAttempts = 2;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${BASE}/investigate`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify({ mode: 'api', crn: cleanCrn }),
      });

      if (!res.ok) {
        const isColdStart = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
        if (isColdStart && attempt < maxAttempts) {
          // Service waking up on free-tier Render; pause 4 seconds and retry once silently
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        const detail = await extractErrorMessage(
          res,
          `Investigation failed (HTTP ${res.status}). The service may be waking up—please try again in a moment.`
        );
        throw new Error(detail);
      }

      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts) throw lastErr;
    }
  }
  throw lastErr;
}

export async function investigateByDocument(pdfFile) {
  const form = new FormData();
  form.append('file', pdfFile);
  form.append('mode', 'document');

  const headers = getAuthHeaders(null);

  const res = await fetch(`${BASE}/investigate/document`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    const detail = await extractErrorMessage(
      res,
      `Document investigation failed (HTTP ${res.status}).`
    );
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
  if (!res.ok) {
    const detail = await extractErrorMessage(
      res,
      `Resume investigation failed (HTTP ${res.status}).`
    );
    throw new Error(detail);
  }
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`Health check error: ${res.status}`);
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
