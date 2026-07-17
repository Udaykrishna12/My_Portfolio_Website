// /api/_utils/rateLimiter.js
// Simple in-memory rate limiter for Vercel serverless functions.
// Note: This is per-instance. For production multi-instance rate limiting,
// use Vercel KV. For this portfolio site with low traffic, in-memory is sufficient.

const store = new Map();

/**
 * Checks if a given key (e.g. IP address) is rate limited.
 * @param {string} key       - Unique identifier (IP + route)
 * @param {number} maxHits   - Maximum allowed hits in the window
 * @param {number} windowMs  - Time window in milliseconds
 * @returns {boolean}        - true if rate limited, false if allowed
 */
function isRateLimited(key, maxHits, windowMs) {
  // Relax rate limiting for local development and test runs
  if (process.env.NODE_ENV !== 'production') {
    maxHits = 100;
  }
  const now = Date.now();
  const entry = store.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    store.set(key, entry);
    return false;
  }

  if (entry.count >= maxHits) {
    return true;
  }

  entry.count += 1;
  store.set(key, entry);
  return false;
}

/**
 * Gets the client IP from the request, respecting Vercel's x-forwarded-for.
 * @param {object} req
 * @returns {string}
 */
function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

module.exports = { isRateLimited, getClientIp };
