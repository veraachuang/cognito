// Create and inject the sidebar iframe
let sidebarFrame = null;
let sidebarVisible = false;

// Initialize the content script
console.log('Content script initialized');

function createSidebar() {
  if (sidebarFrame) {
    console.log('Sidebar already exists');
    return;
  }
  
  console.log('Creating sidebar iframe');
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
  console.log('Sidebar iframe created and appended');
}

function toggleSidebar(activeTab = null) {
  console.log('Toggling sidebar, activeTab:', activeTab);
  
  if (!sidebarFrame) {
    console.log('No sidebar frame found, creating one');
    createSidebar();
  }

  sidebarVisible = !sidebarVisible;
  console.log('Setting sidebar visibility:', sidebarVisible);
  sidebarFrame.style.right = sidebarVisible ? '0' : '-350px';

  // Adjust the Google Docs layout
  const docsContent = document.querySelector('.docs-editor-container');
  const docsEditor = document.querySelector('.docs-editor');
  const docsContentWrapper = document.querySelector('.docs-content-wrapper');
  
  if (docsContent) {
    docsContent.style.width = sidebarVisible ? 'calc(100% - 350px)' : '100%';
    docsContent.style.transition = 'width 0.3s ease';
  }
  
  if (docsEditor) {
    docsEditor.style.width = sidebarVisible ? 'calc(100% - 350px)' : '100%';
    docsEditor.style.transition = 'width 0.3s ease';
  }
  
  if (docsContentWrapper) {
    docsContentWrapper.style.width = sidebarVisible ? 'calc(100% - 350px)' : '100%';
    docsContentWrapper.style.transition = 'width 0.3s ease';
  }

  if (activeTab && sidebarVisible) {
    console.log('Switching to tab:', activeTab);
    // Wait for the sidebar to be visible before switching tabs
    setTimeout(() => {
      if (sidebarFrame && sidebarFrame.contentWindow) {
        sidebarFrame.contentWindow.postMessage({ action: 'switchTab', tab: activeTab }, '*');
        console.log('Tab switch message sent');
      } else {
        console.error('Sidebar frame or contentWindow not available');
      }
    }, 300);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'toggleSidebar') {
    console.log('Handling toggleSidebar action');
    toggleSidebar(request.tab);
    sendResponse({ success: true });
  } else {
    console.log('Unknown action:', request.action);
    sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true; // Keep the message channel open for async response
});

// Listen for messages from the sidebar iframe
window.addEventListener('message', (event) => {
  // Make sure the message is from our sidebar
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

// Function to handle file uploads
async function handleFileUpload(files) {
  console.log('Starting file upload');
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  try {
    const response = await fetch('http://localhost:5001/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Upload successful:', result);
    sidebarFrame.contentWindow.postMessage({
      action: 'uploadComplete',
      success: true,
      data: result
    }, '*');
  } catch (error) {
    console.error('Upload failed:', error);
    sidebarFrame.contentWindow.postMessage({
      action: 'uploadComplete',
      success: false,
      error: error.message
    }, '*');
  }
}

// Function to get cursor position in Google Doc
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

// Function to apply the generated outline to the Google Doc
function applyOutlineToDoc(outline, cursorPosition) {
  const doc = document.querySelector('div[contenteditable="true"]');
  if (!doc) {
    console.error('Could not find editable document');
    return;
  }

  // Create outline text with proper formatting
  const outlineText = outline.sections.map((section, index) => {
    const keyPoints = section.key_points.map((point, i) => `  ${i + 1}. ${point}`).join('\n');
    const lengthInfo = section.suggested_length ? `\n  Suggested length: ${section.suggested_length} words` : '';
    return `${index + 1}. ${section.title}${lengthInfo}\n${keyPoints}`;
  }).join('\n\n');

  // Create a new div with the outline
  const outlineElement = document.createElement('div');
  outlineElement.style.whiteSpace = 'pre-wrap';
  outlineElement.style.marginBottom = '20px';
  outlineElement.textContent = outlineText;

  try {
    if (cursorPosition && cursorPosition.node) {
      // Insert at cursor position
      const range = document.createRange();
      range.setStart(cursorPosition.node, cursorPosition.offset);
      range.insertNode(outlineElement);
    } else {
      // Insert at the beginning of the document
      doc.insertBefore(outlineElement, doc.firstChild);
    }

    // Add a separator after the outline
    const separator = document.createElement('hr');
    separator.style.margin = '20px 0';
    doc.insertBefore(separator, outlineElement.nextSibling);

    console.log('Outline successfully applied to document');
  } catch (error) {
    console.error('Error applying outline:', error);
  }
} 