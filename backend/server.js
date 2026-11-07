import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import investigateRoutes from './routes/investigate.js';
import authRoutes from './routes/auth.js';

dotenv.config();

// Connect to MongoDB Atlas
connectDB();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Dynamically reflects requesting origin (Vercel, localhost, etc.)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// Raw body passthrough is needed for multipart (document uploads).
// express.json() only applies to application/json requests.
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
// Mount on both /api and / to handle client configurations with or without /api suffix
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api', investigateRoutes);
app.use('/', investigateRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
const healthHandler = (_req, res) => {
  res.json({
    status: 'ok',
    service: 'unshell-express',
    version: '1.0.0',
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

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
