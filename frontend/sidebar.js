// sidebar.js
async function getSecretKey() {
  const res = await fetch('http://localhost:3001/api/secret');
  const data = await res.json();
  console.log('Secret key:', data.key);
  return data.key;
}

document.getElementById("add-docs-button")?.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.doc,.docx";
  input.multiple = true;
  input.onchange = (e) => {
    const files = e.target.files;
    console.log("Files selected:", files);
  };
  input.click();
});


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
  switchTab('braindump');

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
      // Check if we have a document ID
      if (!DOC_ID) {
        alert('Error: No document ID found. Please try reloading the page.');
        console.error('[Cognito] Missing document ID when trying to apply outline');
        return;
      }
      
      // Show a loading indicator
      applyOutlineBtn.disabled = true;
      applyOutlineBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
      
      try {
        // Get the outline container
        const outlineContainer = document.getElementById('outline-container');
        if (!outlineContainer) {
          throw new Error('Outline container not found');
        }
        
        // Process the outline content with proper formatting
        let cleanedText = processOutlineForDocument(outlineContainer);
        
        if (!cleanedText.trim()) {
          throw new Error('No outline content found. Please generate an outline first.');
        }
        
        // Add a title at the top
        cleanedText = "OUTLINE\n\n" + cleanedText;
        
        console.log('[Cognito] Extracted outline length:', cleanedText.length);
        console.log('[Cognito] Preview:', cleanedText.substring(0, 100) + '...');
        
        // Send a simpler message with the plain text outline
        window.parent.postMessage({
          action: 'applyOutline',
          outline: cleanedText,
          docId: DOC_ID
        }, '*');
        
        console.log('[Cognito] Simple text outline sent to parent window');
      } catch (error) {
        console.error('[Cognito] Error preparing outline:', error);
        alert(`Error: ${error.message || 'Unknown error preparing outline'}`);
      } finally {
        // Reset button after a short delay
        setTimeout(() => {
          applyOutlineBtn.disabled = false;
          applyOutlineBtn.innerHTML = '<i class="fas fa-file-alt"></i> Apply to Document';
        }, 2000);
      }
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
        statusEl.textContent = "Analyzing...";
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

// Add a debounce utility at the top of the file
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Add a variable to store the last analysis text to avoid redundant API calls
let lastAnalyzedText = '';

// Replace the analyzeText function
function analyzeText(text) {
  // Immediately update word count which doesn't need AI
  const wordCount = text.trim().split(/\s+/).length;
  document.getElementById('word-count').textContent = wordCount || 0;
  
  // For very short texts, don't make API calls yet
  if (wordCount < 5) {
    document.getElementById('reading-time').textContent = '< 1 min';
    document.getElementById('grade-level').textContent = '-';
    document.getElementById('writing-style').textContent = '-';
    return;
  }

  // If the text is the same as what we last analyzed, don't repeat the API call
  if (text === lastAnalyzedText) return;
  
  // Check if writer is stuck for prompts (still using client-side detection for faster response)
  if (isWriterStuck(text)) generateWritingPrompts();
  
  // Debounced version of detailed analysis with OpenAI
  debouncedAnalyzeWithAI(text);
}

