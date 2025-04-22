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
    if (!text) return { sentences: [], paragraphs: [] };
    
    // Split into paragraphs (handle both \n and \r\n)
    const paragraphs = text.split(/\r?\n/).filter(p => p.trim().length > 0);
    
    // Better sentence detection using regex
    const sentenceRegex = /[^.!?]+[.!?]+|\s+[A-Z][^.!?]*$/g;
    let sentences = [];
    
    paragraphs.forEach(para => {
      const paraMatches = para.match(sentenceRegex) || [];
      sentences = sentences.concat(paraMatches.map(s => s.trim()).filter(s => s.length > 0));
    });
    
    return {
      sentences: sentences,
      paragraphs: paragraphs,
      wordCount: text.split(/\s+/).filter(w => w.trim().length > 0).length,
      characterCount: text.replace(/\s+/g, '').length
    };
  }
  
  // Calculate various text metrics
  calculateTextMetrics(parsed) {
    const { sentences, paragraphs, wordCount, characterCount } = parsed;
    
    // Basic metrics
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed
    
    // Calculate average sentence length
    const avgSentenceLength = sentences.length ? 
      sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).filter(w => w.trim().length > 0).length, 0) / sentences.length : 0;
    
    // Calculate average paragraph length
    const avgParagraphLength = paragraphs.length ?
      paragraphs.reduce((sum, para) => sum + para.split(/\s+/).filter(w => w.trim().length > 0).length, 0) / paragraphs.length : 0;
    
    // Calculate average word length
    const words = parsed.sentences.join(' ').split(/\s+/).filter(w => w.trim().length > 0);
    const avgWordLength = words.length ?
      words.reduce((sum, word) => sum + word.replace(/[^a-zA-Z]/g, '').length, 0) / words.length : 0;
    
    // Estimate Flesch-Kincaid grade level
    const fleschKincaid = this.calculateFleschKincaid(sentences, wordCount);
    
    // Determine writing style based on metrics
    const writingStyle = this.determineWritingStyle(avgSentenceLength, avgWordLength);
    
    // Calculate vocabulary metrics
    const vocabLevel = this.calculateVocabularyLevel(words);
    
    // Calculate sentence structure score
    const sentenceStructure = this.calculateSentenceStructure(sentences);
    
    // Calculate clarity score
    const clarityScore = this.calculateClarityScore(avgSentenceLength, avgWordLength, fleschKincaid);
    
    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(sentences, paragraphs, words);
    
    return {
      wordCount,
      characterCount,
      readingTime: `${readingTime} min`,
      gradeLevel: fleschKincaid.toFixed(1),
      writingStyle,
      vocabularyLevel: vocabLevel.toFixed(1),
      sentenceStructure: sentenceStructure.toFixed(1),
      clarityScore: clarityScore.toFixed(1),
      engagementScore: engagementScore.toFixed(1)
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
    if (readingTime) readingTime.textContent = analysis.readingTime;
    if (gradeLevel) gradeLevel.textContent = analysis.gradeLevel;
    if (writingStyle) writingStyle.textContent = analysis.writingStyle;
    
    // Update advanced metrics
    if (vocabularyLevel) vocabularyLevel.textContent = analysis.vocabularyLevel;
    if (sentenceStructure) sentenceStructure.textContent = analysis.sentenceStructure;
    if (clarityScore) clarityScore.textContent = analysis.clarityScore;
    if (engagementScore) engagementScore.textContent = analysis.engagementScore;
    
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
  determineWritingStyle(avgSentenceLength, avgWordLength) {
    if (avgSentenceLength < 10) {
      return avgWordLength < 4.5 ? 'Concise' : 'Technical';
    } else if (avgSentenceLength < 18) {
      return avgWordLength < 4.5 ? 'Conversational' : 'Balanced';
    } else {
      return avgWordLength < 4.5 ? 'Narrative' : 'Academic';
    }
  }
  
  // Update analysis tab with new text
  updateAnalysisTab(text) {
    if (!text || text.trim() === '') {
      console.warn('[Cognito] Empty text received, skipping analysis');
      return;
    }
    
    try {
      console.log('[Cognito] Analyzing text:', text.slice(0, 100) + '...');
      
      // Parse the text into sentences and paragraphs
      const parsed = this.parseText(text);
      
      // Calculate metrics based on the parsed text
      const analysis = this.calculateTextMetrics(parsed);
      
      // Update the UI with the analysis results
      this.updateAnalysisDisplay(analysis);
      
      // Check if writer might be stuck and provide suggestions
      const isStuck = this.isWriterStuck(text, parsed);
      if (isStuck) {
        this.showWritingPrompts();
      }
    } catch (error) {
      console.error('[Cognito] Error analyzing text:', error);
      // Gracefully handle analysis errors by showing basic metrics
      this.showAnalysisError();
    }
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
  
  // Show analysis error gracefully
  showAnalysisError() {
    const elements = [
      'writing-style', 'vocabulary-level', 'sentence-structure', 
      'clarity-score', 'engagement-score'
    ];
    
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = 'Analysis unavailable';
      }
    });
    
    const recommendationsContainer = document.getElementById('recommendations-container');
    if (recommendationsContainer) {
      recommendationsContainer.innerHTML = '<p>Unable to analyze the document. Please try again or ensure there is enough text in the document for meaningful analysis.</p>';
    }
  }
  
  // Calculate Flesch-Kincaid grade level
  calculateFleschKincaid(sentences, wordCount) {
    if (!sentences.length || !wordCount) return 0;
    
    const sentenceCount = sentences.length;
    const syllableCount = this.estimateSyllableCount(sentences.join(' '));
    
    // Flesch-Kincaid Grade Level formula
    return 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;
  }

  // Estimate syllable count - improved algorithm
  estimateSyllableCount(text) {
    if (!text) return 0;
    
    // Remove non-alphabetic characters and split into words
    const words = text.replace(/[^a-zA-Z\s]/g, '').toLowerCase().split(/\s+/);
    
    let syllableCount = 0;
    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    
    words.forEach(word => {
      // Count vowel groups in the word
      let count = 0;
      let prevIsVowel = false;
      
      for (let i = 0; i < word.length; i++) {
        const isVowel = vowels.includes(word[i]);
        if (isVowel && !prevIsVowel) {
          count++;
        }
        prevIsVowel = isVowel;
      }
      
      // Apply syllable counting rules
      if (word.length > 3) {
        // Handle silent e at the end
        if (word.endsWith('e') && !word.endsWith('le')) {
          count--;
        }
        
        // Handle words ending with 'y'
        if (word.endsWith('y') && !vowels.includes(word[word.length - 2])) {
          count++;
        }
        
        // Handle certain suffixes
        if (word.endsWith('es') || word.endsWith('ed')) {
          count--;
        }
      }
      
      // Ensure at least one syllable per word
      syllableCount += Math.max(1, count);
    });
    
    return syllableCount;
  }

  // Calculate vocabulary level (1-10 scale)
  calculateVocabularyLevel(words) {
    if (!words.length) return 0;
    
    // Count unique words
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const uniqueRatio = uniqueWords.size / words.length;
    
    // Calculate average word length
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Composite score based on uniqueness and length
    return (uniqueRatio * 5) + (avgWordLength / 10 * 5);
  }

  // Calculate sentence structure score (1-10 scale)
  calculateSentenceStructure(sentences) {
    if (!sentences.length) return 0;
    
    // Calculate sentence length diversity
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((sum, len) => sum + len, 0) / sentenceLengths.length;
    
    // Calculate standard deviation of sentence lengths
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Check for sentence beginnings diversity
    const beginnings = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase()).filter(Boolean);
    const uniqueBeginnings = new Set(beginnings);
    const beginningsDiversity = uniqueBeginnings.size / Math.max(1, beginnings.length);
    
    // Composite score
    return (stdDev / 5 * 5) + (beginningsDiversity * 5);
  }

  // Calculate clarity score (1-10 scale)
  calculateClarityScore(avgSentenceLength, avgWordLength, gradeLevel) {
    // Ideal ranges
    const idealSentenceLength = 15; // Target average sentence length
    const idealWordLength = 4.5;    // Target average word length
    const idealGradeLevel = 9.0;    // Target grade level (accessible but not simplistic)
    
    // Calculate deviations from ideal
    const sentenceLengthFactor = 1 - Math.min(1, Math.abs(avgSentenceLength - idealSentenceLength) / 10);
    const wordLengthFactor = 1 - Math.min(1, Math.abs(avgWordLength - idealWordLength) / 2);
    const gradeLevelFactor = 1 - Math.min(1, Math.abs(gradeLevel - idealGradeLevel) / 5);
    
    // Weighted composite score
    return (sentenceLengthFactor * 0.4 + wordLengthFactor * 0.3 + gradeLevelFactor * 0.3) * 10;
  }

  // Calculate engagement score (1-10 scale)
  calculateEngagementScore(sentences, paragraphs, words) {
    if (!sentences.length || !paragraphs.length || !words.length) return 0;
    
    // Check for question marks and exclamation points (engagement)
    const engagingPunctuation = sentences.filter(s => s.includes('?') || s.includes('!')).length / sentences.length;
    
    // Check paragraph length diversity
    const paragraphLengths = paragraphs.map(p => p.split(/\s+/).length);
    const avgParaLength = paragraphLengths.reduce((sum, len) => sum + len, 0) / paragraphLengths.length;
    const paraVariance = paragraphLengths.reduce((sum, len) => sum + Math.pow(len - avgParaLength, 2), 0) / paragraphLengths.length;
    const paraStdDev = Math.sqrt(paraVariance);
    const paragraphDiversity = Math.min(1, paraStdDev / 5);
    
    // Check for transition words that improve flow
    const transitionWords = ['however', 'therefore', 'furthermore', 'moreover', 'meanwhile', 'nevertheless', 'although', 'despite', 'accordingly', 'consequently', 'thus', 'indeed', 'instead', 'meanwhile', 'nonetheless', 'similarly', 'whereas', 'conversely'];
    const lowerText = words.join(' ').toLowerCase();
    const transitionCount = transitionWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      return count + (lowerText.match(regex) || []).length;
    }, 0);
    const transitionRatio = Math.min(1, transitionCount / (words.length / 50));
    
    // Composite score
    return (engagingPunctuation * 3 + paragraphDiversity * 3 + transitionRatio * 4) * 1.0;
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

