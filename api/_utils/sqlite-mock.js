// /api/_utils/sqlite-mock.js
// A lightweight fallback that simulates @vercel/postgres using node:sqlite.
// It intercepts raw SQL strings and converts PostgreSQL syntax to SQLite syntax.

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Store the SQLite file in the root of the portfolio directory
const dbPath = path.resolve(__dirname, '../../local.db');
const db = new DatabaseSync(dbPath);

/**
 * Translates common PostgreSQL-specific queries/terms to SQLite-compatible equivalents.
 */
function translateSql(queryStr) {
  let s = queryStr;
  
  // Replace PostgreSQL column types
  s = s.replace(/TIMESTAMPTZ/gi, 'TEXT');
  s = s.replace(/JSONB/gi, 'TEXT');
  s = s.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  
  // Replace NOW() function with SQLite equivalent
  s = s.replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP");
  
  // Replace ON CONFLICT DO NOTHING without conflict target, since SQLite requires target/brackets
  // For experience, projects, skills, faq we know id is the PK.
  s = s.replace(/ON CONFLICT DO NOTHING/gi, 'ON CONFLICT(id) DO NOTHING');
  
  return s;
}

/**
 * Automatically parses JSON columns that were stored as text strings in SQLite.
 */
function parseJsonColumns(row) {
  if (!row) return row;
  const parsedRow = { ...row };
  for (const key in parsedRow) {
    const val = parsedRow[key];
    if (typeof val === 'string') {
      if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
        try {
          parsedRow[key] = JSON.parse(val);
        } catch (e) {
          // Keep original string if parsing fails
        }
      }
    }
  }
  return parsedRow;
}

/**
 * Tagged template function mimicking Vercel's sql`` helper.
 */
async function sql(strings, ...values) {
  // Reconstruct SQL query using '?' placeholder for parameter binding
  const rawSql = strings.join('?');
  const translated = translateSql(rawSql);
  
  const isSelect = translated.trim().toUpperCase().startsWith('SELECT');
  
  try {
    const stmt = db.prepare(translated);
    if (isSelect) {
      const rows = stmt.all(...values);
      return {
        rows: rows.map(parseJsonColumns),
        rowCount: rows.length
      };
    } else {
      const info = stmt.run(...values);
      return {
        rows: [],
        rowCount: info.changes
      };
    }
  } catch (err) {
    console.error('[sqlite-mock Error] query:', rawSql, 'translated:', translated, 'values:', values, err);
    throw err;
  }
}

module.exports = { sql };
