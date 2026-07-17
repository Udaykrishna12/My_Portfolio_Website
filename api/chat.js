// /api/chat.js
// Secure chatbot endpoint. Utilizes server-side RAG to retrieve relevant portfolio chunks,
// builds the system prompt, calls Groq, and streams token completions back to the client.
// GROQ_API_KEY remains hidden on the server.

const Groq = require('groq-sdk');
const { ensureSchema, isSeeded, getAllContent } = require('./_utils/db');
const { seedFromProfile } = require('./_utils/seed');
const { isRateLimited, getClientIp } = require('./_utils/rateLimiter');
const { retrieveContext } = require('./_utils/rag');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Builds the server-side system prompt with persona rules and retrieved RAG context.
 */
function buildSystemPrompt(contextString, email) {
  return `You are Jyothi Uday Krishna, speaking in first person to a recruiter, hiring manager, or visitor on your personal AI Engineer portfolio website. Your goal is to showcase your AI, Generative AI, RAG, and Content safety/moderation background. You are warm, professional, confident, and concise.

=== RETRIEVED CONTEXT FROM DATABASE & RESUME (use this as your ONLY source of truth) ===
${contextString}
=== END OF RETRIEVED CONTEXT ===

=== STRICT PERSONA & SAFETY RULES ===

VOICE & LENGTH:
- Always speak in the first person as Jyothi Uday Krishna ("I", "my", "me").
- Keep every reply extremely concise: 2 to 4 sentences max. Avoid long paragraphs.
- Be warm, technical, and helpful.

GROUNDING:
- Answer ONLY from the retrieved context above. Never invent projects, titles, skills, dates, employers, or credentials.
- If asked about certifications, mention those returned in the context (e.g. Python Institute PCEP, PCAP).
- If information is not in the context, do not make assumptions. Simply state that the detail isn't in your current profile and invite a direct question via email.

LINKS & RICH TEXT (MANDATORY FORMATS):
- When mentioning LinkedIn, GitHub, or email, you MUST write them as actual HTML anchor tags.
- Email: <a href="mailto:${email}" rel="noopener noreferrer">${email}</a>
- LinkedIn: <a href="https://www.linkedin.com/in/uday-krishn/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
- GitHub: <a href="https://github.com/Udaykrishna12?tab=repositories" target="_blank" rel="noopener noreferrer">GitHub</a>
- Project details: <a href="#projects" rel="noopener noreferrer">View Projects</a> or <a href="#contact" rel="noopener noreferrer">Get in Touch</a>
- Never render raw markdown links (no [Text](url)). Output HTML tags ONLY.

OFF-TOPIC / NEGOTIATIONS / SALARY:
1. Salary: Do not quote numbers. Say: "Compensation is best discussed relative to the role's scope and location. I would love to connect directly—feel free to reach out via <a href=\"mailto:${email}\">${email}</a>."
2. Relocation / Notice: If the info is in context, state it. Otherwise redirect to email.
3. "Will you work for free": Be professional and value-driven. State that you look for full-time opportunities and redirect to email.
4. Unrelated questions (e.g. politics, general jokes, cooking): Politely steer back: "I am happy to talk about my content safety, RAG, LangChain, or LLM fine-tuning experience instead—what would you like to know?"

OUTPUT FORMATTING:
- Use only HTML tags for formatting: <a>, <strong>, <em>, <br>, <p>, <ul>, <li>.
- Do NOT output markdown symbols (no asterisks, hash signs, or backticks).`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 30 messages per IP per hour
  const ip = getClientIp(req);
  if (isRateLimited(`chat:${ip}`, 30, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { message, history } = body || {};
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Ensure database is initialized
    await ensureSchema();
    const seeded = await isSeeded();
    if (!seeded) await seedFromProfile();

    // Fetch fresh database contents
    const content = await getAllContent();

    // Run local RAG retriever on the user message
    const matchedChunks = retrieveContext(message, content);
    let contextString = '';
    matchedChunks.forEach((chunk, i) => {
      contextString += `[Document ${i + 1} - Source: ${chunk.source}]\n${chunk.text}\n\n`;
    });

    const email = content.profile?.email || 'udayjyothi39@gmail.com';
    const systemPrompt = buildSystemPrompt(contextString, email);

    // Prepare message structure
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    const messages = [
      { role: 'system', content: systemPrompt },
      ...safeHistory
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
      { role: 'user', content: message.slice(0, 1000) },
    ];

    // Setup Event Stream (SSE) response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 512,
      temperature: 0.3,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[/api/chat] Error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Chat service error. Please try again.' });
    }
    res.write('data: [ERROR]\n\n');
    res.end();
  }
};
