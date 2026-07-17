// /api/_utils/markdown-db.js
// Custom markdown-based database manager for reading and writing to profile.md

const fs = require('fs');
const path = require('path');

const MD_PATH = path.resolve(__dirname, '../../profile.md');

/**
 * Reads and parses profile.md into database structures.
 */
function readMarkdownDb() {
  if (!fs.existsSync(MD_PATH)) {
    throw new Error(`profile.md file not found at ${MD_PATH}`);
  }

  const content = fs.readFileSync(MD_PATH, 'utf8');
  const lines = content.split(/\r?\n/);

  const data = {
    profile: {
      id: 1,
      name: '',
      title: '',
      location: '',
      email: '',
      linkedin_url: '',
      github_url: '',
      bio: '',
      photo_url: 'uday.jpg',
      resume_url: 'Jyothi_Uday_Krishna_One_Page_Resume.pdf'
    },
    experience: [],
    projects: [],
    skills: [],
    certifications: [],
    faq: [],
    resume_file: {
      id: 1,
      filename: 'Jyothi_Uday_Krishna_One_Page_Resume.pdf',
      file_data: 'dGVzdF9wZGZfZGF0YQ==', // base64 dummy
      parsed_content: '',
      version_label: '1.0',
      is_active: 1
    }
  };

  let currentSection = '';
  let activeExperience = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect section headers
    if (line.startsWith('# ') && line.includes('- Profile')) {
      continue;
    }

    if (line.startsWith('## ')) {
      currentSection = line.slice(3).trim().toLowerCase();
      continue;
    }

    // Parse Personal Info
    if (currentSection === 'personal info') {
      if (line.startsWith('- ')) {
        const parts = line.slice(2).split(':');
        const key = parts[0].trim().toLowerCase();
        const value = parts.slice(1).join(':').trim();

        if (key === 'name') data.profile.name = value;
        else if (key === 'current title') data.profile.title = value;
        else if (key === 'location') data.profile.location = value;
        else if (key === 'email') data.profile.email = value;
        else if (key === 'linkedin') data.profile.linkedin_url = value;
        else if (key === 'github') data.profile.github_url = value;
        else if (key === 'bio') data.profile.bio = value;
        else if (key === 'photo url') data.profile.photo_url = value;
        else if (key === 'resume url') data.profile.resume_url = value;
      }
    }

    // Parse Experience
    else if (currentSection === 'experience') {
      if (line.startsWith('**')) {
        // Headers like: **WIPRO | Senior Associate – Content Moderation... | June 2024 to February 2026**
        const cleanHeader = line.replace(/^\*\*|\*\*$/g, '').trim();
        const parts = cleanHeader.split('|').map(s => s.trim());

        if (parts.length >= 3) {
          const company = parts[0];
          const role = parts[1];
          const dateRange = parts[2];

          // Split dates
          let startDate = dateRange;
          let endDate = 'Present';
          const splitWords = [' to ', ' - ', ' – '];
          for (const word of splitWords) {
            if (dateRange.includes(word)) {
              const dates = dateRange.split(word).map(s => s.trim());
              startDate = dates[0];
              endDate = dates[1];
              break;
            }
          }

          const isCurrent = endDate.toLowerCase().includes('present') || endDate.toLowerCase().includes('current') ? 1 : 0;

          activeExperience = {
            id: data.experience.length + 1,
            company,
            role,
            start_date: startDate,
            end_date: endDate,
            is_current: isCurrent,
            bullets: [],
            sort_order: data.experience.length + 1
          };
          data.experience.push(activeExperience);
        }
      } else if (line.startsWith('- ') && activeExperience) {
        activeExperience.bullets.push(line.slice(2).trim());
      }
    }

    // Parse Projects
    else if (currentSection === 'projects') {
      if (line.startsWith('**')) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 3) {
          const title = parts[0].replace(/^\*\*|\*\*$/g, '').trim();
          const summary = parts[1];
          
          let details = '';
          let tech = [];
          let thumbnail_url = 'projects/placeholder.png';
          let project_link = '';

          // Parse intermediate parts
          for (let j = 2; j < parts.length; j++) {
            const p = parts[j];
            if (p.startsWith('Tech:')) {
              tech = p.slice(5).split(',').map(s => s.trim());
            } else if (p.startsWith('Thumbnail:')) {
              thumbnail_url = p.slice(10).trim();
            } else if (p.startsWith('Link:')) {
              project_link = p.slice(5).trim();
              if (project_link === 'not provided') project_link = '';
            } else {
              details = p;
            }
          }

          data.projects.push({
            id: data.projects.length + 1,
            title,
            domain: 'AI & Software Engineering', // default domain representation
            summary,
            details,
            tech,
            thumbnail_url,
            project_link,
            video_link: null,
            sort_order: data.projects.length + 1
          });
        }
      }
    }

    // Parse Skills
    else if (currentSection === 'skills') {
      if (line.startsWith('- ')) {
        const parts = line.slice(2).split(':');
        if (parts.length >= 2) {
          const category = parts[0].trim();
          const items = parts.slice(1).join(':').split(',').map(s => s.trim());
          data.skills.push({
            id: data.skills.length + 1,
            category,
            items,
            sort_order: data.skills.length + 1
          });
        }
      }
    }

    // Parse Certifications
    else if (currentSection === 'certifications') {
      if (line.startsWith('- ')) {
        const parts = line.slice(2).split('|').map(s => s.trim());
        if (parts.length >= 2) {
          const title = parts[0];
          const issuer = parts[1];
          const date = parts[2] || '';
          const credId = parts[3] || '';
          const credUrl = parts[4] || '';
          data.certifications.push({
            id: data.certifications.length + 1,
            title,
            issuer,
            issue_date: date,
            credential_id: credId,
            credential_url: credUrl,
            sort_order: data.certifications.length + 1
          });
        }
      }
    }

    // Parse FAQ
    else if (currentSection === 'faq') {
      if (line.startsWith('Q:')) {
        data.faq.push({
          id: data.faq.length + 1,
          question: line.slice(2).trim(),
          answer: '',
          sort_order: data.faq.length + 1
        });
      } else if (line.startsWith('A:') && data.faq.length > 0) {
        data.faq[data.faq.length - 1].answer = line.slice(2).trim();
      }
    }
  }

  // Construct resume parsed content for RAG matching
  let resumeContent = `JYOTHI UDAY KRISHNA\n`;
  resumeContent += `Email: ${data.profile.email}\n`;
  resumeContent += `LinkedIn: ${data.profile.linkedin_url}\n`;
  resumeContent += `GitHub: ${data.profile.github_url}\n\n`;
  resumeContent += `PROFESSIONAL SUMMARY\n${data.profile.bio}\n\n`;
  
  resumeContent += `EXPERIENCE\n`;
  data.experience.forEach(exp => {
    resumeContent += `${exp.company} | ${exp.role} | ${exp.start_date} to ${exp.end_date}\n`;
    exp.bullets.forEach(bullet => {
      resumeContent += `- ${bullet}\n`;
    });
  });

  resumeContent += `\nEDUCATION & CERTIFICATIONS\n`;
  data.certifications.forEach(cert => {
    resumeContent += `- ${cert.issuer}: ${cert.title}\n`;
  });

  data.resume_file.parsed_content = resumeContent;

  return data;
}

