document.addEventListener('DOMContentLoaded', () => {
  window.parent.postMessage({ action: "sidebarReady" }, "*");

  const closeBtn = document.getElementById('close-sidebar');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const braindumpInput = document.getElementById('braindump-input');

  // === Tab Switching ===
  closeBtn.addEventListener('click', () => {
    window.parent.postMessage({ action: 'closeSidebar' }, '*');
  });

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      switchTab(tabId);
    });
  });

  function switchTab(tabId) {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === tabId));
  
    const currentText = braindumpInput.value;
  
    if (tabId === 'braindump') {
      analyzeText(currentText);
    }
  
    if (tabId === 'analysis') {
      analyzeForAnalysisTab(currentText); // ✅ this line ensures metrics update when Analysis is opened
    }
  }
  

  // === Brain Dump Text Input ===
  braindumpInput.addEventListener('input', e => {
    const text = e.target.value;
    analyzeText(text);
    analyzeForAnalysisTab(text);
    localStorage.setItem('lastWritingUpdate', Date.now());
  });

  // === Listen for liveTextUpdate from content.js ===
  window.addEventListener('message', (event) => {
    const { source, action, data, features } = event.data;
  
    if (source === 'cognito-content' && action === 'liveTextUpdate') {
      const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
  
      // Update brain dump tab if active
      if (activeTab === 'braindump') {
        braindumpInput.value = data;
        analyzeText(data);
      }
  
      // ALWAYS update analysis tab (even if it's not visible right now)
      analyzeForAnalysisTab(data);
  
      // Update shared features (word count, time)
      if (features) {
        const wc = document.getElementById('word-count');
        const rt = document.getElementById('reading-time');
        if (wc) wc.textContent = features.wordCount;
        if (rt) rt.textContent = features.readingTime;
      }
  
      localStorage.setItem('lastWritingUpdate', Date.now());
    }
  });
  
  // === Brain Dump Analysis ===
  function analyzeText(text) {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);
    const gradeLevel = calculateGradeLevel(text);
    const writingStyle = analyzeWritingStyle(text);

    document.getElementById('word-count').textContent = wordCount;
    document.getElementById('reading-time').textContent = `${readingTime} min`;
    document.getElementById('grade-level').textContent = gradeLevel;
    document.getElementById('writing-style').textContent = writingStyle;

    if (isWriterStuck(text)) {
      generateWritingPrompts();
    }
  }

  function calculateGradeLevel(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = countSyllables(text);
    return Math.round(0.39 * (words.length / Math.max(1, sentences.length)) + 11.8 * (syllables / Math.max(1, words.length)) - 15.59);
  }

  function countSyllables(text) {
    const words = text.trim().toLowerCase().split(/\s+/);
    return words.reduce((count, word) => {
      word = word.replace(/[^a-z]/g, '');
      return count + (word.length <= 3 ? 1 : word.replace(/[^aeiouy]+/g, ' ').trim().split(/\s+/).length);
    }, 0);
  }

  function analyzeWritingStyle(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(1, words.length);
    const avgSentenceLength = words.length / Math.max(1, sentences.length);

    if (avgWordLength > 5 && avgSentenceLength > 20) return 'Academic';
    if (avgWordLength < 4 && avgSentenceLength < 15) return 'Conversational';
    return 'Balanced';
  }

  function isWriterStuck(text) {
    const words = text.trim().split(/\s+/);
    const uniqueWords = new Set(words.slice(-10));
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
    const container = document.getElementById('prompts-container');
    if (!container) return;

    container.innerHTML = '';
    prompts.forEach(prompt => {
      const div = document.createElement('div');
      div.className = 'prompt';
      div.textContent = prompt;
      div.onclick = () => {
        braindumpInput.value += `\n\n${prompt}`;
        braindumpInput.focus();
      };
      container.appendChild(div);
    });
  }

  // === Analysis Tab Update ===
  function analyzeForAnalysisTab(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const longWords = words.filter(w => w.length > 7);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    const vocabRatio = longWords.length / Math.max(1, words.length);
    const vocabLevel =
      vocabRatio > 0.2 ? 'Advanced' :
      vocabRatio > 0.1 ? 'Moderate' :
      'Basic';

    const avgSentenceLength = words.length / Math.max(1, sentences.length);
    const sentenceStructure =
      avgSentenceLength > 20 ? 'Complex' :
      avgSentenceLength > 12 ? 'Varied' :
      'Simple';

    const clarityScore = Math.max(50, Math.min(100, 120 - avgSentenceLength * 2));

    const vividWords = ['exciting', 'surprising', 'dramatic', 'incredible', 'unexpected', 'strange', 'intense'];
    const engagementCount = words.filter(w => vividWords.includes(w.toLowerCase())).length;
    const engagementScore = Math.min(100, 70 + engagementCount * 3);

    document.getElementById('vocabulary-level').textContent = vocabLevel;
    document.getElementById('sentence-structure').textContent = sentenceStructure;
    document.getElementById('clarity-score').textContent = `${Math.round(clarityScore)}%`;
    document.getElementById('engagement-score').textContent = `${engagementScore}%`;

    document.getElementById('recommendations-container').innerHTML = `
      <ul>
        <li>Use more vivid and specific vocabulary.</li>
        <li>Vary sentence structure for better rhythm.</li>
        <li>Simplify long or complex sentences.</li>
      </ul>
    `;
  }
});