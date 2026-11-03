import express from 'express';
import multer from 'multer';
import {
  investigate,
  investigateDocument,
  approveHitl,
  getHistory,
  getInvestigationById,
  deleteInvestigation,
} from '../controllers/investigateController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

// multer: keep uploaded PDFs in memory (stream straight to Python microservice)
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

// CRN-based investigation (attaches user if authenticated to scope saved result)
router.post('/investigate', optionalProtect, investigate);

// PDF document upload flow
router.post('/investigate/document', optionalProtect, upload.single('file'), investigateDocument);

// HITL (Human-in-the-Loop) resume — forwards to Python /approve/:threadId
router.post('/approve/:threadId', optionalProtect, upload.single('file'), approveHitl);

// ── History routes (Strictly protected & scoped to the authenticated user) ──

// List investigations for current user (paginated)
router.get('/history', protect, getHistory);

// Single investigation by MongoDB _id (verified to belong to current user)
router.get('/history/:id', protect, getInvestigationById);

// Delete an investigation belonging to the current user
router.delete('/history/:id', protect, deleteInvestigation);

export default router;
