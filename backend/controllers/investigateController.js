import {
  runInvestigationByAPI,
  runInvestigationByDocument,
  resumeInvestigation as resumeFromAI,
} from '../services/aiServiceClient.js';
import Investigation from '../models/Investigation.js';
import mongoose from 'mongoose';

function normalizeCrn(rawCrn = '') {
  const cleaned = String(rawCrn).replace(/[\s-]+/g, '').toUpperCase();
  if (/^\d{1,7}$/.test(cleaned)) {
    return cleaned.padStart(8, '0');
  }
  return cleaned;
}

function extractAxiosError(err) {
  const data = err.response?.data;
  const detail =
    data?.detail?.error ??
    data?.detail ??
    data?.error ??
    err.message ??
    'Internal server error';
  const status = err.response?.status ?? 500;
  return {
    status,
    message: typeof detail === 'string' ? detail : JSON.stringify(detail),
  };
}

// ── Helper: persist to MongoDB if connected ────────────────────────────────
async function saveInvestigation(crn, result, source = 'api', userId = null, userEmail = null) {
  if (mongoose.connection.readyState !== 1) return; // Skip if not connected

  try {
    const doc = await Investigation.create({
      crn,
      companyName:       result.graph?.nodes?.[0]?.label ?? null,
      riskScore:         result.risk_score ?? null,
      riskLabel:         result.risk_label ?? null,
      verdict:           result.action_required ?? result.verdict ?? null,
      resolvedUbo:       result.resolved_ubo ?? null,
      sanctionsHit:      result.sanctions_hit ?? false,
      sanctionsDetail:   result.sanctions_detail ?? '',
      isDeadEnd:         result.is_dead_end ?? false,
      graph:             result.graph ?? null,
      flags:             result.cumulative_vectors ?? result.flags ?? [],
      cumulativeVectors: result.cumulative_vectors ?? [],
      fatalFlags:        result.fatal_flags ?? [],
      stats:             result.stats ?? null,
      source,
      userId:            userId || null,
      userEmail:         userEmail || null,
    });
    console.log(`[Mongo] Saved investigation for CRN: ${crn} (user: ${userEmail || 'anonymous'})`);
    return doc;
  } catch (err) {
    // Non-fatal — investigation result still returned to client
    console.error('[Mongo] Failed to save investigation:', err.message);
    return null;
  }
}

// ── POST /api/investigate  (CRN-based) ─────────────────────────────────────
export async function investigate(req, res) {
  const { crn } = req.body || {};

  if (!crn || typeof crn !== 'string' || !crn.trim()) {
    return res.status(400).json({ error: 'A valid UK CRN is required.' });
  }

  const cleanCrn = normalizeCrn(crn);
  const userId = req.user?._id ?? null;
  const userEmail = req.user?.email ?? null;
  console.log(`\n[Express] Investigating CRN: ${cleanCrn} for user: ${userEmail || 'anonymous'}`);

  try {
    const result = await runInvestigationByAPI(cleanCrn);
    const savedDoc = await saveInvestigation(cleanCrn, result, 'api', userId, userEmail);
    return res.json({
      ...result,
      saved_id: savedDoc?._id ?? null,
      saved_at: savedDoc?.createdAt ?? null,
    });
  } catch (err) {
    console.error('[Express] investigate error:', err.message);
    const { status, message } = extractAxiosError(err);
    return res.status(status).json({ error: message });
  }
}

// ── POST /api/investigate/document  (PDF upload) ───────────────────────────
export async function investigateDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file attached' });
  }

  const userId = req.user?._id ?? null;
  const userEmail = req.user?.email ?? null;
  console.log(`\n[Express] Document investigation: ${req.file.originalname} for user: ${userEmail || 'anonymous'}`);

  try {
    const result = await runInvestigationByDocument(
      req.file.buffer,
      req.file.originalname
    );
    const crn = result.crn || req.file.originalname;
    const savedDoc = await saveInvestigation(crn, result, 'document', userId, userEmail);
    return res.json({
      ...result,
      saved_id: savedDoc?._id ?? null,
      saved_at: savedDoc?.createdAt ?? null,
    });
  } catch (err) {
    console.error('[Express] investigateDocument error:', err.message);
    const { status, message } = extractAxiosError(err);
    return res.status(status).json({ error: message });
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
    const { status, message } = extractAxiosError(err);
    return res.status(status).json({ error: message });
  }
}

// ── GET /api/history ───────────────────────────────────────────────────────
// STRICT USER SCOPING: Users only see investigations they created!
export async function getHistory(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  if (!req.user?._id) {
    return res.status(401).json({ error: 'Authentication required to view your saved investigations.' });
  }

  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const skip   = Math.max(parseInt(req.query.skip)   || 0,  0);

    const filter = { userId: req.user._id };

    const [investigations, total] = await Promise.all([
      Investigation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-graph -stats'), // Omit heavy fields in list view
      Investigation.countDocuments(filter),
    ]);

    return res.json({ total, skip, limit, investigations });
  } catch (err) {
    console.error('[Express] getHistory error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch your investigation history' });
  }
}

// ── GET /api/history/:id ───────────────────────────────────────────────────
// STRICT USER SCOPING: Verifies that the investigation belongs to this user
export async function getInvestigationById(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  if (!req.user?._id) {
    return res.status(401).json({ error: 'Authentication required to access this investigation.' });
  }

  try {
    const doc = await Investigation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!doc) {
      return res.status(404).json({ error: 'Investigation record not found or access denied.' });
    }

    // Normalize MongoDB camelCase back to the snake_case schema expected by InvestigationView
    return res.json({
      ...doc,
      thread_id:          String(doc._id),
      risk_score:         doc.riskScore ?? 0,
      risk_label:         doc.riskLabel ?? 'MEDIUM_RISK',
      action_required:    doc.verdict ?? 'Human Review',
      resolved_ubo:       doc.resolvedUbo ?? 'Unknown',
      sanctions_hit:      doc.sanctionsHit ?? false,
      sanctions_detail:   doc.sanctionsDetail ?? '',
      is_dead_end:        doc.isDeadEnd ?? false,
      fatal_flags:        doc.fatalFlags ?? [],
      cumulative_vectors: doc.cumulativeVectors?.length ? doc.cumulativeVectors : (doc.flags ?? []),
      graph:              doc.graph ?? { nodes: [], edges: [] },
      stats:              doc.stats ?? {},
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch investigation' });
  }
}

// ── DELETE /api/history/:id ────────────────────────────────────────────────
// STRICT USER SCOPING: Allows user to delete their own saved investigation
export async function deleteInvestigation(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  if (!req.user?._id) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const doc = await Investigation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!doc) {
      return res.status(404).json({ error: 'Investigation record not found or already deleted.' });
    }

    return res.json({ success: true, message: 'Investigation record deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete investigation' });
  }
}
