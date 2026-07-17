// /api/_utils/rag.js
// Native JavaScript token-matching and term-relevance RAG retriever.
// Provides sub-millisecond keyword-matching and contextual chunk ranking.

function retrieveContext(query, content, topN = 6) {
  const chunks = [];

  // 1. Add Profile Bio
  if (content.profile) {
    chunks.push({
      source: 'Profile Bio',
      text: `Jyothi Uday Krishna is an AI Engineer. Current Title: ${content.profile.title}. Location: ${content.profile.location}. Bio: ${content.profile.bio}. Contact email: ${content.profile.email}. GitHub: ${content.profile.github_url}. LinkedIn: ${content.profile.linkedin_url}.`
    });
  }

  // 2. Add Work Experience
  if (content.experience) {
    content.experience.forEach(exp => {
      const bullets = Array.isArray(exp.bullets) ? exp.bullets : JSON.parse(exp.bullets || '[]');
      chunks.push({
        source: `Experience: ${exp.company}`,
        text: `Work experience at Wipro (company: ${exp.company}) as ${exp.role} from ${exp.start_date} to ${exp.end_date || 'Present'}. Key achievements: ${bullets.join('; ')}`
      });
    });
  }

  // 3. Add Projects
  if (content.projects) {
    content.projects.forEach(proj => {
      const tech = Array.isArray(proj.tech) ? proj.tech : JSON.parse(proj.tech || '[]');
      chunks.push({
        source: `Project: ${proj.title}`,
        text: `Project: ${proj.title} (Domain: ${proj.domain}). Summary: ${proj.summary}. Detailed implementation details: ${proj.details}. Tech stack: ${tech.join(', ')}.`
      });
    });
  }

  // 4. Add Skills
  if (content.skills) {
    content.skills.forEach(sk => {
      const items = Array.isArray(sk.items) ? sk.items : JSON.parse(sk.items || '[]');
      chunks.push({
        source: `Skills: ${sk.category}`,
        text: `Technical and professional skills under category "${sk.category}": ${items.join(', ')}.`
      });
    });
  }

  // 5. Add Certifications
  if (content.certifications) {
    content.certifications.forEach(cert => {
      chunks.push({
        source: `Certification: ${cert.title}`,
        text: `Certification: "${cert.title}" issued by "${cert.issuer}" in ${cert.issue_date}. Credential ID: ${cert.credential_id}. Verification Link: ${cert.credential_url}.`
      });
    });
  }

  // 6. Add FAQs
  if (content.faq) {
    content.faq.forEach(f => {
      chunks.push({
        source: `FAQ: ${f.question}`,
        text: `Q: ${f.question} A: ${f.answer}`
      });
    });
  }

  // 7. Add Uploaded Resume parsed paragraphs
  if (content.resume_file && content.resume_file.parsed_content) {
    const sections = content.resume_file.parsed_content.split(/\n{2,}/).filter(Boolean);
    sections.forEach((sectionText, idx) => {
      chunks.push({
        source: `Uploaded Resume Section ${idx + 1}`,
        text: `Resume Text Block: ${sectionText.trim()}`
      });
    });
  }

  // RAG Token Match Ranker
  const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  if (queryTokens.length === 0) {
    return chunks.slice(0, topN); // fallback to default
  }

  const scored = chunks.map(chunk => {
    const textLower = chunk.text.toLowerCase();
    const sourceLower = chunk.source.toLowerCase();
    let score = 0;

    queryTokens.forEach(token => {
      // Direct matches in text
      if (textLower.includes(token)) {
        score += 2;
        // Boost for whole-word boundary
        const regexWord = new RegExp(`\\b${token}\\b`, 'g');
        const matchesWord = textLower.match(regexWord);
        if (matchesWord) score += matchesWord.length * 3;
      }
      // Heavy boost if matched in title/source (e.g. searching for "Wipro" matches Experience: Wipro source)
      if (sourceLower.includes(token)) {
        score += 10;
      }
    });

    return { ...chunk, score };
  });

  // Sort by score descending and return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

module.exports = { retrieveContext };
