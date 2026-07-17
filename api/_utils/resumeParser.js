// /api/_utils/resumeParser.js
// Parses a Markdown resume string into structured database payloads.

function parseResumeMarkdown(md) {
  const result = {
    profile: {},
    experience: [],
    projects: [],
    skills: [],
    certifications: []
  };

  const sections = md.split(/(?=^##\s+)/m);

  for (const sec of sections) {
    const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const titleLine = lines[0].toLowerCase();

    // 1. PERSONAL INFO
    if (titleLine.includes('personal info') || titleLine.includes('contact')) {
      for (const line of lines.slice(1)) {
        if (!line.startsWith('-')) continue;
        const clean = line.replace(/^-\s*/, '');
        const colonIdx = clean.indexOf(':');
        if (colonIdx === -1) continue;
        const key = clean.substring(0, colonIdx).trim().toLowerCase();
        const val = clean.substring(colonIdx + 1).trim();

        if (key.includes('name')) result.profile.name = val;
        else if (key.includes('title')) result.profile.title = val;
        else if (key.includes('location')) result.profile.location = val;
        else if (key.includes('email')) result.profile.email = val;
        else if (key.includes('linkedin')) result.profile.linkedin_url = val;
        else if (key.includes('github')) result.profile.github_url = val;
        else if (key.includes('bio')) result.profile.bio = val;
      }
    }

    // 2. EXPERIENCE
    else if (titleLine.includes('experience') || titleLine.includes('work history')) {
      let currentExp = null;
      for (const line of lines.slice(1)) {
        if (line.startsWith('**') || line.startsWith('###')) {
          // New experience item: **WIPRO | Senior Associate – Content Moderation | June 2024 to February 2026**
          const clean = line.replace(/^\*\*|^\#\#\#|\*\*$/g, '').trim();
          const parts = clean.split('|').map(p => p.trim());
          if (parts.length >= 2) {
            if (currentExp) result.experience.push(currentExp);
            const dateParts = (parts[2] || '').split(' to ').map(d => d.trim());
            const isCurrent = (dateParts[1] || '').toLowerCase().includes('present');
            currentExp = {
              company: parts[0],
              role: parts[1],
              start_date: dateParts[0] || '',
              end_date: isCurrent ? '' : (dateParts[1] || ''),
              is_current: isCurrent,
              bullets: [],
              sort_order: result.experience.length + 1
            };
          }
        } else if (line.startsWith('-') && currentExp) {
          currentExp.bullets.push(line.replace(/^-\s*/, '').trim());
        }
      }
      if (currentExp) result.experience.push(currentExp);
    }

    // 3. PROJECTS
    else if (titleLine.includes('projects') || titleLine.includes('things i have built')) {
      for (const line of lines.slice(1)) {
        if (!line.startsWith('**') && !line.startsWith('-')) continue;
        // **Project Title** | Summary | Tech: Py, JS | Link: url
        const clean = line.replace(/^\*\*|^\#\#\#|\*\*|^-/g, '').trim();
        const parts = clean.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          // Extract tech stack
          let tech = [];
          let link = '';
          const techPart = parts.find(p => p.toLowerCase().startsWith('tech:'));
          if (techPart) {
            tech = techPart.substring(5).split(',').map(t => t.trim());
          }
          const linkPart = parts.find(p => p.toLowerCase().startsWith('link:'));
          if (linkPart) {
            link = linkPart.substring(5).trim();
            if (link.toLowerCase() === 'not provided') link = '';
          }

          result.projects.push({
            title: parts[0],
            domain: parts[1] || 'AI Engineering',
            summary: parts[1] || '',
            details: parts[1] || '',
            tech: tech,
            project_link: link,
            sort_order: result.projects.length + 1
          });
        }
      }
    }

    // 4. SKILLS
    else if (titleLine.includes('skills')) {
      for (const line of lines.slice(1)) {
        if (!line.startsWith('-')) continue;
        // - Technical: Python, SQL, NLP
        const clean = line.replace(/^-\s*/, '');
        const colonIdx = clean.indexOf(':');
        if (colonIdx === -1) continue;
        const cat = clean.substring(0, colonIdx).trim();
        const items = clean.substring(colonIdx + 1).split(',').map(i => i.trim());
        result.skills.push({
          category: cat,
          items: items,
          sort_order: result.skills.length + 1
        });
      }
    }

    // 5. CERTIFICATIONS
    else if (titleLine.includes('certifications') || titleLine.includes('credentials')) {
      for (const line of lines.slice(1)) {
        if (!line.startsWith('-')) continue;
        // - Title | Issuer | Year | Credential ID | Credential URL
        const clean = line.replace(/^-\s*/, '');
        const parts = clean.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          result.certifications.push({
            title: parts[0],
            issuer: parts[1] || '',
            issue_date: parts[2] || '',
            credential_id: parts[3] || '',
            credential_url: parts[4] || '',
            sort_order: result.certifications.length + 1
          });
        }
      }
    }
  }

  return result;
}

module.exports = { parseResumeMarkdown };