// Create a debounced version of the AI analysis function to avoid excessive API calls
const debouncedAnalyzeWithAI = debounce(async (text) => {
  try {
    // Show loading indicators
    document.getElementById('reading-time').textContent = '...';
    document.getElementById('grade-level').textContent = '...';
    document.getElementById('writing-style').textContent = '...';
    
    // Make API call for quick, lightweight analysis
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getSecretKey()}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Using a faster model for real-time feedback
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert writing analyzer. Return a JSON object with the following keys: reading_time_minutes (number), grade_level (number), writing_style (string: "Academic", "Conversational", or "Balanced"). Be concise and return only valid JSON.'
          },
          { 
            role: 'user', 
            content: `Analyze this text for reading time, grade level, and style. Keep it quick and simple:\n\n${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}` 
          }
        ]
      })
    });
    
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('Invalid API response');
    
    // Parse the response
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      // If JSON parsing fails, try to extract values with regex
      const readingTimeMatch = content.match(/reading_time_minutes"?\s*:\s*(\d+)/);
      const gradeLevelMatch = content.match(/grade_level"?\s*:\s*(\d+)/);
      const styleMatch = content.match(/writing_style"?\s*:\s*"([^"]+)"/);
      
      analysis = {
        reading_time_minutes: readingTimeMatch ? parseInt(readingTimeMatch[1]) : 1,
        grade_level: gradeLevelMatch ? parseInt(gradeLevelMatch[1]) : 8,
        writing_style: styleMatch ? styleMatch[1] : 'Balanced'
      };
    }
    
    // Update the UI with analysis results
    document.getElementById('reading-time').textContent = `${analysis.reading_time_minutes || 1} min`;
    document.getElementById('grade-level').textContent = analysis.grade_level || '-';
    document.getElementById('writing-style').textContent = analysis.writing_style || 'Balanced';
    
    // Store the analyzed text to avoid redundant API calls
    lastAnalyzedText = text;
    
  } catch (error) {
    console.error('Error analyzing text with AI:', error);
    
    // Fall back to the original calculations if API fails
    const wordCount = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    const gradeLevel = calculateGradeLevel(text);
    const writingStyle = analyzeWritingStyle(text);
    
    document.getElementById('reading-time').textContent = `${readingTime} min`;
    document.getElementById('grade-level').textContent = gradeLevel;
    document.getElementById('writing-style').textContent = writingStyle;
  }
}, 1000); // 1 second debounce to avoid excessive API calls

// Keep these functions as fallbacks in case the API calls fail
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
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(1, words.length);
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
          content: 'You are an expert at creating essay outlines from rough ideas. Your role is to act as if you are the second brain of the user so you should write like their style. Generate a detailed outline with main sections and supporting points. Even with minimal input, create a logical structure that would help someone write an essay on the topic. Format the response as follows:\n\n1. Use bold section titles (like "Introduction", "Body", "Conclusion") without Roman numerals\n2. For first-level points, use numbers (1., 2., 3.)\n3. For second-level points, use letters (a., b., c.)\n4. For third-level points, use lowercase Roman numerals (i., ii., iii.)\n\nThe outline should serve as a prompt for users to write an essay on the topic.'
        },
        { 
          role: 'user', 
          content: `Based on these braindump notes, create a detailed essay outline with the format described:\n\n${text}`
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
  // Convert plain text outline to HTML with improved formatting
  
  const lines = text.split('\n').filter(line => line.trim());
  let html = '';
  
  // Create a pattern for Roman numerals followed by a period or dot
  const romanNumeralPattern = /^(I{1,3}|IV|V|VI{1,3}|IX|X)\.?\s+/;
  // Pattern for lettered points (A., B., etc.)
  const letterPattern = /^[A-Z]\.?\s+/;
  // Pattern for bullet points
  const bulletPattern = /^[•■▪★○◦*-]\s+/;
  // Pattern for numbered points
  const numberPattern = /^\d+\.?\s+/;
  // Pattern for subheadings with asterisks - match single or double asterisks
  const asteriskPattern = /^\*{1,2}([^*]+)\*{1,2}$/;
  // Look for bold text with asterisks in the middle of content
  const inlineBoldPattern = /\*{1,2}([^*]+)\*{1,2}/g;
  
  // Find what types of markers are in the outline
  const hasRomanNumerals = lines.some(line => romanNumeralPattern.test(line.trim()));
  const hasLetters = lines.some(line => letterPattern.test(line.trim()));
  const hasBullets = lines.some(line => bulletPattern.test(line.trim()));
  const hasNumbers = lines.some(line => numberPattern.test(line.trim()));
  
  // Start the outline
  html = '<ul class="outline-root">';
  
  // Keep track of the current nesting level
  let currentLevel = 0;
  let activeListsStack = ['ul']; // Start with the root ul
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return;
    
    // Check for subheadings with asterisks first (e.g., **Introduction**)
    const asteriskMatch = trimmedLine.match(asteriskPattern);
    if (asteriskMatch) {
      // Close any open lists before adding the subheading
      while (activeListsStack.length > 1) {
        html += `</${activeListsStack.pop()}>`;
      }
      
      // Add subheading as a section title without the asterisks
      html += `<li><span class="section-title">${asteriskMatch[1].trim()}</span></li>`;
      currentLevel = 0;
      return;
    }
    
    // Determine the level and type of this line
    let level = 0;
    let lineContent = trimmedLine;
    let marker = null;
    let isRomanNumeral = false;
    
    // Check for Roman numerals (highest level)
    if (romanNumeralPattern.test(trimmedLine)) {
      level = 0;
      marker = trimmedLine.match(romanNumeralPattern)[0];
      lineContent = trimmedLine.replace(romanNumeralPattern, '');
      isRomanNumeral = true;
    }
    // Check for letters (second level)
    else if (letterPattern.test(trimmedLine)) {
      level = 1;
      marker = trimmedLine.match(letterPattern)[0];
      lineContent = trimmedLine.replace(letterPattern, '');
    }
    // Check for bullet points (could be any level)
    else if (bulletPattern.test(trimmedLine)) {
      // Determine level by checking for indentation
      const indentLevel = line.search(/\S|$/);
      level = Math.floor(indentLevel / 2) + 1;
      marker = trimmedLine.match(bulletPattern)[0];
      lineContent = trimmedLine.replace(bulletPattern, '');
    }
    // Check for numbered points
    else if (numberPattern.test(trimmedLine)) {
      // Determine level by checking for indentation
      const indentLevel = line.search(/\S|$/);
      level = Math.floor(indentLevel / 2) + 1;
      marker = trimmedLine.match(numberPattern)[0];
      lineContent = trimmedLine.replace(numberPattern, '');
    }
    // Special case for lines that are indented but don't have markers
    else {
      const indentLevel = line.search(/\S|$/);
      level = Math.floor(indentLevel / 2);
    }
    
    // Handle list nesting
    if (level > currentLevel) {
      // We need to open new nested lists
      for (let i = currentLevel; i < level; i++) {
        html += '<ul>';
        activeListsStack.push('ul');
      }
    } else if (level < currentLevel) {
      // We need to close some lists
      for (let i = currentLevel; i > level; i--) {
        html += `</${activeListsStack.pop()}>`;
      }
    }
    
    // Process any inline bold text (with asterisks) and replace with proper <strong> tags
    lineContent = lineContent.replace(inlineBoldPattern, '<strong>$1</strong>');
    
    // Add the list item with appropriate formatting based on the marker type
    if (isRomanNumeral) {
      // For Roman numerals, use section-title class without showing the numeral
      html += `<li><span class="section-title">${lineContent}</span></li>`;
    } else if (marker && numberPattern.test(marker)) {
      // For numbered points, add as numbered-entry to retain number
      html += `<li class="numbered-entry"><span class="outline-marker">${marker}</span>${lineContent}</li>`;
    } else if (marker && letterPattern.test(marker)) {
      // For lettered points
      html += `<li><span class="outline-marker">${marker}</span>${lineContent}</li>`;
    } else {
      // For all other levels
      html += `<li>${marker ? `<span class="outline-marker">${marker}</span>` : ''}${lineContent}</li>`;
    }
    
    // Update the current level
    currentLevel = level;
  });
  
  // Close any remaining open lists
  for (let i = 0; i < activeListsStack.length; i++) {
    html += `</${activeListsStack[activeListsStack.length - i - 1]}>`;
  }
  
  return html;
}

