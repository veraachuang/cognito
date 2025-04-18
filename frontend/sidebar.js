// sidebar.js

console.log('[Cognito] Sidebar script loaded');

window.parent.postMessage({ action: 'sidebarReady' }, '*');

const closeBtn = document.getElementById('close-sidebar');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const braindumpInput = document.getElementById('braindump-input');

function switchTab(tabId) {
  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === tabId));

  if (tabId === 'braindump') {
    const text = braindumpInput.value;
    analyzeText(text);
  }
}



closeBtn.addEventListener('click', () => {
  window.parent.postMessage({ action: 'closeSidebar' }, '*');
});

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabId = button.dataset.tab;
    switchTab(tabId);
  });
});

window.addEventListener('message', (event) => {
  const { action, data, features } = event.data;

  if (action === 'liveTextUpdate') {
    // Only update the analysis tab with live Google Doc text
    updateAnalysisTab(data);
  
    if (features) {
      document.getElementById('word-count').textContent = features.wordCount;
      document.getElementById('reading-time').textContent = features.readingTime;
    }
  
    localStorage.setItem('lastWritingUpdate', Date.now());
  }
  
  
});


braindumpInput.addEventListener('input', (e) => {
  const text = e.target.value;
  analyzeText(text);
  localStorage.setItem('lastWritingUpdate', Date.now());
});

