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

  // Initialize active tab
  let activeTab = 'upload';

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
      const response = await fetch('http://localhost:5001/api/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({ 
          text,
          cursor_position: cursorPosition
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate outline');
      }

      const data = await response.json();
      console.log('Received outline data:', data); // Debug log
      
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
    console.log('Displaying outline:', outline); // Debug log
    
    if (!outline || !outline.sections) {
      console.error('Invalid outline data:', outline);
      outlineContainer.innerHTML = '<p class="error">Failed to generate outline. Please try again.</p>';
      return;
    }

    // Clear any existing content
    outlineContainer.innerHTML = '';

    // Create the outline sections container
    const outlineSections = document.createElement('div');
    outlineSections.className = 'outline-sections';

    // Add sections
    outline.sections.forEach((section, index) => {
      if (!section || !section.title) {
        console.warn('Invalid section:', section);
        return;
      }

      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'outline-section';
      
      // Add section title with suggested length
      const title = document.createElement('h3');
      title.textContent = `${index + 1}. ${section.title}`;
      if (section.suggested_length) {
        const lengthSpan = document.createElement('span');
        lengthSpan.className = 'suggested-length';
        lengthSpan.textContent = ` (${section.suggested_length} words)`;
        title.appendChild(lengthSpan);
      }
      sectionDiv.appendChild(title);

      // Add key points if they exist
      if (section.key_points && section.key_points.length > 0) {
        const pointsList = document.createElement('ul');
        pointsList.className = 'key-points';
        section.key_points.forEach(point => {
          if (point) { // Only add non-empty points
            const li = document.createElement('li');
            li.textContent = point;
            pointsList.appendChild(li);
          }
        });
        sectionDiv.appendChild(pointsList);
      }

      outlineSections.appendChild(sectionDiv);
    });

    // Add total length if available
    if (outline.total_suggested_length) {
      const totalLength = document.createElement('div');
      totalLength.className = 'total-length';
      const totalText = document.createElement('p');
      totalText.textContent = `Total suggested length: ${outline.total_suggested_length} words`;
      totalLength.appendChild(totalText);
      outlineSections.appendChild(totalLength);
    }

    // Add the outline to the container
    outlineContainer.appendChild(outlineSections);

    // Make sure the outline tab is visible
    const outlineTab = document.getElementById('outline');
    if (outlineTab) {
      outlineTab.style.display = 'block';
      
      // Update tab button state
      const tabButtons = document.querySelectorAll('.tab-button');
      tabButtons.forEach(button => {
        if (button.dataset.tab === 'outline') {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
    }

    // Add debug log to check if outline is being added
    console.log('Outline container contents:', outlineContainer.innerHTML);
  }

  regenerateOutline.addEventListener('click', () => {
    analyzeButton.click();
  });

  applyOutline.addEventListener('click', () => {
    const outlineSections = document.querySelectorAll('.outline-section');
    const outlineData = Array.from(outlineSections).map(section => {
      const title = section.querySelector('h3').textContent.replace(/^\d+\.\s/, '');
      const points = Array.from(section.querySelectorAll('.key-points li')).map(li => li.textContent);
      return {
        title,
        key_points: points,
        suggested_length: section.querySelector('.suggested-length')?.textContent.replace('Suggested length: ', '').replace(' words', '')
      };
    });

    window.parent.postMessage({
      action: 'applyOutline',
      data: { 
        outline: {
          sections: outlineData,
          total_suggested_length: document.querySelector('.total-length p')?.textContent.replace('Total suggested length: ', '').replace(' words', '')
        }
      }
    }, '*');
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