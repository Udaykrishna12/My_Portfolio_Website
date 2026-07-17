// /api/profile.js
// Public endpoint: returns all portfolio content.
// Triggers auto-seed from profile.md data if the database is empty.

const { ensureSchema, isSeeded, getAllContent } = require('./_utils/db');
const { seedFromProfile } = require('./_utils/seed');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure tables exist (idempotent)
    await ensureSchema();

    // Auto-seed if this is the first deploy and database is empty
    const seeded = await isSeeded();
    if (!seeded) {
      await seedFromProfile();
    }

    const content = await getAllContent();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(content);
  } catch (err) {
    console.error('[/api/profile] Error:', err);
    return res.status(500).json({ error: 'Failed to load profile content' });
  }
};