function analyzeText(text) {
  const wordCount = text.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  const gradeLevel = calculateGradeLevel(text);
  const writingStyle = analyzeWritingStyle(text);
  function switchTab(tabId) {
    // Update active tab state
    activeTab = tabId;

    // Update button states
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update panel visibility
    tabPanels.forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.add('active');
        panel.style.display = 'block';
      } else {
        panel.classList.remove('active');
        panel.style.display = 'none';
      }
    });

    // Notify parent window of tab change
    window.parent.postMessage({ 
      action: 'tabChanged', 
      tab: tabId 
    }, '*');

    // Initialize tab-specific functionality
    if (tabId === 'braindump') {
      const text = braindumpInput.value;
      analyzeText(text);
    }
  }

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    const { action, tab } = event.data;

    if (action === 'switchTab' && tab) {
      switchTab(tab);
    }
  });

  // Initialize with default tab
  switchTab(activeTab);

  // File upload handling
  uploadButton.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // Drag and drop handling
  uploadDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDropzone.classList.add('drag-over');
  });

  uploadDropzone.addEventListener('dragleave', () => {
    uploadDropzone.classList.remove('drag-over');
  });

  uploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropzone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  function handleFiles(files) {
    // Display files in the list
    Array.from(files).forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <span class="file-icon">📄</span>
        <span class="file-name">${file.name}</span>
      `;
      uploadedFiles.appendChild(fileItem);
    });

    // Send files to content script
    window.parent.postMessage({
      action: 'uploadFiles',
      data: { files: Array.from(files) }
    }, '*');
  }

  // Brain dump and outline generation
  analyzeButton.addEventListener('click', async () => {
    const text = braindumpInput.value.trim();
    if (!text) return;

    try {
      // First, get the cursor position from the Google Doc
      const cursorPosition = await getCursorPosition();
      
      // Call GPT API to generate outline
      const response = await fetch('http://127.0.0.1:5000/api/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ 
          text,
          cursor_position: cursorPosition
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Display the generated outline
      displayOutline(data.outline);
      
      // Switch to outline tab
      switchTab('outline');
      
      // Apply the outline to the document
      window.parent.postMessage({
        action: 'applyOutline',
        data: { 
          outline: data.outline,
          cursor_position: cursorPosition
        }
      }, '*');
    } catch (error) {
      console.error('Error generating outline:', error);
      alert('Failed to generate outline. Please check your API key and try again.');
    }
  });

  // Function to get cursor position from Google Doc
  async function getCursorPosition() {
    return new Promise((resolve) => {
      window.parent.postMessage({ action: 'getCursorPosition' }, '*');
      
      const messageHandler = (event) => {
        if (event.data.action === 'cursorPosition') {
          window.removeEventListener('message', messageHandler);
          resolve(event.data.position);
        }
      };
      
      window.addEventListener('message', messageHandler);
    });
  }

  function displayOutline(outline) {
    if (!outline || !outline.sections) {
      outlineContainer.innerHTML = '<p class="error">Failed to generate outline. Please try again.</p>';
      return;
    }

    let html = `
      <div class="outline-sections">
    `;

    // Add sections
    outline.sections.forEach((section, index) => {
      html += `
        <div class="outline-section">
          <h3>${index + 1}. ${section.title}</h3>
          <ul>
            ${section.key_points.map(point => `<li>${point}</li>`).join('')}
          </ul>
          ${section.suggested_length ? 
            `<p class="suggested-length">Suggested length: ~${section.suggested_length} words</p>` : ''}
        </div>
      `;
    });

    html += '</div>';
    outlineContainer.innerHTML = html;
  }

  regenerateOutline.addEventListener('click', () => {
    analyzeButton.click();
  });

  applyOutline.addEventListener('click', () => {
    const outlineItems = Array.from(outlineContainer.children)
      .map(p => p.textContent.replace(/^\d+\.\s/, ''));

    window.parent.postMessage({
      action: 'applyOutline',
      data: { outline: outlineItems }
    }, '*');
  });

  // Writing Analysis Functions
  function analyzeText(text) {
    // Basic text analysis
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute
    const gradeLevel = calculateGradeLevel(text);
    const writingStyle = analyzeWritingStyle(text);

  document.getElementById('word-count').textContent = wordCount;
  document.getElementById('reading-time').textContent = `${readingTime} min`;
  document.getElementById('grade-level').textContent = gradeLevel;
  document.getElementById('writing-style').textContent = writingStyle;

  if (isWriterStuck(text)) generateWritingPrompts(text);
}

function calculateGradeLevel(text) {
  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const syllables = countSyllables(text);

  const wordsPerSentence = words.length / Math.max(1, sentences.length);
  const syllablesPerWord = syllables / Math.max(1, words.length);

  const gradeLevel = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  return Math.round(gradeLevel);
}

function countSyllables(text) {
  const words = text.trim().toLowerCase().split(/\s+/);
  let count = 0;
  words.forEach(word => {
    word = word.replace(/[^a-z]/g, '');
    if (word.length <= 3) {
      count += 1;
      return;
    }
    count += word.replace(/[^aeiouy]+/g, ' ').trim().split(/\s+/).length;
  });
  return count;
}

function analyzeWritingStyle(text) {
  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const avgSentenceLength = words.length / Math.max(1, sentences.length);

  if (avgWordLength > 5 && avgSentenceLength > 20) return 'Academic';
  else if (avgWordLength < 4 && avgSentenceLength < 15) return 'Conversational';
  else return 'Balanced';
}

function isWriterStuck(text) {
  const words = text.trim().split(/\s+/);
  const lastWords = words.slice(-10);
  const uniqueWords = new Set(lastWords);
  if (uniqueWords.size < 5) return true;

  const lastUpdate = localStorage.getItem('lastWritingUpdate');
  if (lastUpdate && Date.now() - lastUpdate > 30000) return true;

  return false;
}

function generateWritingPrompts(text) {
  const promptsContainer = document.getElementById('prompts-container');
  promptsContainer.innerHTML = '';

  const prompts = [
    'What is the main point you want to convey?',
    'How does this connect to your previous ideas?',
    'Can you provide an example to illustrate this?',
    'What would someone who disagrees with you say?',
    'How does this relate to your overall topic?'
  ];

  prompts.forEach(prompt => {
    const promptElement = document.createElement('div');
    promptElement.className = 'prompt';
    promptElement.textContent = prompt;
    promptElement.onclick = () => {
      braindumpInput.value += '\n\n' + prompt;
      braindumpInput.focus();
    };
    promptsContainer.appendChild(promptElement);
  });
}

function updateAnalysisTab(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const longWords = words.filter(w => w.length > 7);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const vocabRatio = longWords.length / Math.max(1, words.length);
  const vocabLevel = vocabRatio > 0.2 ? 'Advanced' : vocabRatio > 0.1 ? 'Moderate' : 'Basic';

  const avgSentenceLength = words.length / Math.max(1, sentences.length);
  const sentenceStructure = avgSentenceLength > 20 ? 'Complex' :
                            avgSentenceLength > 12 ? 'Varied' : 'Simple';

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
