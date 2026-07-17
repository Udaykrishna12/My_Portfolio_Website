// /api/admin/logout.js
// Clears the admin session cookie.

const { verifyAdmin, clearCookieHeader } = require('../_utils/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    verifyAdmin(req); // Must be logged in to log out
  } catch {
    // Even if token is invalid/missing, clear the cookie anyway
  }

  res.setHeader('Set-Cookie', clearCookieHeader());
  return res.status(200).json({ success: true });
};
