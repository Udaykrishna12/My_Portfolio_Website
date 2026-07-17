// /api/_utils/auth.js
// JWT authentication middleware helper

const jwt = require('jsonwebtoken');

/**
 * Parses cookies from the request header string.
 * @param {string} cookieHeader
 * @returns {object}
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((part) => {
    const [key, ...val] = part.split('=');
    cookies[key.trim()] = decodeURIComponent(val.join('=').trim());
  });
  return cookies;
}

/**
 * Verifies the admin JWT from the request cookies.
 * Returns the decoded payload on success, or throws on failure.
 * @param {object} req - Vercel/Node request object
 * @returns {object} decoded JWT payload
 */
function verifyAdmin(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies['admin_token'];
  if (!token) throw new Error('No token');
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Generates a signed JWT for an admin session (24h expiry).
 * @returns {string}
 */
function signAdminToken() {
  return jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Builds the Set-Cookie header string for the admin JWT.
 * @param {string} token
 * @returns {string}
 */
function buildCookieHeader(token) {
  return `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`;
}

/**
 * Builds a cookie header to clear the admin session.
 * @returns {string}
 */
function clearCookieHeader() {
  return `admin_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

module.exports = { verifyAdmin, signAdminToken, buildCookieHeader, clearCookieHeader };
