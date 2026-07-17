// /api/_utils/db.js
// Database connection helper using Vercel Postgres

let sql;
if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
  sql = require('@vercel/postgres').sql;
} else {
  sql = require('./sqlite-mock').sql;
}

/**
 * Ensures all five tables exist in the database.
 * Called before any read/write to guarantee schema is present.
 */
async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT NOT NULL DEFAULT '',
      github_url TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '/uday.jpg',
      resume_url TEXT NOT NULL DEFAULT '/Jyothi_Uday_Krishna_One_Page_Resume.pdf',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS experience (
      id SERIAL PRIMARY KEY,
      company TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      is_current BOOLEAN NOT NULL DEFAULT FALSE,
      bullets JSONB NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      tech JSONB NOT NULL DEFAULT '[]',
      thumbnail_url TEXT NOT NULL DEFAULT '/projects/placeholder.png',
      project_link TEXT,
      video_link TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL DEFAULT '',
      items JSONB NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS faq (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL DEFAULT '',
      answer TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS certifications (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      issuer TEXT NOT NULL DEFAULT '',
      issue_date TEXT NOT NULL DEFAULT '',
      credential_id TEXT NOT NULL DEFAULT '',
      credential_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS resume_files (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL DEFAULT '',
      file_data TEXT NOT NULL DEFAULT '',
      parsed_content TEXT NOT NULL DEFAULT '',
      version_label TEXT NOT NULL DEFAULT '1.0',
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;
}

/**
 * Checks if the profile table has a row with id = 1.
 * @returns {boolean}
 */
async function isSeeded() {
  const result = await sql`SELECT id FROM profile WHERE id = 1 LIMIT 1`;
  return result.rows.length > 0;
}

/**
 * Fetches all public content for the portfolio page.
 * @returns {object} Full content payload
 */
async function getAllContent() {
  const [profileRes, expRes, projRes, skillsRes, faqRes, certsRes, resumeRes] = await Promise.all([
    sql`SELECT * FROM profile WHERE id = 1`,
    sql`SELECT * FROM experience ORDER BY sort_order ASC`,
    sql`SELECT * FROM projects ORDER BY sort_order ASC`,
    sql`SELECT * FROM skills ORDER BY sort_order ASC`,
    sql`SELECT * FROM faq ORDER BY sort_order ASC`,
    sql`SELECT * FROM certifications ORDER BY sort_order ASC`,
    sql`SELECT * FROM resume_files WHERE is_active = TRUE ORDER BY id DESC LIMIT 1`,
  ]);

  return {
    profile: profileRes.rows[0] || null,
    experience: expRes.rows,
    projects: projRes.rows,
    skills: skillsRes.rows,
    faq: faqRes.rows,
    certifications: certsRes.rows,
    resume_file: resumeRes.rows[0] || null,
  };
}

module.exports = { sql, ensureSchema, isSeeded, getAllContent };
