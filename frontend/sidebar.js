// sidebar.js
let DOC_ID = null;  
console.log('[Cognito] Sidebar script loaded');
window.parent.postMessage({ action: 'sidebarReady' }, '*');

window.addEventListener('message', evt => {
  if (evt.data?.action === 'docId') {
    DOC_ID = evt.data.value;
    console.log('[Cognito] Received Doc ID →', DOC_ID);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-sidebar');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const braindumpInput = document.getElementById('braindump-input');
  const spinner = document.getElementById("analyzing-spinner");

  function switchTab(tabId) {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === tabId));

    if (tabId === 'braindump') {
      analyzeText(braindumpInput.value);
    }
  }

  closeBtn.addEventListener('click', () => {
    window.parent.postMessage({ action: 'closeSidebar' }, '*');
  });

  tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });

  braindumpInput.addEventListener('input', (e) => {
    analyzeText(e.target.value);
    localStorage.setItem('lastWritingUpdate', Date.now());
  });

  const analyzeDocBtn = document.getElementById("analyze-doc-button");
  const statusEl = document.getElementById("analysis-status");
  const recEl = document.getElementById("recommendations-container");
  
  if (analyzeDocBtn) {
    analyzeDocBtn.addEventListener("click", async () => {
      statusEl.textContent = "Fetching document text...";
      recEl.innerHTML = '';
      if (spinner) spinner.style.display = "block";

      try {
        const text = await fetchTextFromDocsAPI();
        statusEl.textContent = "Analyzing with OpenAI...";
        const analysis = await analyzeTextWithOpenAI(text);
        statusEl.textContent = "Analysis complete.";
      } catch (e) {
        statusEl.textContent = "Failed to analyze.";
        recEl.innerHTML = `<p class="error">Error: ${e}</p>`;
      } finally {
        if (spinner) spinner.style.display = "none";
      }
    });
  }
});

function analyzeText(text) {
  const wordCount = text.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  const gradeLevel = calculateGradeLevel(text);
  const writingStyle = analyzeWritingStyle(text);

  document.getElementById('word-count').textContent = wordCount;
  document.getElementById('reading-time').textContent = `${readingTime} min`;
  document.getElementById('grade-level').textContent = gradeLevel;
  document.getElementById('writing-style').textContent = writingStyle;

  if (isWriterStuck(text)) generateWritingPrompts();
}

function calculateGradeLevel(text) {
  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const syllables = countSyllables(text);

  const wordsPerSentence = words.length / Math.max(1, sentences.length);
  const syllablesPerWord = syllables / Math.max(1, words.length);

  return Math.round(0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59);
}

function countSyllables(text) {
  return text.trim().toLowerCase().split(/\s+/).reduce((count, word) => {
    word = word.replace(/[^a-z]/g, '');
    if (word.length <= 3) return count + 1;
    return count + word.replace(/[^aeiouy]+/g, ' ').trim().split(/\s+/).length;
  }, 0);
}

function analyzeWritingStyle(text) {
  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const avgSentenceLength = words.length / Math.max(1, sentences.length);

  if (avgWordLength > 5 && avgSentenceLength > 20) return 'Academic';
  if (avgWordLength < 4 && avgSentenceLength < 15) return 'Conversational';
  return 'Balanced';
}

function isWriterStuck(text) {
  const words = text.trim().split(/\s+/);
  const lastWords = words.slice(-10);
  const uniqueWords = new Set(lastWords);
  const lastUpdate = localStorage.getItem('lastWritingUpdate');

  return uniqueWords.size < 5 || (lastUpdate && Date.now() - lastUpdate > 30000);
}

function generateWritingPrompts() {
  const prompts = [
    'What is the main point you want to convey?',
    'How does this connect to your previous ideas?',
    'Can you provide an example to illustrate this?',
    'What would someone who disagrees with you say?',
    'How does this relate to your overall topic?'
  ];

  const promptsContainer = document.getElementById('prompts-container');
  promptsContainer.innerHTML = '';

  prompts.forEach(prompt => {
    const el = document.createElement('div');
    el.className = 'prompt';
    el.textContent = prompt;
    el.onclick = () => {
      const input = document.getElementById('braindump-input');
      if (input) {
        input.value += `\n\n${prompt}`;
        input.focus();
      }
    };
    promptsContainer.appendChild(el);
  });
}
function getDocId() {
  // /document/d/<ID>/edit …
  const m = window.location.pathname.match(/\/d\/([^/]+)/);
  if (m && m[1]) return m[1];

  // ?id=<ID> (very old URLs)
  const legacy = new URLSearchParams(window.location.search).get('id');
  if (legacy) return legacy;

  return null;
}
async function fetchTextFromDocsAPI () {
  if (!DOC_ID) throw new Error('No Google-Docs ID – the iframe never received it.');
  return new Promise((res, rej) => {
    chrome.runtime.sendMessage({ action:'getDocText', docId: DOC_ID }, (r) => {
      if (chrome.runtime.lastError) return rej(chrome.runtime.lastError.message);
      if (!r)                        return rej('No response from background.');
      if (r.error)                   return rej(r.error);
      if (!r.text)                   return rej('Background returned no text.');
      res(r.text);
    });
  });
}


async function analyzeTextWithOpenAI(text) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Return JSON with keys: vocabulary_level, sentence_structure, clarity_score, engagement_score, recommendations.' },
        { role: 'user', content: `Analyze the following for grade level, clarity, vocabulary, engagement:\n\n${text}` }
      ]
    })
  });
  const answer = (await res.json()).choices?.[0]?.message?.content || '{}';
  let data;
  try {
    data = JSON.parse(answer);
  } catch (e) {
    throw new Error(answer);
  }

  // Display metrics
  document.getElementById('vocabulary-level').textContent   = data.vocabulary_level   || '-';
  document.getElementById('sentence-structure').textContent = data.sentence_structure || '-';

  // Convert clarity & engagement (0–1) to % if needed
  const fmtScore = v => (typeof v === 'number' && v <= 1)
    ? Math.round(v * 100) + '%' : v;
  document.getElementById('clarity-score').textContent    = fmtScore(data.clarity_score);
  document.getElementById('engagement-score').textContent = fmtScore(data.engagement_score);

  // Normalize recommendations to array
  let recs = [];
  if (Array.isArray(data.recommendations)) {
    recs = data.recommendations;
  } else if (typeof data.recommendations === 'string') {
    recs = [data.recommendations];
  }

  // Safely render list (if empty, show placeholder)
  if (recs.length) {
    document.getElementById('recommendations-container').innerHTML =
      `<ul>${recs.map(r => `<li>${r}</li>`).join('')}</ul>`;
  } else {
    document.getElementById('recommendations-container').innerHTML =
      `<p class="suggested-length">No recommendations returned.</p>`;
  }
}