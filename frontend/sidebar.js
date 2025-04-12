document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const closeBtn = document.getElementById('close-sidebar');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const uploadDropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-input');
  const uploadButton = document.getElementById('upload-button');
  const uploadedFiles = document.getElementById('uploaded-files');
  const braindumpInput = document.getElementById('braindump-input');
  const analyzeButton = document.getElementById('analyze-button');
  const regenerateOutline = document.getElementById('regenerate-outline');
  const applyOutline = document.getElementById('apply-outline');
  const outlineContainer = document.getElementById('outline-container');

  // Close sidebar
  closeBtn.addEventListener('click', () => {
    window.parent.postMessage({ action: 'closeSidebar' }, '*');
  });

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      switchTab(tabId);
    });
  });

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });
  }

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
      const response = await fetch('http://localhost:5000/api/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const data = await response.json();
      displayOutline(data.outline);
      switchTab('outline');
    } catch (error) {
      console.error('Error generating outline:', error);
      alert('Failed to generate outline. Please try again.');
    }
  });

  function displayOutline(outline) {
    let html = `
      <h2>${outline.title}</h2>
      
      <div class="outline-sections">
    `;

    // Add sections
    outline.sections.forEach(section => {
      html += `
        <div class="outline-section">
          <h3>${section.title}</h3>
          <ul>
            ${section.key_points.map(point => `<li>${point}</li>`).join('')}
          </ul>
          <p class="suggested-length">Suggested length: ~${section.suggested_length} words</p>
        </div>
      `;
    });

    // Add writing recommendations
    html += `
      <div class="writing-recommendations">
        <h3>Writing Recommendations</h3>
        <ul>
          <li>${outline.structure_recommendations.paragraph_distribution}</li>
          <li>${outline.structure_recommendations.sentence_variety}</li>
          ${outline.structure_recommendations.transitions_needed ? 
            '<li>Consider adding more transition words between paragraphs</li>' : ''}
          <li>Recommended average sentence length: ${Math.round(outline.writing_style.sentence_length)} words</li>
          <li>Suggested tense: ${outline.writing_style.recommended_tense}</li>
        </ul>
      </div>
    `;

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

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    const { action, tab } = event.data;

    if (action === 'switchTab' && tab) {
      switchTab(tab);
    }
  });

  // Writing Analysis Functions
  function analyzeText(text) {
    // Basic text analysis
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute
    const gradeLevel = calculateGradeLevel(text);
    const writingStyle = analyzeWritingStyle(text);

    // Update metrics
    document.getElementById('word-count').textContent = wordCount;
    document.getElementById('reading-time').textContent = `${readingTime} min`;
    document.getElementById('grade-level').textContent = gradeLevel;
    document.getElementById('writing-style').textContent = writingStyle;

    // Generate prompts if writer is stuck
    if (isWriterStuck(text)) {
      generateWritingPrompts(text);
    }
  }

  function calculateGradeLevel(text) {
    // Implement Flesch-Kincaid Grade Level formula
    const words = text.trim().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = countSyllables(text);

    const wordsPerSentence = words.length / sentences.length;
    const syllablesPerWord = syllables / words.length;

    const gradeLevel = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
    return Math.round(gradeLevel);
  }

  function countSyllables(text) {
    // Simple syllable counting algorithm
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
    // Analyze writing style based on various metrics
    const words = text.trim().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const avgSentenceLength = words.length / sentences.length;
    
    if (avgWordLength > 5 && avgSentenceLength > 20) {
      return 'Academic';
    } else if (avgWordLength < 4 && avgSentenceLength < 15) {
      return 'Conversational';
    } else {
      return 'Balanced';
    }
  }

  function isWriterStuck(text) {
    // Detect if writer might be stuck
    const words = text.trim().split(/\s+/);
    const lastWords = words.slice(-10);
    
    // Check for repeated words or phrases
    const uniqueWords = new Set(lastWords);
    if (uniqueWords.size < 5) {
      return true;
    }
    
    // Check for long pauses (no new content in last 30 seconds)
    const lastUpdate = localStorage.getItem('lastWritingUpdate');
    if (lastUpdate && Date.now() - lastUpdate > 30000) {
      return true;
    }
    
    return false;
  }

  function generateWritingPrompts(text) {
    const promptsContainer = document.getElementById('prompts-container');
    promptsContainer.innerHTML = '';
    
    // Generate context-aware prompts
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
        const textarea = document.getElementById('braindump-input');
        textarea.value += '\n\n' + prompt;
        textarea.focus();
      };
      promptsContainer.appendChild(promptElement);
    });
  }

  // Add event listeners for real-time analysis
  document.getElementById('braindump-input').addEventListener('input', (e) => {
    const text = e.target.value;
    analyzeText(text);
    localStorage.setItem('lastWritingUpdate', Date.now());
  });

  // Initialize analysis when tab is switched
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.tab === 'braindump') {
        const text = document.getElementById('braindump-input').value;
        analyzeText(text);
      }
    });
  });
}); 