// sidebar.js
async function getSecretKey() {
  const res = await fetch('http://localhost:3001/api/secret');
  const data = await res.json();
  console.log('Secret key:', data.key);
  return data.key;
}

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
  
  // File upload elements
  const fileInput = document.getElementById('file-input');
  const uploadButton = document.getElementById('upload-button');
  const uploadDropzone = document.getElementById('upload-dropzone');
  const uploadedFiles = document.getElementById('uploaded-files');
  
  // Outline elements
  const analyzeButton = document.getElementById('analyze-button');
  const outlineContainer = document.getElementById('outline-container');
  const regenerateOutlineBtn = document.getElementById('regenerate-outline');
  const applyOutlineBtn = document.getElementById('apply-outline');

  function switchTab(tabId) {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === tabId));

    if (tabId === 'braindump') {
      analyzeText(braindumpInput.value);
    }
  }

  // Automatically select the "upload" tab when the sidebar loads
  switchTab('upload');

  closeBtn.addEventListener('click', () => {
    window.parent.postMessage({ action: 'closeSidebar' }, '*');
  });

  tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  
  // Add event listener for the Analyze & Create Outline button
  if (analyzeButton) {
    analyzeButton.addEventListener('click', async () => {
      const text = braindumpInput.value.trim();
      
      if (!text) {
        alert('Please enter some text in the brain dump area first.');
        return;
      }
      
      // Show loading state
      analyzeButton.disabled = true;
      analyzeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      
      try {
        // Generate the outline
        const outline = await generateOutlineWithOpenAI(text);
        
        // Display the outline
        displayOutline(outline);
        
        // Switch to the outline tab
        switchTab('outline');
      } catch (error) {
        console.error('Error generating outline:', error);
        alert('Failed to generate outline. Please try again.');
      } finally {
        // Reset button state
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = 'Analyze & Create Outline';
      }
    });
  }
  
  // Add event listeners for outline action buttons
  if (regenerateOutlineBtn) {
    regenerateOutlineBtn.addEventListener('click', async () => {
      const text = braindumpInput.value.trim();
      if (text) {
        regenerateOutlineBtn.disabled = true;
        regenerateOutlineBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Regenerating...';
        
        try {
          const outline = await generateOutlineWithOpenAI(text);
          displayOutline(outline);
        } catch (error) {
          console.error('Error regenerating outline:', error);
        } finally {
          regenerateOutlineBtn.disabled = false;
          regenerateOutlineBtn.innerHTML = '<i class="fas fa-redo"></i> Regenerate';
        }
      }
    });
  }
  
  if (applyOutlineBtn) {
    applyOutlineBtn.addEventListener('click', () => {
      // Send message to apply the outline to the document
      window.parent.postMessage({ 
        action: 'applyOutline', 
        outline: outlineContainer.innerHTML 
      }, '*');
    });
  }

  // File upload handling
  if (uploadButton && fileInput) {
    uploadButton.addEventListener('click', () => {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
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
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  function handleFiles(files) {
    if (uploadedFiles) {
      for (const file of files) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        // Determine icon based on file type
        let fileIcon = 'fa-file';
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (extension === 'pdf') {
          fileIcon = 'fa-file-pdf';
        } else if (extension === 'doc' || extension === 'docx') {
          fileIcon = 'fa-file-word';
        } else if (extension === 'txt') {
          fileIcon = 'fa-file-lines';
        }
        
        fileItem.innerHTML = `
          <i class="fas ${fileIcon}" style="margin-right: 10px; color: var(--primary-text);"></i>
          <span>${file.name}</span>
          <span style="margin-left: auto; font-size: 12px; color: #666;">${formatFileSize(file.size)}</span>
          <button class="icon-button remove-file" style="margin-left: 8px;">
            <i class="fas fa-times"></i>
          </button>
        `;
        
        const removeButton = fileItem.querySelector('.remove-file');
        if (removeButton) {
          removeButton.addEventListener('click', () => {
            fileItem.remove();
          });
        }
        
        uploadedFiles.appendChild(fileItem);
      }
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }

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
      'Authorization': `Bearer ${await getSecretKey()}`
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

async function generateOutlineWithOpenAI(text) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getSecretKey()}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at creating essay outlines from rough ideas. Your role is to act as if you are the second brain of the user so you should write like their style. Generate a detailed outline with main points and supporting points organized as numbered points. Even with minimal input, create a logical structure that would help someone write an essay on the topic. Format the response as a simple numbered outline with main topics and subtopics only. The outline should serve as a prompt for users to write an essay on the topic.'
        },
        { 
          role: 'user', 
          content: `Based on these braindump notes, create a detailed essay outline with numbered points for main sections and sub-points:\n\n${text}`
        }
      ]
    })
  });
  
  const data = await res.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from OpenAI API');
  }
  
  return data.choices[0].message.content;
}

