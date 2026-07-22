const BASE = import.meta.env.VITE_API_BASE_URL;

export async function investigateByAPI(crn) {
  const res = await fetch(`${BASE}/investigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "api", crn })
  });
  if (!res.ok) {
    let detail = `Investigation failed (HTTP ${res.status}). Please try again.`;
    try {
      const body = await res.json();
      const raw = body?.detail?.error ?? body?.detail ?? body?.error ?? null;
      // Only show short, safe messages — never dump raw AI text into the modal
      if (raw && typeof raw === 'string' && raw.length < 300) {
        detail = raw;
      }
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}


export async function investigateByDocument(pdfFile) {
  const form = new FormData();
  form.append("file", pdfFile);
  form.append("mode", "document");
  const res = await fetch(`${BASE}/investigate`, {
    method: "POST",
    body: form  // NO Content-Type header — browser sets multipart automatically
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function resumeInvestigation(threadId, pdfFile) {
  const form = new FormData();
  form.append("file", pdfFile);
  const res = await fetch(`${BASE}/approve/${threadId}`, {
    method: "POST",
    body: form
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}

export async function fetchHistory(limit = 20) {
  const res = await fetch(`${BASE}/history?limit=${limit}`);
  if (!res.ok) throw new Error(`History error: ${res.status}`);
  return res.json();
}

export async function fetchInvestigationById(id) {
  const res = await fetch(`${BASE}/history/${id}`);
  if (!res.ok) throw new Error(`History error: ${res.status}`);
  return res.json();
}
