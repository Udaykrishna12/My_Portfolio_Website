// /api/admin/content.js
// GET: Returns full editable content for the admin dashboard.
// PUT: Accepts content updates and writes them to the database.
// Both routes require a valid admin JWT cookie.

const { verifyAdmin } = require('../_utils/auth');
const { sql, ensureSchema, getAllContent } = require('../_utils/db');
const { parseResumeMarkdown } = require('../_utils/resumeParser');

module.exports = async function handler(req, res) {
  // Auth check for all methods
  try {
    verifyAdmin(req);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await ensureSchema();

  // GET: Return all content
  if (req.method === 'GET') {
    try {
      const content = await getAllContent();
      return res.status(200).json(content);
    } catch (err) {
      console.error('[admin/content GET]', err);
      return res.status(500).json({ error: 'Failed to fetch content' });
    }
  }

  // PUT: Update content
  if (req.method === 'PUT') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { section, data } = body || {};
    if (!section || !data) {
      return res.status(400).json({ error: 'section and data are required' });
    }

    try {
      switch (section) {
        case 'profile': {
          await sql`
            UPDATE profile SET
              name = ${data.name},
              title = ${data.title},
              location = ${data.location},
              email = ${data.email},
              linkedin_url = ${data.linkedin_url},
              github_url = ${data.github_url},
              bio = ${data.bio},
              photo_url = ${data.photo_url},
              resume_url = ${data.resume_url},
              updated_at = NOW()
            WHERE id = 1
          `;
          break;
        }

        case 'experience': {
          await sql`DELETE FROM experience`;
          for (let i = 0; i < data.length; i++) {
            const exp = data[i];
            await sql`
              INSERT INTO experience (company, role, start_date, end_date, is_current, bullets, sort_order)
              VALUES (
                ${exp.company},
                ${exp.role},
                ${exp.start_date},
                ${exp.end_date || ''},
                ${!!exp.is_current},
                ${JSON.stringify(exp.bullets || [])},
                ${i + 1}
              )
            `;
          }
          break;
        }

        case 'projects': {
          await sql`DELETE FROM projects`;
          for (let i = 0; i < data.length; i++) {
            const proj = data[i];
            await sql`
              INSERT INTO projects (title, domain, summary, details, tech, thumbnail_url, project_link, video_link, sort_order)
              VALUES (
                ${proj.title},
                ${proj.domain},
                ${proj.summary},
                ${proj.details || ''},
                ${JSON.stringify(proj.tech || [])},
                ${proj.thumbnail_url || 'projects/placeholder.png'},
                ${proj.project_link || null},
                ${proj.video_link || null},
                ${i + 1}
              )
            `;
          }
          break;
        }

        case 'skills': {
          await sql`DELETE FROM skills`;
          for (let i = 0; i < data.length; i++) {
            const sk = data[i];
            await sql`
              INSERT INTO skills (category, items, sort_order)
              VALUES (${sk.category}, ${JSON.stringify(sk.items || [])}, ${i + 1})
            `;
          }
          break;
        }

        case 'certifications': {
          await sql`DELETE FROM certifications`;
          for (let i = 0; i < data.length; i++) {
            const cert = data[i];
            await sql`
              INSERT INTO certifications (title, issuer, issue_date, credential_id, credential_url, sort_order)
              VALUES (
                ${cert.title},
                ${cert.issuer},
                ${cert.issue_date || ''},
                ${cert.credential_id || ''},
                ${cert.credential_url || ''},
                ${i + 1}
              )
            `;
          }
          break;
        }

        case 'faq': {
          await sql`DELETE FROM faq`;
          for (let i = 0; i < data.length; i++) {
            const f = data[i];
            await sql`
              INSERT INTO faq (question, answer, sort_order)
              VALUES (${f.question}, ${f.answer || ''}, ${i + 1})
            `;
          }
          break;
        }

        case 'resume': {
          // data contains: filename, file_data (base64 PDF), parsed_content (markdown/text), version_label
          const label = data.version_label || '1.0';
          
          // Disable any previous active resume files
          await sql`UPDATE resume_files SET is_active = FALSE`;
          
          // Insert new active resume record
          await sql`
            INSERT INTO resume_files (filename, file_data, parsed_content, version_label, is_active)
            VALUES (${data.filename}, ${data.file_data}, ${data.parsed_content || ''}, ${label}, TRUE)
          `;

          // If there is parsed content, run our automatic resume parser and sync all sections
          if (data.parsed_content && data.parsed_content.trim()) {
            const parsed = parseResumeMarkdown(data.parsed_content);

            // Sync Profile details
            if (parsed.profile.name || parsed.profile.title) {
              const currentProfileRes = await sql`SELECT * FROM profile WHERE id = 1`;
              const current = currentProfileRes.rows[0] || {};
              await sql`
                UPDATE profile SET
                  name = ${parsed.profile.name || current.name || ''},
                  title = ${parsed.profile.title || current.title || ''},
                  location = ${parsed.profile.location || current.location || ''},
                  email = ${parsed.profile.email || current.email || ''},
                  linkedin_url = ${parsed.profile.linkedin_url || current.linkedin_url || ''},
                  github_url = ${parsed.profile.github_url || current.github_url || ''},
                  bio = ${parsed.profile.bio || current.bio || ''},
                  updated_at = NOW()
                WHERE id = 1
              `;
            }

            // Sync Experience
            if (parsed.experience.length > 0) {
              await sql`DELETE FROM experience`;
              for (let i = 0; i < parsed.experience.length; i++) {
                const exp = parsed.experience[i];
                await sql`
                  INSERT INTO experience (company, role, start_date, end_date, is_current, bullets, sort_order)
                  VALUES (${exp.company}, ${exp.role}, ${exp.start_date}, ${exp.end_date}, ${exp.is_current}, ${JSON.stringify(exp.bullets)}, ${i + 1})
                `;
              }
            }

            // Sync Projects
            if (parsed.projects.length > 0) {
              await sql`DELETE FROM projects`;
              for (let i = 0; i < parsed.projects.length; i++) {
                const proj = parsed.projects[i];
                await sql`
                  INSERT INTO projects (title, domain, summary, details, tech, thumbnail_url, project_link, sort_order)
                  VALUES (${proj.title}, ${proj.domain}, ${proj.summary}, ${proj.details}, ${JSON.stringify(proj.tech)}, 'projects/placeholder.png', ${proj.project_link}, ${i + 1})
                `;
              }
            }

            // Sync Skills
            if (parsed.skills.length > 0) {
              await sql`DELETE FROM skills`;
              for (let i = 0; i < parsed.skills.length; i++) {
                const sk = parsed.skills[i];
                await sql`
                  INSERT INTO skills (category, items, sort_order)
                  VALUES (${sk.category}, ${JSON.stringify(sk.items)}, ${i + 1})
                `;
              }
            }

            // Sync Certifications
            if (parsed.certifications.length > 0) {
              await sql`DELETE FROM certifications`;
              for (let i = 0; i < parsed.certifications.length; i++) {
                const cert = parsed.certifications[i];
                await sql`
                  INSERT INTO certifications (title, issuer, issue_date, credential_id, credential_url, sort_order)
                  VALUES (${cert.title}, ${cert.issuer}, ${cert.issue_date}, ${cert.credential_id}, ${cert.credential_url}, ${i + 1})
                `;
              }
            }
          }
          break;
        }

        default:
          return res.status(400).json({ error: `Unknown section: ${section}` });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[admin/content PUT]', err);
      return res.status(500).json({ error: 'Failed to update content' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
