// sidebar.js

console.log('[Cognito] Sidebar script loaded');

// Main Application Class
class SidebarApp {
  constructor() {
    this.activeTab = 'upload'; // Default tab
    this.lastWritingUpdate = null;
    this.elements = this.initElements();
    this.initEventListeners();
    this.switchTab(this.activeTab);
    this.notifyParentReady();
  }

  // DOM Elements Initialization
  initElements() {
    return {
      closeBtn: document.getElementById('close-sidebar'),
      tabButtons: document.querySelectorAll('.tab-button'),
      tabPanels: document.querySelectorAll('.tab-panel'),
      braindumpInput: document.getElementById('braindump-input'),
      uploadButton: document.getElementById('upload-button'),
      fileInput: document.getElementById('file-input'),
      uploadDropzone: document.getElementById('upload-dropzone'),
      uploadedFiles: document.getElementById('uploaded-files'),
      analyzeButton: document.getElementById('analyze-button'),
      outlineContainer: document.getElementById('outline-container'),
      regenerateOutline: document.getElementById('regenerate-outline'),
      applyOutline: document.getElementById('apply-outline'),
      promptsContainer: document.getElementById('prompts-container'),
      wordCount: document.getElementById('word-count'),
      readingTime: document.getElementById('reading-time'),
      gradeLevel: document.getElementById('grade-level'),
      writingStyle: document.getElementById('writing-style'),
      vocabularyLevel: document.getElementById('vocabulary-level'),
      sentenceStructure: document.getElementById('sentence-structure'),
      clarityScore: document.getElementById('clarity-score'),
      engagementScore: document.getElementById('engagement-score'),
      recommendationsContainer: document.getElementById('recommendations-container')
    };
  }

