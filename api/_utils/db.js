// /api/_utils/db.js
// Markdown Database interface mimicking the SQL connection layer.
// All queries resolve directly to profile.md instead of Postgres or SQLite.

const { readMarkdownDb, writeMarkdownDb } = require('./markdown-db');

// In-memory cache to accumulate inserts during bulk delete-insert operations
let memoryDb = null;

function getDb() {
  if (!memoryDb) {
    memoryDb = readMarkdownDb();
  }
  return memoryDb;
}

function saveDb() {
  if (memoryDb) {
    writeMarkdownDb(memoryDb);
  }
}

/**
 * Ensures schema check (noop for markdown-db).
 */
async function ensureSchema() {
  getDb(); // verify we can read/parse profile.md
}

/**
 * Checks if the profile has been loaded.
 */
async function isSeeded() {
  const db = getDb();
  return !!db.profile.name;
}

/**
 * Returns all public content parsed from profile.md.
 */
async function getAllContent() {
  const db = getDb();
  return {
    profile: db.profile,
    experience: db.experience,
    projects: db.projects,
    skills: db.skills,
    faq: db.faq,
    certifications: db.certifications,
    resume_file: db.resume_file
  };
}

/**
 * Mock SQL query parser mapping relational commands to markdown read/writes.
 */
async function sql(strings, ...values) {
  const query = strings.join('?').trim();
  const db = getDb();

  // --- READ QUERIES (SELECT) ---
  if (query.toUpperCase().startsWith('SELECT')) {
    const tableMatch = query.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1].toLowerCase() : '';

    if (table === 'profile') {
      return { rows: [db.profile], rowCount: 1 };
    }
    if (table === 'experience') {
      return { rows: db.experience, rowCount: db.experience.length };
    }
    if (table === 'projects') {
      return { rows: db.projects, rowCount: db.projects.length };
    }
    if (table === 'skills') {
      return { rows: db.skills, rowCount: db.skills.length };
    }
    if (table === 'faq') {
      return { rows: db.faq, rowCount: db.faq.length };
    }
    if (table === 'certifications') {
      return { rows: db.certifications, rowCount: db.certifications.length };
    }
    if (table === 'resume_files') {
      return { rows: [db.resume_file], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  // --- DELETE QUERIES (Wiping tables for save requests) ---
  if (query.toUpperCase().startsWith('DELETE FROM')) {
    const tableMatch = query.match(/DELETE\s+FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1].toLowerCase() : '';

    if (table === 'experience') db.experience = [];
    else if (table === 'projects') db.projects = [];
    else if (table === 'skills') db.skills = [];
    else if (table === 'faq') db.faq = [];
    else if (table === 'certifications') db.certifications = [];

    saveDb();
    return { rows: [], rowCount: 0 };
  }

  // --- UPDATE QUERIES (Profile or Resume status) ---
  if (query.toUpperCase().startsWith('UPDATE')) {
    if (query.toLowerCase().includes('update profile')) {
      // Binding: [name, title, location, email, linkedin, github, bio, photo, resume]
      db.profile.name = values[0];
      db.profile.title = values[1];
      db.profile.location = values[2];
      db.profile.email = values[3];
      db.profile.linkedin_url = values[4];
      db.profile.github_url = values[5];
      db.profile.bio = values[6];
      db.profile.photo_url = values[7];
      db.profile.resume_url = values[8];
    } else if (query.toLowerCase().includes('update resume_files')) {
      db.resume_file.is_active = 0;
    }

    saveDb();
    return { rows: [], rowCount: 0 };
  }

  // --- INSERT QUERIES ---
  if (query.toUpperCase().startsWith('INSERT INTO')) {
    const tableMatch = query.match(/INSERT\s+INTO\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1].toLowerCase() : '';

    if (table === 'experience') {
      // Binding: [company, role, start_date, end_date, is_current, bullets, sort_order]
      db.experience.push({
        id: db.experience.length + 1,
        company: values[0],
        role: values[1],
        start_date: values[2],
        end_date: values[3],
        is_current: values[4] ? 1 : 0,
        bullets: typeof values[5] === 'string' ? JSON.parse(values[5]) : values[5],
        sort_order: values[6]
      });
    }

    else if (table === 'projects') {
      // Binding: [title, domain, summary, details, tech, thumbnail, project_link, video_link, sort_order]
      db.projects.push({
        id: db.projects.length + 1,
        title: values[0],
        domain: values[1],
        summary: values[2],
        details: values[3],
        tech: typeof values[4] === 'string' ? JSON.parse(values[4]) : values[4],
        thumbnail_url: values[5] || 'projects/placeholder.png',
        project_link: values[6] || '',
        video_link: values[7] || null,
        sort_order: values[8]
      });
    }

    else if (table === 'skills') {
      // Binding: [category, items, sort_order]
      db.skills.push({
        id: db.skills.length + 1,
        category: values[0],
        items: typeof values[1] === 'string' ? JSON.parse(values[1]) : values[1],
        sort_order: values[2]
      });
    }

    else if (table === 'certifications') {
      // Binding: [title, issuer, issue_date, credential_id, credential_url, sort_order]
      db.certifications.push({
        id: db.certifications.length + 1,
        title: values[0],
        issuer: values[1],
        issue_date: values[2] || '',
        credential_id: values[3] || '',
        credential_url: values[4] || '',
        sort_order: values[5]
      });
    }

    else if (table === 'faq') {
      // Binding: [question, answer, sort_order]
      db.faq.push({
        id: db.faq.length + 1,
        question: values[0],
        answer: values[1],
        sort_order: values[2]
      });
    }

    else if (table === 'resume_files') {
      // Binding: [filename, file_data, parsed_content, version_label, is_active]
      db.resume_file = {
        id: 1,
        filename: values[0],
        file_data: values[1],
        parsed_content: values[2] || '',
        version_label: values[3] || '1.0',
        is_active: 1
      };
    }

    saveDb();
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = { sql, ensureSchema, isSeeded, getAllContent };
