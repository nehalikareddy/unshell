import mongoose from 'mongoose';

/**
 * Persists every completed investigation so users can browse history
 * and the developer can demonstrate database integration in interviews.
 *
 * The `graph` field stores the full React Flow node/edge payload as a
 * mixed object — no sub-schema needed since its shape varies by pipeline.
 */
const investigationSchema = new mongoose.Schema({
  crn: {
    type: String,
    required: true,
    index: true,
    uppercase: true,
    trim: true,
  },
  companyName: { type: String, default: null },   // e.g. "MONZO BANK LIMITED"
  riskScore:   { type: Number, default: null },
  riskLabel:   { type: String, default: null },   // e.g. "HIGH", "MEDIUM", "LOW"
  verdict:     { type: String, default: null },
  resolvedUbo: { type: String, default: null },
  sanctionsHit: { type: Boolean, default: false },
  isDeadEnd:   { type: Boolean, default: false },
  graph:       { type: mongoose.Schema.Types.Mixed, default: null },  // { nodes, edges }
  flags:       { type: [String], default: [] },
  fatalFlags:  { type: [String], default: [] },
  stats:       { type: mongoose.Schema.Types.Mixed, default: null },
  source:      { type: String, enum: ['api', 'document'], default: 'api' },
  createdAt:   { type: Date, default: Date.now },
});

export default mongoose.model('Investigation', investigationSchema);
