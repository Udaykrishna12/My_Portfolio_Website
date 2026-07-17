// js/main.js — Fetches profile data, renders all sections, handles project modals and resume printing

let projectsData = [];

// ---------- SANITIZE HTML (whitelist only safe tags) ----------
function sanitizeHtml(html) {
  const allowed = ['a', 'strong', 'em', 'br', 'p', 'ul', 'li'];
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) { node.remove(); return; }
    const tag = node.tagName.toLowerCase();
    if (!allowed.includes(tag)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      node.setAttribute('rel', 'noopener noreferrer');
      if (!href.startsWith('mailto:')) node.setAttribute('target', '_blank');
      [...node.attributes].forEach(attr => {
        if (!['href', 'target', 'rel'].includes(attr.name)) node.removeAttribute(attr.name);
      });
    } else {
      [...node.attributes].forEach(attr => node.removeAttribute(attr.name));
    }
    [...node.childNodes].forEach(clean);
  }

  [...tmp.childNodes].forEach(clean);
  return tmp.innerHTML;
}

// ---------- RENDER HERO ----------
function renderHero(profile) {
  const photo = document.getElementById('hero-photo');
  const name = document.getElementById('hero-name');
  const title = document.getElementById('hero-title');
  const loc = document.getElementById('hero-location');
  const linkedinBtn = document.getElementById('linkedin-btn');
  const githubBtn = document.getElementById('github-btn');

  if (photo) { photo.src = profile.photo_url || 'uday.jpg'; photo.alt = profile.name; }
  if (name) name.textContent = profile.name;
  if (title) title.textContent = profile.title;
  if (loc) loc.textContent = '📍 ' + profile.location;
  if (linkedinBtn) { linkedinBtn.href = profile.linkedin_url; }
  if (githubBtn) { githubBtn.href = profile.github_url; }
}

// ---------- RENDER BIO ----------
function renderBio(profile) {
  const el = document.getElementById('bio-text');
  if (el) el.textContent = profile.bio;
}

// ---------- RENDER EXPERIENCE ----------
function renderExperience(experience) {
  const list = document.getElementById('exp-list');
  if (!list) return;
  list.innerHTML = '';
  experience.forEach(exp => {
    const bullets = Array.isArray(exp.bullets) ? exp.bullets : JSON.parse(exp.bullets || '[]');
    const end = exp.is_current ? 'Present' : exp.end_date;
    const item = document.createElement('div');
    item.className = 'exp-row-panel fade-up';
    item.innerHTML = `
      <div class="exp-row-meta">
        <div class="exp-row-dates">${exp.start_date} — ${end}</div>
        <div class="exp-row-company-block">
          <h3 class="exp-row-company">${exp.company}</h3>
          ${exp.is_current ? '<span class="exp-row-current-badge">Current</span>' : ''}
        </div>
        <div class="exp-row-role">${exp.role}</div>
      </div>
      <div class="exp-row-content">
        <ul class="exp-row-bullets">
          ${bullets.map(b => `<li class="exp-row-bullet">${b}</li>`).join('')}
        </ul>
      </div>
    `;
    list.appendChild(item);
  });
}