// New function to process outline for document insertion with proper line breaks
function processOutlineForDocument(container) {
  // Get all list items from the outline container
  const listItems = container.querySelectorAll('li');
  let result = '';
  
  // Process each list item to create properly formatted text
  listItems.forEach(item => {
    // Determine the indentation level based on parent UL nesting
    let level = 0;
    let parent = item.parentElement;
    while (parent && parent !== container) {
      if (parent.tagName === 'UL') level++;
      parent = parent.parentElement;
    }
    
    // Create proper indentation
    const indent = '  '.repeat(Math.max(0, level - 1));
    
    // Get the item text, preserving any markers
    let itemText = '';
    const marker = item.querySelector('.outline-marker');
    const sectionTitle = item.querySelector('.section-title');
    
    if (sectionTitle) {
      // For section titles, use uppercase and no additional formatting
      itemText = sectionTitle.textContent.trim();
      // Bold section headers by adding a blank line before (if not the first item)
      if (result) result += '\n';
      result += `${itemText}\n`;
    } else {
      // For regular items, include any marker if present
      if (marker) {
        itemText = `${marker.textContent} ${item.textContent.replace(marker.textContent, '').trim()}`;
      } else {
        itemText = item.textContent.trim();
      }
      
      // Add to the result with proper indentation
      result += `${indent}${itemText}\n`;
    }
  });
  
  return result;
}