/**
 * Serializes database structure back to profile.md.
 */
function writeMarkdownDb(data) {
  let md = `# ${data.profile.name || 'Jyothi Uday Krishna'} - Profile\n\n`;

  // 1. Personal Info
  md += `## Personal Info\n`;
  md += `- Name: ${data.profile.name || ''}\n`;
  md += `- Current Title: ${data.profile.title || ''}\n`;
  md += `- Location: ${data.profile.location || ''}\n`;
  md += `- Email: ${data.profile.email || ''}\n`;
  md += `- LinkedIn: ${data.profile.linkedin_url || ''}\n`;
  md += `- GitHub: ${data.profile.github_url || ''}\n`;
  md += `- Bio: ${data.profile.bio || ''}\n`;
  md += `- Photo URL: ${data.profile.photo_url || 'uday.jpg'}\n`;
  md += `- Resume URL: ${data.profile.resume_url || 'Jyothi_Uday_Krishna_One_Page_Resume.pdf'}\n\n`;

  // 2. Experience
  md += `## Experience\n\n`;
  data.experience.forEach(exp => {
    md += `**${exp.company} | ${exp.role} | ${exp.start_date} to ${exp.end_date}**\n`;
    if (Array.isArray(exp.bullets)) {
      exp.bullets.forEach(bullet => {
        md += `- ${bullet}\n`;
      });
    }
    md += `\n`;
  });

  // 3. Projects
  md += `## Projects\n\n`;
  data.projects.forEach(proj => {
    const techStr = Array.isArray(proj.tech) ? proj.tech.join(', ') : '';
    md += `**${proj.title}** | ${proj.summary} | ${proj.details || ''} | Tech: ${techStr} | Thumbnail: ${proj.thumbnail_url || 'projects/placeholder.png'} | Link: ${proj.project_link || 'not provided'}\n\n`;
  });

  // 4. Skills
  md += `## Skills\n`;
  data.skills.forEach(sk => {
    const itemsStr = Array.isArray(sk.items) ? sk.items.join(', ') : '';
    md += `- ${sk.category}: ${itemsStr}\n`;
  });
  md += `\n`;

  // 5. Certifications
  md += `## Certifications\n`;
  data.certifications.forEach(cert => {
    md += `- ${cert.title} | ${cert.issuer} | ${cert.issue_date} | ${cert.credential_id || ''} | ${cert.credential_url || ''}\n`;
  });
  md += `\n`;

  // 6. FAQ
  md += `## FAQ\n\n`;
  data.faq.forEach(f => {
    md += `Q: ${f.question}\n`;
    md += `A: ${f.answer}\n\n`;
  });

  // Safely write to file
  try {
    fs.writeFileSync(MD_PATH, md, 'utf8');
  } catch (err) {
    console.error(`[markdown-db Error] Could not write to profile.md:`, err);
  }
}

module.exports = { readMarkdownDb, writeMarkdownDb };
