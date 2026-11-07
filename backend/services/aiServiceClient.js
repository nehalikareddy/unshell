import axios from 'axios';
import FormData from 'form-data';

function getAiServiceUrl() {
  return (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
}

/**
 * Executes a POST request with retry and exponential backoff for 429/502/503.
 * Prevents cold-start and Cloudflare/Render rate-limiting from failing investigations.
 */
async function postWithRetry(url, data, config = {}, maxRetries = 3, initialDelay = 1500) {
  let delay = initialDelay;
  const mergedHeaders = {
    'User-Agent': 'unshell-backend/1.0',
    ...(config.headers || {}),
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.post(url, data, {
        ...config,
        headers: mergedHeaders,
      });
    } catch (err) {
      const status = err.response?.status;
      const isTransient = status === 429 || status === 502 || status === 503;
      if (isTransient && attempt < maxRetries) {
        console.warn(`[AI Client] ${url} returned ${status}. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
        continue;
      }
      throw err;
    }
  }
}

/**
 * Calls the Python AI microservice with a Companies Registration Number.
 * This is a server-to-server call — no CORS needed, no browser involvement.
 *
 * @param {string} crn  - UK Companies House registration number
 * @returns {Promise<object>} Full investigation payload from the LangGraph pipeline
 */
export async function runInvestigationByAPI(crn) {
  const response = await postWithRetry(
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

  const response = await postWithRetry(
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

  const response = await postWithRetry(
    `${getAiServiceUrl()}/approve/${threadId}`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 60_000,
    }
  );
  return response.data;
}
