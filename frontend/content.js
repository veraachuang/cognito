// content.js
let sidebarFrame = null;
let sidebarVisible = false;
let lastText = "";
let canvasPollingInterval;

console.log('[Cognito] Content script initialized');

function createSidebar() {
  if (sidebarFrame) return;

  sidebarFrame = document.createElement('iframe');
  sidebarFrame.src = chrome.runtime.getURL('sidebar.html');
  sidebarFrame.id = 'cognito-sidebar';
  sidebarFrame.style.cssText = `
    position: fixed;
    top: 0;
    right: -350px;
    width: 350px;
    height: 100vh;
    border: none;
    z-index: 9999;
    transition: right 0.3s ease;
  `;
  document.body.appendChild(sidebarFrame);
}

function toggleSidebar(activeTab = null) {
  if (!sidebarFrame) createSidebar();

  sidebarVisible = !sidebarVisible;
  sidebarFrame.style.right = sidebarVisible ? '0' : '-350px';

  const docsContent = document.querySelector('.docs-editor-container');
  const docsEditor = document.querySelector('.docs-editor');
  const docsContentWrapper = document.querySelector('.docs-content-wrapper');

  [docsContent, docsEditor, docsContentWrapper].forEach(el => {
    if (el) {
      el.style.width = sidebarVisible ? 'calc(100% - 350px)' : '100%';
      el.style.transition = 'width 0.3s ease';
    }
  });

  if (sidebarVisible) {
    setTimeout(() => startCanvasModePolling(), 1000);
  } else {
    clearInterval(canvasPollingInterval);
  }

  if (activeTab && sidebarVisible) {
    setTimeout(() => {
      if (sidebarFrame?.contentWindow) {
        sidebarFrame.contentWindow.postMessage({ action: 'switchTab', tab: activeTab }, '*');
      }
    }, 300);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleSidebar') {
    toggleSidebar(request.tab);
    sendResponse({ success: true });
  } else if (request.action === 'fetchDocText') {
    const text = getVisibleGoogleDocsText();
    sendResponse({ success: true, text });
  } else {
    sendResponse({ success: false, error: 'Unknown action' });
  }
  return true;
});

window.addEventListener('message', (event) => {
  if (event.source !== sidebarFrame?.contentWindow) return;
  const { action, data } = event.data;

  switch (action) {
    case 'closeSidebar':
      toggleSidebar();
      break;
    case 'uploadFiles':
      handleFileUpload(data.files);
      break;
    case 'applyOutline':
      applyOutlineToDoc(data.outline, data.cursor_position);
      break;
    case 'getCursorPosition':
      const position = getCursorPosition();
      sidebarFrame.contentWindow.postMessage({
        action: 'cursorPosition',
        position: position
      }, '*');
      break;
  }
});

function handleFileUpload(files) {
  console.log('[Cognito] Received files:', files);
}

function getCursorPosition() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    node: range.startContainer,
    offset: range.startOffset
  };
}

function applyOutlineToDoc(outline, cursorPosition) {
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

function getVisibleGoogleDocsText() {
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


function startCanvasModePolling() {
  clearInterval(canvasPollingInterval);

  canvasPollingInterval = setInterval(() => {
    const rawText = getVisibleGoogleDocsText();
    const text = rawText.replace(/\s+/g, ' ').trim();

    // Always log (optional for debug)
    console.log('[Cognito] Polling text:', text.slice(0, 100));

    const wordCount = text.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Always send message, even if text is the same
    if (sidebarFrame?.contentWindow) {
      sidebarFrame.contentWindow.postMessage({
        source: 'cognito-content',
        action: 'liveTextUpdate',
        data: text,
        features: {
          wordCount,
          readingTime: `${readingTime} min`
        }
      }, '*');

      console.log('[Cognito] Sent live text update');
    }

    // Save lastText if needed for fallback
    lastText = text;
  }, 2000);
}

