import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import investigateRoutes from './routes/investigate.js';

dotenv.config();

// Connect to MongoDB Atlas
connectDB();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

// Raw body passthrough is needed for multipart (document uploads).
// express.json() only applies to application/json requests.
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', investigateRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'unshell-express',
    version: '1.0.0',
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Express Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅  Express running on http://localhost:${PORT}`);
  console.log(`    AI microservice → ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}\n`);
});