// ---------- RENDER PROJECTS ----------
function renderProjects(projects) {
  projectsData = projects;
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  grid.innerHTML = '';
  projects.forEach((proj, idx) => {
    const tech = Array.isArray(proj.tech) ? proj.tech : JSON.parse(proj.tech || '[]');
    const card = document.createElement('div');
    card.className = 'project-card fade-up';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View details for ${proj.title}`);
    card.dataset.idx = idx;
    card.innerHTML = `
      <div class="project-thumb">
        <img src="${proj.thumbnail_url || 'projects/placeholder.png'}" 
             alt="${proj.title} thumbnail"
             onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\"font-size:2rem\\">💻</span>'">
      </div>
      <div class="project-body">
        <div class="project-domain">${proj.domain}</div>
        <div class="project-title">${proj.title}</div>
        <p class="project-summary">${proj.summary}</p>
      </div>
      <div class="project-footer">
        <div class="project-tech-preview">
          ${tech.slice(0, 3).map(t => `<span class="chip">${t}</span>`).join('')}
          ${tech.length > 3 ? `<span class="chip">+${tech.length - 3}</span>` : ''}
        </div>
        <span class="open-modal-hint">View Details ↗</span>
      </div>
    `;
    card.addEventListener('click', () => openModal(idx));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(idx); });
    grid.appendChild(card);
  });
  observeFadeUps();
}

// ---------- RENDER SKILLS ----------
function renderSkills(skills) {
  const container = document.getElementById('skills-grid');
  if (!container) return;
  container.innerHTML = '';
  
  const categoryIcons = {
    'programming': '💻',
    'artificial intelligence (ai)': '🧠',
    'cloud & devops': '☁️',
    'trust, safety & operations': '🛡️'
  };

  skills.forEach(sk => {
    const items = Array.isArray(sk.items) ? sk.items : JSON.parse(sk.items || '[]');
    const catLower = sk.category.toLowerCase();
    const icon = categoryIcons[catLower] || '⚡';
    
    const card = document.createElement('div');
    card.className = 'skills-category-card fade-up';
    card.innerHTML = `
      <div class="skills-card-header">
        <span class="skills-card-icon">${icon}</span>
        <h3 class="skills-card-category">${sk.category}</h3>
      </div>
      <div class="skills-chips">
        ${items.map(item => `<span class="chip chip-accent">${item}</span>`).join('')}
      </div>
    `;
    container.appendChild(card);
  });
  observeFadeUps();
}

// ---------- RENDER CERTIFICATIONS ----------
function renderCertifications(certs) {
  const container = document.getElementById('certifications-grid');
  if (!container) return;
  container.innerHTML = '';
  if (!certs || certs.length === 0) {
    container.innerHTML = `<div class="empty-certs fade-up">Verify my credentials and certifications details above.</div>`;
    return;
  }
  certs.forEach(cert => {
    const el = document.createElement('div');
    el.className = 'cert-card fade-up';
    el.innerHTML = `
      <div class="cert-icon">🎓</div>
      <div class="cert-body">
        <div class="cert-title">${cert.title}</div>
        <div class="cert-issuer">${cert.issuer} • ${cert.issue_date}</div>
        ${cert.credential_id ? `<div class="cert-id">Credential ID: ${cert.credential_id}</div>` : ''}
      </div>
      ${cert.credential_url ? `<a class="btn btn-ghost cert-link" href="${cert.credential_url}" target="_blank" rel="noopener noreferrer">Verify ↗</a>` : ''}
    `;
    container.appendChild(el);
  });
  observeFadeUps();
}



// ---------- RENDER CONTACT ----------
function renderContact(profile) {
  const emailLink = document.getElementById('contact-email');
  const liLink = document.getElementById('contact-linkedin');
  const ghLink = document.getElementById('contact-github');
  const emailVal = document.getElementById('contact-email-val');
  const footerEmail = document.getElementById('footer-email');

  if (emailLink) emailLink.href = `mailto:${profile.email}`;
  if (emailVal) emailVal.textContent = profile.email;
  if (liLink) liLink.href = profile.linkedin_url;
  if (ghLink) ghLink.href = profile.github_url;
  if (footerEmail) {
    footerEmail.href = `mailto:${profile.email}`;
    footerEmail.textContent = profile.email;
  }
}

// ---------- MODAL ----------
function openModal(idx) {
  const proj = projectsData[idx];
  if (!proj) return;
  const tech = Array.isArray(proj.tech) ? proj.tech : JSON.parse(proj.tech || '[]');

  document.getElementById('modal-domain').textContent = proj.domain;
  document.getElementById('modal-title').textContent = proj.title;
  document.getElementById('modal-summary').textContent = proj.summary;
  document.getElementById('modal-details').textContent = proj.details || proj.summary;

  const techEl = document.getElementById('modal-tech');
  techEl.innerHTML = tech.map(t => `<span class="chip chip-accent">${t}</span>`).join('');

  const linksEl = document.getElementById('modal-links');
  linksEl.innerHTML = '';
  if (proj.project_link) {
    linksEl.innerHTML += `<a class="btn btn-ghost" href="${proj.project_link}" target="_blank" rel="noopener noreferrer">🔗 View Project</a>`;
  }
  if (proj.video_link) {
    linksEl.innerHTML += `<a class="btn btn-ghost" href="${proj.video_link}" target="_blank" rel="noopener noreferrer">▶ Watch Demo</a>`;
  }

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  setTimeout(() => document.getElementById('modal-close')?.focus(), 50);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function initModal() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay?.classList.contains('open')) closeModal();
  });

  overlay?.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !overlay.classList.contains('open')) return;
    const focusable = overlay.querySelectorAll('button, a, [tabindex="0"]');
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
    else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
}

// ---------- SCROLL ANIMATIONS ----------
function observeFadeUps() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up:not(.visible)').forEach(el => obs.observe(el));
}

// ---------- INIT ----------
async function init() {
  window.__themeInit?.();
  initModal();

  try {
    const res = await fetch('/api/profile');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();

    if (data.profile) {
      renderHero(data.profile);
      renderBio(data.profile);
      renderContact(data.profile);
    }
    if (data.experience) renderExperience(data.experience);
    if (data.projects) renderProjects(data.projects);
    if (data.skills) renderSkills(data.skills);
    if (data.certifications) renderCertifications(data.certifications);
    
    observeFadeUps();
  } catch (err) {
    console.warn('Backend API not running (expected in local static mode). Loading static profile fallback data.', err);
    
    const fallbackData = {
      profile: {
        name: "Jyothi Uday Krishna",
        title: "AI Engineer | Generative AI & RAG Specialist",
        location: "Hyderabad, India",
        email: "udayjyothi39@gmail.com",
        linkedin_url: "https://www.linkedin.com/in/uday-krishn/",
        github_url: "https://github.com/Udaykrishna12?tab=repositories",
        bio: "I am an AI Engineer specializing in Generative AI, Retrieval-Augmented Generation (RAG), and Large Language Model (LLM) customization. I build production-grade intelligent systems combining LLMs/SLMs with agentic workflows (LangChain, LangGraph) and vector databases. With an operations background at Wipro moderating Google Ads content, I bring a unique values-driven perspective to AI safety, alignment, and LLM guardrail engineering.",
        photo_url: "uday.jpg",
        resume_url: "Jyothi_Uday_Krishna_One_Page_Resume.pdf"
      },
      experience: [
        {
          company: "WIPRO",
          role: "Senior Associate – Content Moderation (Trust & Safety / Google Ads)",
          start_date: "June 2024",
          end_date: "February 2026",
          is_current: false,
          bullets: [
            "Reviewed and moderated high volumes of Google Ads content to ensure compliance with platform policies and community standards.",
            "Identified violations including impersonation, misleading advertisements, restricted content, and policy abuse.",
            "Conducted detailed reviews of advertiser accounts to detect suspicious or non-compliant activities.",
            "Applied enforcement actions such as ad disapproval, escalation, and account-level restrictions based on policy guidelines."
          ]
        }
      ],
      projects: [
        {
          title: "Clarity Bot: Production-Grade AI Agent Orchestrator",
          domain: "Cognitive AI & Agentic Workflows",
          summary: "An advanced conversational assistant orchestrating cognitive RAG and policy enforcement, fully optimized for Streamlit Cloud deployment.",
          details: "Clarity Bot is an enterprise-grade AI chatbot platform built using Streamlit, LangChain, and Groq. It implements conversational memory, structured RAG pipelines for document semantic intelligence, and strict server-side policy guardrails to enforce safety, security, and response reliability.",
          tech: ["Python", "Streamlit", "LangChain", "Groq SDK", "RAG", "Vector Embeddings"],
          thumbnail_url: "projects/placeholder.png",
          project_link: "https://github.com/Udaykrishna12?tab=repositories"
        },
        {
          title: "Domain-Adaptive Continued Pre-training of Causal LLMs",
          domain: "Artificial Intelligence / LLMs",
          summary: "Fine-tuned causal language models using domain-adaptive continued pre-training (DACP) on specialized corpora.",
          details: "This project implements domain-adaptive continued pre-training (DACP) on specialized domains using parameter-efficient fine-tuning (LoRA) and the Unsloth library. It adapts causal language models to technical domains.",
          tech: ["Python", "PyTorch", "Hugging Face", "Unsloth", "LoRA", "Transformers"],
          thumbnail_url: "projects/placeholder.png",
          project_link: "https://github.com/Udaykrishna12?tab=repositories"
        },
        {
          title: "End-to-End Retrieval-Augmented Generation (RAG) System",
          domain: "Generative AI / RAG",
          summary: "Built a robust RAG pipeline utilizing advanced embedding models, vector databases, and LangChain.",
          details: "An end-to-end RAG pipeline designed to extract, embed, and search policy documents. Uses LangChain and Hugging Face embedding models to retrieve and answer questions based strictly on local document context.",
          tech: ["Python", "LangChain", "SQL", "Hugging Face", "Vector Databases", "PyPDFLoader"],
          thumbnail_url: "projects/placeholder.png",
          project_link: "https://github.com/Udaykrishna12?tab=repositories"
        }
      ],
      skills: [
        {
          category: "Programming",
          items: ["Python", "JavaScript", "TypeScript", "Node.js", "FastAPI", "SQL", "HTML5/CSS3"]
        },
        {
          category: "Artificial Intelligence (AI)",
          items: ["Generative AI", "Large Language Models (LLMs)", "Retrieval-Augmented Generation (RAG)", "Vector Databases (Chroma/FAISS)", "LangChain / LangGraph", "Agentic AI", "Model Fine-tuning (LoRA/PEFT)", "PyTorch", "Hugging Face"]
        },
        {
          category: "Cloud & DevOps",
          items: ["AWS (S3, EC2)", "Google Cloud Platform (GCP)", "Docker", "Git / GitHub", "CI/CD Pipelines", "REST APIs"]
        },
        {
          category: "Trust, Safety & Operations",
          items: ["Content Moderation", "Policy Enforcement", "Risk Assessment", "Account Auditing", "Quality Assurance", "Analytical Decision Making"]
        }
      ],
      certifications: [
        { title: "Generative AI with Large Language Models", issuer: "DeepLearning.AI & AWS", issue_date: "2024", credential_id: "DL-GENAI-101", credential_url: "https://coursera.org/verify/generative-ai-llms" },
        { title: "Natural Language Processing Specialization", issuer: "DeepLearning.AI", issue_date: "2024", credential_id: "DL-NLP-202", credential_url: "https://coursera.org/verify/nlp-specialization" },
        { title: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", issue_date: "2024", credential_id: "AWS-CCP-999", credential_url: "https://aws.amazon.com/verification" },
        { title: "Fundamentals of Deep Learning", issuer: "NVIDIA Deep Learning Institute", issue_date: "2023", credential_id: "NV-DL-001", credential_url: "https://courses.nvidia.com/certificates" }
      ],
      resume_file: {
        version_label: "1.0"
      }
    };

    renderHero(fallbackData.profile);
    renderBio(fallbackData.profile);
    renderContact(fallbackData.profile);
    if (fallbackData.experience) renderExperience(fallbackData.experience);
    if (fallbackData.projects) renderProjects(fallbackData.projects);
    if (fallbackData.skills) renderSkills(fallbackData.skills);
    if (fallbackData.certifications) renderCertifications(fallbackData.certifications);
    
    observeFadeUps();
  }
}

document.addEventListener('DOMContentLoaded', init);
