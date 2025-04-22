// text-processor.js - Text extraction and analysis functionality

console.log('[Cognito] Text processor module loaded');

/**
 * Extract text from Google Docs using DOM approach
 * @returns {string} Extracted text content
 */
export function getVisibleGoogleDocsText() {
  const container = document.querySelector('.kix-appview');
  if (!container) {
    console.warn('[Cognito] No .kix-appview container found');
    return '';
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const text = node.textContent.trim();
      return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  let text = '';
  while (walker.nextNode()) {
    text += walker.currentNode.textContent + ' ';
  }

  text = text.replace(/\s+/g, ' ').trim();
  if (!text) console.warn('[Cognito] Still found no text in doc');
  return text;
}

/**
 * Process and send text to sidebar
 * @param {string} text - Text content to process
 * @param {HTMLIFrameElement} sidebarFrame - Reference to sidebar iframe
 * @returns {string} Processed text
 */
export function processAndSendText(text, sidebarFrame) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Skip if text is empty
  if (!cleanText) {
    console.warn('[Cognito] No text to analyze');
    return '';
  }
  
  console.log('[Cognito] Processing text:', cleanText.slice(0, 100));
  
  const wordCount = cleanText.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  
  // Send to sidebar if available
  if (sidebarFrame?.contentWindow) {
    sidebarFrame.contentWindow.postMessage({
      source: 'cognito-content',
      action: 'liveTextUpdate',
      data: cleanText,
      features: {
        wordCount,
        readingTime: `${readingTime} min`
      }
    }, '*');
    
    console.log('[Cognito] Sent live text update');
  }
  
  return cleanText;
}

/**
 * Get cursor position in the document
 * @returns {Object|null} Object containing cursor position information or null
 */
export function getCursorPosition() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    position: selection.toString()
  };
}

/**
 * Apply outline to document
 * @param {Object} outline - Outline data
 * @param {Object} cursorPosition - Current cursor position
 */
export function applyOutlineToDoc(outline, cursorPosition) {
  const doc = document.querySelector('div[contenteditable="true"]');
  if (!doc) return;

  const outlineText = outline.sections.map((section, index) => {
    const keyPoints = section.key_points.map((point, i) => `  ${i + 1}. ${point}`).join('\n');
    return `${index + 1}. ${section.title}\n${keyPoints}`;
  }).join('\n\n');

  const outlineElement = document.createElement('div');
  outlineElement.textContent = outlineText;

  if (cursorPosition && cursorPosition.node) {
    const range = document.createRange();
    range.setStart(cursorPosition.node, cursorPosition.offset);
    range.insertNode(outlineElement);
  } else {
    doc.insertBefore(outlineElement, doc.firstChild);
  }
} 