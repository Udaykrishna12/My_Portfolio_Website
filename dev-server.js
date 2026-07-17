// dev-server.js
// A lightweight, zero-dependency development server that emulates Vercel Serverless Functions
// and serves static files.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 1. Load Environment Variables from .env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.slice(0, firstEquals).trim();
    const value = trimmed.slice(firstEquals + 1).trim();
    process.env[key] = value;
  });
  console.log('[DevServer] Environment variables loaded from .env');
} else {
  console.warn('[DevServer] Warning: .env file not found.');
}

const PORT = process.env.PORT || 3000;

// MIME type map for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};

// Map URL paths to backend handlers
const API_ROUTES = {
  '/api/profile': './api/profile.js',
  '/api/chat': './api/chat.js',
  '/api/admin/login': './api/admin/login.js',
  '/api/admin/logout': './api/admin/logout.js',
  '/api/admin/content': './api/admin/content.js',
  '/api/resume-download': './api/resume-download.js',
};

// URL rewrites matching vercel.json
const REWRITES = {
  '/admin': '/admin/index.html',
  '/admin/dashboard': '/admin/dashboard.html',
};

/**
 * Helper to parse cookies from header
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((item) => {
    const parts = item.split('=');
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  console.log(`[DevServer] ${req.method} ${pathname}`);

  // Apply URL rewrites (like /admin -> /admin/index.html)
  if (REWRITES[pathname]) {
    pathname = REWRITES[pathname];
  }

  // API ROUTING
  if (pathname.startsWith('/api/')) {
    const routeFile = API_ROUTES[pathname];
    if (!routeFile) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: `API route ${pathname} not found` }));
    }

    try {
      // Clear cache to allow hot reloading of endpoints
      const resolvedPath = require.resolve(routeFile);
      delete require.cache[resolvedPath];
      const handler = require(routeFile);

      // --- Vercel Request & Response Emulation ---
      req.query = parsedUrl.query;
      req.cookies = parseCookies(req.headers.cookie);

      // Read request body
      let bodyData = '';
      await new Promise((resolve) => {
        req.on('data', (chunk) => {
          bodyData += chunk;
        });
        req.on('end', () => {
          resolve();
        });
      });

      // Parse JSON body if present
      req.body = bodyData;
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        try {
          req.body = JSON.parse(bodyData);
        } catch (e) {
          // Keep raw string if parsing fails
        }
      }

      // Emulate res.status(), res.json(), res.send()
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };

      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
      };

      res.send = (data) => {
        if (Buffer.isBuffer(data)) {
          res.end(data);
        } else if (typeof data === 'object') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } else {
          res.end(data);
        }
        return res;
      };

      // Call Vercel handler function
      await handler(req, res);
    } catch (err) {
      console.error(`[DevServer Error] handler for ${pathname} crashed:`, err);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', details: err.message }));
      }
    }
    return;
  }

  // STATIC FILE ROUTING
  // Try to find the file in the public folder first (matching Vercel behavior), then fallback to root
  let filePath = path.join(__dirname, 'public', pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, pathname);
  }

  // If a directory is requested, look for index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    // 404 response
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`<h1>404 File Not Found</h1><p>Could not find: ${pathname}</p>`);
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`[DevServer] Server is running locally!`);
  console.log(`[DevServer] URL: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
