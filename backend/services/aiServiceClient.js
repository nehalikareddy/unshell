import axios from 'axios';
import FormData from 'form-data';

function getAiServiceUrl() {
  return (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
}

/**
 * Calls the Python AI microservice with a Companies Registration Number.
 * This is a server-to-server call — no CORS needed, no browser involvement.
 *
 * @param {string} crn  - UK Companies House registration number
 * @returns {Promise<object>} Full investigation payload from the LangGraph pipeline
 */
export async function runInvestigationByAPI(crn) {
  const response = await axios.post(
    `${getAiServiceUrl()}/investigate`,
    { crn, mode: 'api' },
    { timeout: 150_000 } // 2.5 min — LangGraph pipelines can be slow
  );
  return response.data;
}

/**
 * Proxies a PDF document upload to the Python AI microservice.
 * Streams the multipart body so memory usage stays flat for large PDFs.
 *
 * @param {Buffer} fileBuffer   - Raw PDF bytes
 * @param {string} filename     - Original filename from the client
 * @returns {Promise<object>}   Full investigation payload
 */
export async function runInvestigationByDocument(fileBuffer, filename) {
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: filename || 'document.pdf',
    contentType: 'application/pdf',
  });

  const response = await axios.post(
    `${getAiServiceUrl()}/investigate/document`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 150_000,
    }
  );
  return response.data;
}

/**
 * Forwards a HITL (Human-in-the-Loop) resume request to the Python service.
 *
 * @param {string} threadId   - LangGraph thread ID to resume
 * @param {Buffer} fileBuffer - Trust deed / additional PDF
 * @param {string} filename   - Original filename
 */
export async function resumeInvestigation(threadId, fileBuffer, filename) {
  const form = new FormData();
  form.append('file', fileBuffer, {
    filename: filename || 'document.pdf',
    contentType: 'application/pdf',
  });

  const response = await axios.post(
    `${getAiServiceUrl()}/approve/${threadId}`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 60_000,
    }
  );
  return response.data;
}
