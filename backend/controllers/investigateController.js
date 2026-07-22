import {
  runInvestigationByAPI,
  runInvestigationByDocument,
  resumeInvestigation as resumeFromAI,
} from '../services/aiServiceClient.js';
import Investigation from '../models/Investigation.js';
import mongoose from 'mongoose';

// ── Helper: persist to MongoDB if connected ────────────────────────────────
async function saveInvestigation(crn, result, source = 'api') {
  if (mongoose.connection.readyState !== 1) return; // Skip if not connected

  try {
    await Investigation.create({
      crn,
      companyName:  result.graph?.nodes?.[0]?.label ?? null,
      riskScore:    result.risk_score   ?? null,
      riskLabel:    result.risk_label   ?? null,
      verdict:      result.verdict      ?? null,
      resolvedUbo:  result.resolved_ubo ?? null,
      sanctionsHit: result.sanctions_hit ?? false,
      isDeadEnd:    result.is_dead_end  ?? false,
      graph:        result.graph        ?? null,
      flags:        result.flags        ?? [],
      fatalFlags:   result.fatal_flags  ?? [],
      stats:        result.stats        ?? null,
      source,
    });
    console.log(`[Mongo] Saved investigation for CRN: ${crn}`);
  } catch (err) {
    // Non-fatal — investigation result still returned to client
    console.error('[Mongo] Failed to save investigation:', err.message);
  }
}

// ── POST /api/investigate  (CRN-based) ─────────────────────────────────────
export async function investigate(req, res) {
  const { crn } = req.body;

  if (!crn || typeof crn !== 'string' || !crn.trim()) {
    return res.status(400).json({ error: 'crn is required' });
  }

  const cleanCrn = crn.trim().toUpperCase();
  console.log(`\n[Express] Investigating CRN: ${cleanCrn}`);

  try {
    const result = await runInvestigationByAPI(cleanCrn);
    await saveInvestigation(cleanCrn, result, 'api');
    return res.json(result);
  } catch (err) {
    console.error('[Express] investigate error:', err.message);

    // Surface the Python service's error detail to the client
    const detail = err.response?.data?.detail ?? err.message;
    const status = err.response?.status ?? 500;
    return res.status(status).json({ error: detail });
  }
}

// ── POST /api/investigate/document  (PDF upload) ───────────────────────────
export async function investigateDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file attached' });
  }

  console.log(`\n[Express] Document investigation: ${req.file.originalname}`);

  try {
    const result = await runInvestigationByDocument(
      req.file.buffer,
      req.file.originalname
    );
    // Use resolved company name or filename as identifier when no CRN
    const crn = result.crn || req.file.originalname;
    await saveInvestigation(crn, result, 'document');
    return res.json(result);
  } catch (err) {
    console.error('[Express] investigateDocument error:', err.message);
    const detail = err.response?.data?.detail ?? err.message;
    const status = err.response?.status ?? 500;
    return res.status(status).json({ error: detail });
  }
}

// ── POST /api/approve/:threadId  (HITL resume) ─────────────────────────────
export async function approveHitl(req, res) {
  const { threadId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file attached' });
  }

  try {
    const result = await resumeFromAI(
      threadId,
      req.file.buffer,
      req.file.originalname
    );
    return res.json(result);
  } catch (err) {
    const status = err.response?.status ?? 500;
    const detail = err.response?.data?.detail ?? err.message;
    return res.status(status).json({ error: detail });
  }
}

// ── GET /api/history ───────────────────────────────────────────────────────
export async function getHistory(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const skip   = Math.max(parseInt(req.query.skip)   || 0,  0);

    const [investigations, total] = await Promise.all([
      Investigation.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-graph -stats'),  // Omit heavy fields in list view
      Investigation.countDocuments(),
    ]);

    return res.json({ total, skip, limit, investigations });
  } catch (err) {
    console.error('[Express] getHistory error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
}

// ── GET /api/history/:id ───────────────────────────────────────────────────
export async function getInvestigationById(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  try {
    const doc = await Investigation.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Investigation not found' });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch investigation' });
  }
}
