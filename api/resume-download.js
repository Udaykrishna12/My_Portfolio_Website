// /api/resume-download.js
// Serves the active resume PDF binary from the database.
// Fallback: redirects to the static fallback resume.

const { sql, ensureSchema } = require('./_utils/db');

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const result = await sql`
      SELECT filename, file_data 
      FROM resume_files 
      WHERE is_active = TRUE 
      ORDER BY id DESC 
      LIMIT 1
    `;

    if (result.rows.length > 0 && result.rows[0].file_data) {
      const file = result.rows[0];
      const binaryData = Buffer.from(file.file_data, 'base64');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename || 'resume.pdf'}"`);
      res.setHeader('Content-Length', binaryData.length);
      return res.status(200).send(binaryData);
    }
  } catch (err) {
    console.error('[/api/resume-download] Error retrieving resume:', err);
  }

  // Fallback redirect
  res.writeHead(302, { Location: '/Jyothi_Uday_Krishna_One_Page_Resume.pdf' });
  res.end();
};
