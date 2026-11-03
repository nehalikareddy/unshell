import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'unshell_forensic_jwt_secret_key_2026_secure';

/**
 * Protect routes: requires valid JWT bearer token.
 * Attaches authenticated user to req.user.
 */
export async function protect(req, res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. Please sign in to access this forensic endpoint.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'User belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware] Token error:', err.message);
    return res.status(401).json({
      error: 'Invalid or expired session token. Please sign in again.',
    });
  }
}

/**
 * Optional protection: attaches req.user if token is valid,
 * but allows unauthenticated access if no token is provided.
 */
export async function optionalProtect(req, _res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Non-fatal for optional
  }

  next();
}
