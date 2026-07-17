// /api/_utils/seed.js
// Seeds the database tables idempotently with Uday's AI Engineer profile and certifications.

const { sql } = require('./db');

/**
 * Seeds all database tables from the hardcoded profile content.
 * Called only when the profile table has no row with id = 1.
 */
async function seedFromProfile() {
  console.log('[seed] Seeding database with AI Engineer profile data...');

  // --- PROFILE ---
  await sql`DELETE FROM profile`;
  await sql`
    INSERT INTO profile (id, name, title, location, email, linkedin_url, github_url, bio, photo_url, resume_url)
    VALUES (
      1,
      'Jyothi Uday Krishna',
      'AI Engineer | Generative AI & RAG Specialist',
      'Hyderabad, India',
      'udayjyothi39@gmail.com',
      'https://www.linkedin.com/in/uday-krishn/',
      'https://github.com/Udaykrishna12?tab=repositories',
      'I am an AI Engineer specializing in Generative AI, Retrieval-Augmented Generation (RAG), and Large Language Model (LLM) customization. I build production-grade intelligent systems combining LLMs/SLMs with agentic workflows (LangChain, LangGraph) and vector databases. With an operations background at Wipro moderating Google Ads content, I bring a unique values-driven perspective to AI safety, alignment, and LLM guardrail engineering.',
      'uday.jpg',
      'Jyothi_Uday_Krishna_One_Page_Resume.pdf'
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // --- EXPERIENCE ---
  // Clean first to prevent duplicates on manual re-runs
  await sql`DELETE FROM experience`;
  await sql`
    INSERT INTO experience (id, company, role, start_date, end_date, is_current, bullets, sort_order)
    VALUES
    (
      1,
      'WIPRO',
      'Senior Associate – Content Moderation (Trust & Safety / Google Ads)',
      'June 2024',
      'February 2026',
      FALSE,
      ${JSON.stringify([
        'Reviewed and moderated high volumes of Google Ads content to ensure strict compliance with advertiser policy and brand safety standards.',
        'Detected complex policy evasions, impersonations, and coordinate abuse across accounts using data-driven indicators.',
        'Maintained quality scores above 99% under tight operational deadlines and fast-paced policy changes.',
        'Collaborated with operations and policy teams to document edge cases, improving review processes and standard operating procedures.'
      ])},
      1
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // --- PROJECTS ---
  await sql`DELETE FROM projects`;
  await sql`
    INSERT INTO projects (id, title, domain, summary, details, tech, thumbnail_url, project_link, video_link, sort_order)
    VALUES
    (
      1,
      'Clarity Bot: Production-Grade AI Agent Orchestrator',
      'Cognitive AI & Agentic Workflows',
      'An advanced conversational assistant orchestrating cognitive RAG and policy enforcement, fully optimized for Streamlit Cloud deployment.',
      'Clarity Bot is an enterprise-grade AI chatbot platform built using Streamlit, LangChain, and Groq. It implements conversational memory, structured RAG pipelines for document semantic intelligence, and strict server-side policy guardrails to enforce safety, security, and response reliability.',
      ${JSON.stringify(['Python', 'Streamlit', 'LangChain', 'Groq SDK', 'RAG', 'Vector Embeddings'])},
      'projects/clarity_bot.svg',
      'https://github.com/Udaykrishna12?tab=repositories',
      NULL,
      1
    ),
    (
      2,
      'Domain-Adaptive Continued Pre-training of Causal LLMs',
      'Artificial Intelligence / LLMs',
      'Fine-tuned causal language models using domain-adaptive continued pre-training (DACP) on specialized corpora using parameter-efficient fine-tuning (PEFT/LoRA).',
      'This project implements domain-adaptive continued pre-training (DACP) on technical domains using the Unsloth library and PEFT/LoRA. It customizes llama/mistral models to technical vocabularies and datasets, optimizing sequence lengths, prompt tokens, and validation perplexity. Achieved 40% memory reductions during custom pre-training steps.',
      ${JSON.stringify(['Python', 'PyTorch', 'Hugging Face', 'Unsloth', 'LoRA', 'Transformers'])},
      'projects/llm_pretraining.svg',
      'https://github.com/Udaykrishna12?tab=repositories',
      NULL,
      2
    ),
    (
      3,
      'End-to-End Retrieval-Augmented Generation (RAG) System',
      'Generative AI / RAG',
      'Built a robust document search and retrieval pipeline utilizing advanced embedding models, vector databases, and LangChain.',
      'An end-to-end RAG system designed to load, chunk, embed, and search policy documents. Uses LangChain, Hugging Face models, vector stores, and custom semantic chunking. Implements evaluation routines for grounding, checking response relevance, and mitigating hallucinations.',
      ${JSON.stringify(['Python', 'LangChain', 'SQL', 'Hugging Face', 'Vector Databases', 'PyPDFLoader'])},
      'projects/rag_system.svg',
      'https://github.com/Udaykrishna12?tab=repositories',
      NULL,
      3
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // --- SKILLS ---
  await sql`DELETE FROM skills`;
  await sql`
    INSERT INTO skills (id, category, items, sort_order)
    VALUES
    (
      1,
      'Programming',
      ${JSON.stringify(['Python', 'JavaScript', 'TypeScript', 'Node.js', 'FastAPI', 'SQL', 'HTML5/CSS3'])},
      1
    ),
    (
      2,
      'Artificial Intelligence (AI)',
      ${JSON.stringify(['Generative AI', 'Large Language Models (LLMs)', 'Retrieval-Augmented Generation (RAG)', 'Vector Databases (Chroma/FAISS)', 'LangChain / LangGraph', 'Agentic AI', 'Model Fine-tuning (LoRA/PEFT)', 'PyTorch', 'Hugging Face'])},
      2
    ),
    (
      3,
      'Cloud & DevOps',
      ${JSON.stringify(['Azure', 'REST APIs', 'Git & GitHub'])},
      3
    ),
    (
      4,
      'Trust, Safety & Operations',
      ${JSON.stringify(['Content Moderation', 'Policy Enforcement', 'Risk Assessment', 'Account Auditing', 'Quality Assurance', 'Analytical Decision Making'])},
      4
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // --- CERTIFICATIONS ---
  await sql`DELETE FROM certifications`;
  await sql`
    INSERT INTO certifications (id, title, issuer, issue_date, credential_id, credential_url, sort_order)
    VALUES
    (
      1,
      'PCEP™ – Certified Entry-Level Python Programmer',
      'Python Institute',
      '2024',
      'MUHu.9DQO.ve99',
      'https://verify.openedg.org/?id=MUHu.9DQO.ve99',
      1
    ),
    (
      2,
      '[PCAP-31-03] PCAP – Certified Associate in Python',
      'Python Institute',
      '2024',
      'Mgv9.x1LP.ERsk',
      'https://verify.openedg.org/?id=Mgv9.x1LP.ERsk',
      2
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // --- FAQ ---
  await sql`DELETE FROM faq`;
  await sql`
    INSERT INTO faq (id, question, answer, sort_order)
    VALUES
    (
      1,
      'What are your strongest skills?',
      'My expertise lies in building Generative AI applications, specifically RAG pipelines and custom LLM solutions using Python, LangChain, and vector databases. I combine this with professional content safety experience from Wipro/Google Ads, making me highly skilled in building safe, aligned, and hallucination-free AI features.',
      1
    ),
    (
      2,
      'What kind of roles are you looking for?',
      'I am actively seeking AI Engineer, GenAI Developer, RAG/LLM Developer, or AI Safety Engineer roles where I can combine technical backend engineering with generative AI system design.',
      2
    ),
    (
      3,
      'Tell me about your RAG project.',
      'I developed an end-to-end RAG system that loads and embeds policy documentation into a vector database, then utilizes a LangChain retriever and a grounded LLM to serve answers with zero hallucination and complete source citations. It features structured evaluations for output grounding.',
      3
    ),
    (
      4,
      'Are you open to relocation?',
      'Yes, I am open to relocation for full-time opportunities or working in hybrid/remote configurations.',
      4
    ),
    (
      5,
      'What is your notice period?',
      'I am available to start immediately.',
      5
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // --- RESUME FILES ---
  await sql`DELETE FROM resume_files`;
  await sql`
    INSERT INTO resume_files (id, filename, file_data, parsed_content, version_label, is_active)
    VALUES
    (
      1,
      'Jyothi_Uday_Krishna_One_Page_Resume.pdf',
      'dGVzdF9wZGZfZGF0YQ==', -- Base64 dummy
      'JYOTHI UDAY KRISHNA\nEmail: udayjyothi39@gmail.com\nLinkedIn: https://www.linkedin.com/in/uday-krishn/\nGitHub: https://github.com/udayjyothi\n\nPROFESSIONAL SUMMARY\nAI Engineer with deep expertise in Generative AI, RAG pipelines, and LLM customizing. Experienced in content safety systems and policy reviews from Wipro.\n\nEXPERIENCE\nWipro | Senior Associate - Content Moderation | June 2024 to February 2026\n- Google Ads policy reviews and quality enforcement.\n- Maintained 99%+ quality accuracy.\n\nPROJECTS\n- Domain-Adaptive Continued Pre-training of Causal LLMs\n- Retrieval-Augmented Generation (RAG) System\n\nEDUCATION & CERTIFICATIONS\n- Python Institute: PCEP™ – Certified Entry-Level Python Programmer\n- Python Institute: [PCAP-31-03] PCAP – Certified Associate in Python',
      '1.0',
      TRUE
    )
    ON CONFLICT (id) DO NOTHING
  `;

  console.log('[seed] Seeding complete.');
}

module.exports = { seedFromProfile };