  // Initialize Event Listeners
  initEventListeners() {
    // Window message handler
    window.addEventListener('message', this.handleWindowMessage.bind(this));

    // Close button handler
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => {
        window.parent.postMessage({ action: 'closeSidebar' }, '*');
      });
    }

    // Tab button handlers
    if (this.elements.tabButtons) {
      this.elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          this.switchTab(button.dataset.tab);
        });
      });
    }

    // Braindump input handler
    if (this.elements.braindumpInput) {
      this.elements.braindumpInput.addEventListener('input', (e) => {
        this.analyzeText(e.target.value);
        this.updateLastWritingTime();
      });
    }

    // File upload handlers
    this.initFileUploadListeners();

    // Outline button handlers
    this.initOutlineButtonListeners();
  }

  // Initialize file upload related listeners
  initFileUploadListeners() {
    const { uploadButton, fileInput, uploadDropzone } = this.elements;

    if (uploadButton && fileInput) {
      uploadButton.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        this.handleFiles(e.target.files);
      });
    }

    if (uploadDropzone) {
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
        this.handleFiles(e.dataTransfer.files);
      });
    }
  }

  // Initialize outline button listeners
  initOutlineButtonListeners() {
    const { analyzeButton, regenerateOutline, applyOutline, outlineContainer } = this.elements;

    if (analyzeButton) {
      analyzeButton.addEventListener('click', async () => {
        const text = this.elements.braindumpInput?.value.trim();
        if (!text) return;

        try {
          const cursorPosition = await this.getCursorPosition();
          const data = await this.generateOutline(text, cursorPosition);
          this.displayOutline(data.outline);
          this.switchTab('outline');
          
          window.parent.postMessage({
            action: 'applyOutline',
            data: { 
              outline: data.outline,
              cursor_position: cursorPosition
            }
          }, '*');
        } catch (error) {
          console.error('Error generating outline:', error);
          alert('Failed to generate outline. Please try again.');
        }
      });
    }

    if (regenerateOutline) {
      regenerateOutline.addEventListener('click', () => {
        if (analyzeButton) analyzeButton.click();
      });
    }

    if (applyOutline && outlineContainer) {
      applyOutline.addEventListener('click', () => {
        const outlineItems = Array.from(outlineContainer.querySelectorAll('.outline-section'))
          .map(section => ({
            title: section.querySelector('h3')?.textContent.replace(/^\d+\.\s/, '') || '',
            points: Array.from(section.querySelectorAll('li')).map(li => li.textContent)
          }));

        window.parent.postMessage({
          action: 'applyOutline',
          data: { outline: outlineItems }
        }, '*');
      });
    }
  }

  // Handle window messages
  handleWindowMessage(event) {
    const { action, data, features, tab } = event.data;

    if (action === 'switchTab' && tab) {
      this.switchTab(tab);
    } else if (action === 'liveTextUpdate') {
      this.updateAnalysisTab(data);
      if (features) {
        this.updateTextFeatures(features);
      }
      this.updateLastWritingTime();
    }
  }

  // Switch between tabs
  switchTab(tabId) {
    console.log('Switching to tab:', tabId);
    
    // Update active tab state
    this.activeTab = tabId;

    // Update button states
    this.elements.tabButtons?.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update panel visibility
    this.elements.tabPanels?.forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.add('active');
        panel.style.display = 'block';
      } else {
        panel.classList.remove('active');
        panel.style.display = 'none';
      }
    });

    // Initialize tab-specific functionality
    if (tabId === 'braindump' && this.elements.braindumpInput) {
      this.analyzeText(this.elements.braindumpInput.value);
    }
  }

  // Update text features display
  updateTextFeatures(features) {
    const { wordCount, readingTime } = this.elements;
    
    if (wordCount) {
      wordCount.textContent = features.wordCount;
    }
    
    if (readingTime) {
      readingTime.textContent = features.readingTime;
    }
  }

  // Update timestamp of last writing change
  updateLastWritingTime() {
    this.lastWritingUpdate = Date.now();
    localStorage.setItem('lastWritingUpdate', this.lastWritingUpdate);
  }

  // Handle file uploads
  handleFiles(files) {
    const { uploadedFiles } = this.elements;
    if (!uploadedFiles || !files || !files.length) return;
    
    // Display files in the list
    Array.from(files).forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <span class="file-icon"><i class="fas fa-file-alt"></i></span>
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

  // Get cursor position from parent window
  async getCursorPosition() {
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

  // Generate outline via API
  async generateOutline(text, cursorPosition) {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Display outline in the UI
  displayOutline(outline) {
    const { outlineContainer } = this.elements;
    if (!outlineContainer) return;
    
    if (!outline || !outline.sections) {
      outlineContainer.innerHTML = '<p class="error">Failed to generate outline. Please try again.</p>';
      return;
    }

    let html = '<div class="outline-sections">';

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

  // Text Analysis Methods
  analyzeText(text) {
    if (!text) return;
    
    const parsed = this.parseText(text);
    const analysis = this.calculateTextMetrics(parsed);
    
    this.updateAnalysisDisplay(analysis);
    
    if (this.isWriterStuck(text, parsed)) {
      this.generateWritingPrompts();
    }
  }
  
  // Parse text into components for analysis
  parseText(text) {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = this.countSyllables(trimmed);
    
    return { 
      text: trimmed,
      words,
      sentences,
      syllables
    };
  }
  
  // Calculate various text metrics
  calculateTextMetrics(parsed) {
    const { words, sentences, syllables } = parsed;
    
    // Basic metrics
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200);
    
    // Grade level metrics
    const wordsPerSentence = wordCount / Math.max(1, sentences.length);
    const syllablesPerWord = syllables / Math.max(1, wordCount);
    const gradeLevel = Math.round(0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59);
    
    // Writing style metrics
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(1, wordCount);
    const avgSentenceLength = wordCount / Math.max(1, sentences.length);
    const writingStyle = this.determineWritingStyle(avgWordLength, avgSentenceLength);
    
    // Advanced metrics
    const longWords = words.filter(w => w.length > 7);
    const vocabRatio = longWords.length / Math.max(1, wordCount);
    const vocabLevel = vocabRatio > 0.2 ? 'Advanced' : vocabRatio > 0.1 ? 'Moderate' : 'Basic';
    const sentenceStructure = avgSentenceLength > 20 ? 'Complex' : avgSentenceLength > 12 ? 'Varied' : 'Simple';
    const clarityScore = Math.max(50, Math.min(100, 120 - avgSentenceLength * 2));
    
    const vividWords = ['exciting', 'surprising', 'dramatic', 'incredible', 'unexpected', 'strange', 'intense'];
    const engagementCount = words.filter(w => vividWords.includes(w.toLowerCase())).length;
    const engagementScore = Math.min(100, 70 + engagementCount * 3);
    
    return {
      wordCount,
      readingTime,
      gradeLevel,
      writingStyle,
      vocabLevel,
      sentenceStructure,
      clarityScore: Math.round(clarityScore),
      engagementScore
    };
  }
  
  // Update analysis display in the UI
  updateAnalysisDisplay(analysis) {
    const {
      wordCount,
      readingTime,
      gradeLevel,
      writingStyle,
      vocabularyLevel,
      sentenceStructure,
      clarityScore,
      engagementScore,
      recommendationsContainer
    } = this.elements;
    
    // Update basic metrics
    if (wordCount) wordCount.textContent = analysis.wordCount;
    if (readingTime) readingTime.textContent = `${analysis.readingTime} min`;
    if (gradeLevel) gradeLevel.textContent = analysis.gradeLevel;
    if (writingStyle) writingStyle.textContent = analysis.writingStyle;
    
    // Update advanced metrics
    if (vocabularyLevel) vocabularyLevel.textContent = analysis.vocabLevel;
    if (sentenceStructure) sentenceStructure.textContent = analysis.sentenceStructure;
    if (clarityScore) clarityScore.textContent = `${analysis.clarityScore}%`;
    if (engagementScore) engagementScore.textContent = `${analysis.engagementScore}%`;
    
    // Update recommendations
    if (recommendationsContainer) {
      recommendationsContainer.innerHTML = `
        <ul>
          <li>Use more vivid and specific vocabulary.</li>
          <li>Vary sentence structure for better rhythm.</li>
          <li>Simplify long or complex sentences.</li>
        </ul>
      `;
    }
  }
  
  // Count syllables in text
  countSyllables(text) {
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
  
  // Determine writing style based on word and sentence length
  determineWritingStyle(avgWordLength, avgSentenceLength) {
    if (avgWordLength > 5 && avgSentenceLength > 20) return 'Academic';
    else if (avgWordLength < 4 && avgSentenceLength < 15) return 'Conversational';
    else return 'Balanced';
  }
  
  // Update analysis tab with new text
  updateAnalysisTab(text) {
    this.analyzeText(text);
  }
  
  // Check if writer appears to be stuck
  isWriterStuck(text, parsed) {
    // Check for repetitive words
    const lastWords = parsed.words.slice(-10);
    const uniqueWords = new Set(lastWords);
    if (uniqueWords.size < 5) return true;
    
    // Check for long pause in writing
    const lastUpdate = localStorage.getItem('lastWritingUpdate');
    if (lastUpdate && Date.now() - lastUpdate > 30000) return true;
    
    return false;
  }
  
  // Generate and display writing prompts
  generateWritingPrompts() {
    const { promptsContainer, braindumpInput } = this.elements;
    if (!promptsContainer) return;
    
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
      
      if (braindumpInput) {
        promptElement.onclick = () => {
          braindumpInput.value += '\n\n' + prompt;
          braindumpInput.focus();
        };
      }
      
      promptsContainer.appendChild(promptElement);
    });
  }
  
  // Notify parent that sidebar is ready
  notifyParentReady() {
    window.parent.postMessage({ action: 'sidebarReady' }, '*');
  }
}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SidebarApp();
});

