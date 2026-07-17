// /api/admin/login.js
// Admin login endpoint. Validates password, issues JWT in httpOnly cookie.
// Rate limited to 5 attempts per 15 minutes per IP.

const { signAdminToken, buildCookieHeader } = require('../_utils/auth');
const { isRateLimited, getClientIp } = require('../_utils/rateLimiter');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (isRateLimited(`login:${ip}`, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many login attempts. Please wait 15 minutes.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const { password } = body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = signAdminToken();
  res.setHeader('Set-Cookie', buildCookieHeader(token));
  return res.status(200).json({ success: true });
};
