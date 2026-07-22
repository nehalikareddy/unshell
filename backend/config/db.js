import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas using the MONGO_URI env variable.
 * Logs success or error — the server continues even if Mongo is
 * unreachable (so you can develop without a live Atlas URI).
 */
export default async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri || uri === 'your_mongodb_atlas_uri_here') {
    console.warn(
      '⚠️  MONGO_URI not set — investigation history will not be persisted.\n' +
      '   Set MONGO_URI in backend/.env to enable MongoDB Atlas.\n'
    );
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('🗄️  MongoDB Atlas connected');
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    console.warn('   Continuing without database — history routes will return errors.\n');
  }
}
