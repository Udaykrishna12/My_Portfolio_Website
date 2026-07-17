// js/chat.js — UdayAI chatbot widget with streaming, voice input, and HTML sanitization

(function () {
  const SUGGESTIONS = [
    "What are your strongest skills?",
    "Tell me about a challenging project",
    "What roles are you looking for?",
    "How can I contact you?"
  ];

  let chatHistory = [];
  let isWaiting = false;

  // ---------- SANITIZE (whitelist) ----------
  function sanitize(html) {
    const allowed = ['a', 'strong', 'em', 'br', 'p', 'ul', 'li'];
    const div = document.createElement('div');
    div.innerHTML = html;
    function clean(node) {
      if (node.nodeType === Node.TEXT_NODE) return;
      if (node.nodeType !== Node.ELEMENT_NODE) { node.remove(); return; }
      const tag = node.tagName.toLowerCase();
      if (!allowed.includes(tag)) { node.replaceWith(...node.childNodes); return; }
      if (tag === 'a') {
        const href = node.getAttribute('href') || '';
        node.setAttribute('rel', 'noopener noreferrer');
        if (!href.startsWith('mailto:')) node.setAttribute('target', '_blank');
        [...node.attributes].forEach(a => { if (!['href','target','rel'].includes(a.name)) node.removeAttribute(a.name); });
      } else {
        [...node.attributes].forEach(a => node.removeAttribute(a.name));
      }
      [...node.childNodes].forEach(clean);
    }
    [...div.childNodes].forEach(clean);
    return div.innerHTML;
  }

  // ---------- CLIENT MOCK CHATBACK FALLBACK ----------
  function getMockResponse(text) {
    const t = text.toLowerCase();
    
    if (t.includes('skill') || t.includes('technolog') || t.includes('tool') || t.includes('python') || t.includes('sql') || t.includes('nlp') || t.includes('llm') || t.includes('slm')) {
      return "My core skills include <strong>Python</strong>, <strong>SQL</strong>, <strong>Natural Language Processing (NLP)</strong>, and <strong>Large Language Models (LLMs/SLMs)</strong>. I am also proficient with tools like <strong>Hugging Face</strong>, <strong>LangChain</strong>, and <strong>Unsloth</strong> for model fine-tuning. You can view my full skillset in the Skills section of the page!";
    }
    
    if (t.includes('project') || t.includes('built') || t.includes('rag') || t.includes('fine-tune') || t.includes('unsloth') || t.includes('work embedding') || t.includes('tokenization')) {
      return "I have built two major AI projects: <strong>Domain-Adaptive Continued Pre-training of Causal LLMs</strong> using Unsloth and LoRA, and an end-to-end <strong>RAG System</strong> utilizing LangChain and vector databases. You can click on the project cards on the page to view their full details!";
    }
    
    if (t.includes('experience') || t.includes('work') || t.includes('wipro') || t.includes('moderator') || t.includes('job') || t.includes('history') || t.includes('safety') || t.includes('google ads') || t.includes('associate')) {
      return "I worked as a <strong>Senior Associate in Content Moderation (Trust & Safety)</strong> at <strong>WIPRO</strong> from June 2024 to February 2026. My work was focused on Google Ads policy review, account enforcement, and risk assessment to ensure platform safety and compliance.";
    }
    
    if (t.includes('contact') || t.includes('email') || t.includes('reach') || t.includes('linkedin') || t.includes('phone') || t.includes('github') || t.includes('hello') || t.includes('hi ')) {
      return "You can reach me directly via email at <a href=\"mailto:udayjyothi39@gmail.com\">udayjyothi39@gmail.com</a>, connect with me on <a href=\"https://www.linkedin.com/in/uday-krishn/\" target=\"_blank\">LinkedIn</a>, or view my repositories on <a href=\"https://github.com/udayjyothi\" target=\"_blank\">GitHub</a>.";
    }
    
    if (t.includes('salary') || t.includes('expect') || t.includes('pay') || t.includes('compensation') || t.includes('package') || t.includes('money')) {
      return "Salary details depend on the scope of the role, location, and overall requirements. I would be happy to discuss this further—please feel free to reach out to me directly at <a href=\"mailto:udayjyothi39@gmail.com\">udayjyothi39@gmail.com</a>.";
    }
    
    if (t.includes('free') || t.includes('unpaid') || t.includes('without pay')) {
      return "I am currently looking for professional, full-time opportunities. Let's discuss how my content moderation and AI capabilities fit your goals—please reach out to me at <a href=\"mailto:udayjyothi39@gmail.com\">udayjyothi39@gmail.com</a>.";
    }
    
    if (t.includes('notice') || t.includes('join') || t.includes('start') || t.includes('relocation') || t.includes('move')) {
      return "I am based in Hyderabad, India. Regarding start dates and notice period, please email me at <a href=\"mailto:udayjyothi39@gmail.com\">udayjyothi39@gmail.com</a> so we can align on details.";
    }
    
    return "I'm UdayAI, an assistant grounded in Uday's background. I can tell you about his Wipro Content Moderation experience, Python/AI projects, or skills. Feel free to contact him directly at <a href=\"mailto:udayjyothi39@gmail.com\">udayjyothi39@gmail.com</a>!";
  }

  // ---------- DOM HELPERS ----------
  function addMessage(role, htmlContent) {
    const msgs = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    msg.innerHTML = `<div class="chat-bubble">${role === 'bot' ? sanitize(htmlContent) : escapeText(htmlContent)}</div>`;
    msgs.appendChild(msg);
    msgs.scrollTop = msgs.scrollHeight;
    return msg.querySelector('.chat-bubble');
  }

  function escapeText(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function showTyping() {
    const msgs = document.getElementById('chat-messages');
    const el = document.createElement('div');
    el.id = 'typing-indicator';
    el.className = 'chat-msg bot';
    el.innerHTML = '<div class="chat-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('typing-indicator')?.remove();
  }

  function setInputDisabled(disabled) {
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send-btn');
    if (input) input.disabled = disabled;
    if (send) send.disabled = disabled;
  }

  function hideSuggestions() {
    const el = document.getElementById('chat-suggestions');
    if (el) el.style.display = 'none';
  }

  // ---------- SEND MESSAGE ----------
  async function sendMessage(text) {
    if (!text || !text.trim() || isWaiting) return;
    isWaiting = true;
    hideSuggestions();
    setInputDisabled(true);

    const userText = text.trim();
    addMessage('user', userText);
    chatHistory.push({ role: 'user', content: userText });

    const input = document.getElementById('chat-input');
    if (input) input.value = '';

    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: chatHistory.slice(-10) })
      });

      hideTyping();

      if (!res.ok) {
        throw new Error('API not available');
      }

      // Stream the response token by token
      const bubble = addMessage('bot', '');
      let fullText = '';

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]' || payload === '[ERROR]') continue;
          try {
            const { token } = JSON.parse(payload);
            if (token) {
              fullText += token;
              bubble.innerHTML = sanitize(fullText);
              document.getElementById('chat-messages').scrollTop = 9999;
            }
          } catch { /* ignore parse errors */ }
        }
      }

      chatHistory.push({ role: 'assistant', content: fullText });
      isWaiting = false;
      setInputDisabled(false);
      document.getElementById('chat-input')?.focus();
    } catch (err) {
      console.warn('Backend API not running (expected in local static mode). Using client-side chatbot simulation.', err);
      hideTyping();
      
      const responseText = getMockResponse(userText);
      const tokens = responseText.split(/(\s+)/g).filter(Boolean);
      const bubble = addMessage('bot', '');
      let fullText = '';
      let index = 0;
      
      const interval = setInterval(() => {
        if (index < tokens.length) {
          fullText += tokens[index++];
          bubble.innerHTML = sanitize(fullText);
          document.getElementById('chat-messages').scrollTop = 9999;
        } else {
          clearInterval(interval);
          chatHistory.push({ role: 'assistant', content: fullText });
          isWaiting = false;
          setInputDisabled(false);
          document.getElementById('chat-input')?.focus();
        }
      }, 35);
    }
  }

  // ---------- VOICE INPUT ----------
  function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = document.getElementById('chat-mic-btn');
    if (!SpeechRecognition || !micBtn) return;

    micBtn.classList.add('visible');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let listening = false;

    micBtn.addEventListener('click', () => {
      if (listening) { recognition.stop(); return; }
      recognition.start();
    });

    recognition.addEventListener('start', () => {
      listening = true;
      micBtn.classList.add('listening');
      micBtn.title = 'Listening... click to stop';
    });

    recognition.addEventListener('end', () => {
      listening = false;
      micBtn.classList.remove('listening');
      micBtn.title = 'Click to speak';
    });

    recognition.addEventListener('result', (e) => {
      const transcript = e.results[0][0].transcript;
      const input = document.getElementById('chat-input');
      if (input) input.value = transcript;
      sendMessage(transcript);
    });

    recognition.addEventListener('error', () => {
      listening = false;
      micBtn.classList.remove('listening');
    });
  }

  // ---------- INIT WIDGET ----------
  function init() {
    const toggle = document.getElementById('chat-toggle');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('chat-close-btn');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const suggestionsEl = document.getElementById('chat-suggestions');

    // Toggle open/close
    toggle?.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        setTimeout(() => input?.focus(), 100);
        if (document.getElementById('chat-messages').childElementCount === 0) {
          addMessage('bot', 'Hi there! I\'m <strong>UdayAI</strong> — ask me anything about Uday\'s background, projects, or skills.');
        }
      }
    });

    closeBtn?.addEventListener('click', () => {
      panel.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });

    // Send on Enter (not shift+enter)
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
    });

    sendBtn?.addEventListener('click', () => sendMessage(input?.value));

    // Build suggestion buttons
    if (suggestionsEl) {
      SUGGESTIONS.forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn';
        btn.textContent = q;
        btn.addEventListener('click', () => sendMessage(q));
        suggestionsEl.appendChild(btn);
      });
    }

    initVoice();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
