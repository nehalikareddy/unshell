import express from 'express';
import multer from 'multer';
import {
  investigate,
  investigateDocument,
  approveHitl,
  getHistory,
  getInvestigationById,
} from '../controllers/investigateController.js';

const router = express.Router();

// multer: keep uploaded PDFs in memory (no disk writes needed — we stream
// them straight to the Python microservice)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB cap
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'), false);
    }
  },
});

// ── Investigation routes ────────────────────────────────────────────────────

// CRN-based investigation (main flow)
router.post('/investigate', investigate);

// PDF document upload flow
router.post('/investigate/document', upload.single('file'), investigateDocument);

// HITL (Human-in-the-Loop) resume — forwards to Python /approve/:threadId
router.post('/approve/:threadId', upload.single('file'), approveHitl);

// ── History routes ──────────────────────────────────────────────────────────

// List last N investigations (paginated)
router.get('/history', getHistory);

// Single investigation by MongoDB _id (includes full graph payload)
router.get('/history/:id', getInvestigationById);

export default router;