function displayOutline(outlineContent) {
  const outlineContainer = document.getElementById('outline-container');
  if (!outlineContainer) return;
  
  // Format the outline content
  let formattedContent = outlineContent;
  
  // If the content doesn't already have HTML formatting, add some basic structure
  if (!formattedContent.includes('<h') && !formattedContent.includes('<ul')) {
    formattedContent = formatOutlineText(formattedContent);
  }
  
  // Display the outline in the container (which already has a heading in the HTML)
  outlineContainer.innerHTML = formattedContent;
}

function formatOutlineText(text) {
  // Convert plain text outline to HTML
  // This is a simple formatter, it assumes a well-structured outline with lines
  
  const lines = text.split('\n').filter(line => line.trim());
  let html = '';
  
  // Determine if this is a nested outline format (using tabs, numbers, or bullets)
  const hasNumbers = lines.some(line => /^\d+\./.test(line.trim()));
  const hasBullets = lines.some(line => /^[•\-\*]/.test(line.trim()));
  const hasTabs = lines.some(line => /^\s+/.test(line));
  
  if (hasNumbers || hasBullets || hasTabs) {
    // Process as a nested outline
    let currentLevel = 0;
    let inList = false;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      const indentLevel = line.search(/\S|$/);
      const level = Math.floor(indentLevel / 2);
      
      // Check if this is a title/header line or a list item
      const isTitle = /^#/.test(trimmedLine) || (!hasNumbers && !hasBullets && level === 0);
      const isListItem = /^(\d+\.|\*|•|\-)/.test(trimmedLine);
      
      if (isTitle) {
        // Close any open list
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        
        // Determine header level (h2, h3, etc.)
        const headerLevel = Math.min(level + 3, 4);  // h3 to h4 (avoiding h2 which is used in the sidebar.html)
        const titleText = trimmedLine.replace(/^#+\s*/, '');
        html += `<h${headerLevel}>${titleText}</h${headerLevel}>`;
      } else {
        // Adjust list level if needed
        if (level > currentLevel) {
          // Start a new nested list
          html += '<ul>';
          inList = true;
        } else if (level < currentLevel && inList) {
          // Close current list level
          html += '</ul>';
        }
        
        // Add list item
        const itemText = isListItem ? trimmedLine.replace(/^(\d+\.|\*|•|\-)\s*/, '') : trimmedLine;
        html += `<li>${itemText}</li>`;
        
        currentLevel = level;
      }
    });
    
    // Close any open list
    if (inList) {
      html += '</ul>';
    }
  } else {
    // Simple format with sections - do not add an additional "Outline" header
    let currentSection = null;
    
    html += '<ul>';
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 3) {
        // This looks like a section header
        html += currentSection ? '</ul>' : '';
        html += `<h3>${trimmedLine}</h3><ul>`;
        currentSection = trimmedLine;
      } else {
        // This is a point under the current section
        if (!currentSection) {
          // Directly add to the list without an "Outline" header
          html += `<li>${trimmedLine}</li>`;
        } else {
          html += `<li>${trimmedLine}</li>`;
        }
      }
    });
    html += '</ul>';
  }
  
  return html;
}