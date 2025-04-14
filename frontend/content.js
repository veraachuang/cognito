// Create and inject the sidebar iframe
let sidebarFrame = null;
let sidebarVisible = false;
let shadowRoot = null;
let observer = null;

// Initialize the content script
console.log('Content script initialized');

function createShadowContainer() {
  const container = document.createElement('div');
  container.id = 'cognito-container';
  shadowRoot = container.attachShadow({ mode: 'open' });
  document.body.appendChild(container);
  return shadowRoot;
}

function createSidebar() {
  if (sidebarFrame) {
    console.log('Sidebar already exists');
    return;
  }
  
  console.log('Creating sidebar iframe');
  
  // Create shadow DOM if it doesn't exist
  if (!shadowRoot) {
    shadowRoot = createShadowContainer();
  }

  // Create styles for shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    .cognito-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 350px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      transition: transform 0.3s ease;
    }
  `;
  shadowRoot.appendChild(style);

  // Create sidebar container
  const sidebarContainer = document.createElement('div');
  sidebarContainer.className = 'cognito-sidebar';
  
  // Create and setup iframe
  sidebarFrame = document.createElement('iframe');
  sidebarFrame.src = chrome.runtime.getURL('sidebar.html');
  sidebarFrame.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: white;
  `;
  
  sidebarContainer.appendChild(sidebarFrame);
  shadowRoot.appendChild(sidebarContainer);
  
  console.log('Sidebar iframe created and appended');
  
  // Start observing for Google Docs container
  setupDocsObserver();
}

function setupDocsObserver() {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations, obs) => {
    const docsContainer = document.querySelector('.kix-appview-editor');
    if (docsContainer) {
      obs.disconnect();
      adjustDocsLayout();
      
      // Continue observing for dynamic changes
      observer = new MutationObserver(() => adjustDocsLayout());
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function adjustDocsLayout() {
  const containers = [
    '.kix-appview-editor',
    '.docs-toolbar-wrapper',
    '.docs-titlebar-badges',
    '.docs-horizontal-ruler'
  ];

  const margin = sidebarVisible ? '350px' : '0';
  
  containers.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.marginRight = margin;
      element.style.width = sidebarVisible ? 'calc(100% - 350px)' : '100%';
      element.style.transition = 'all 0.3s ease';
    }
  });

  // Handle the document page container specifically
  const pageContainer = document.querySelector('.kix-page');
  if (pageContainer) {
    pageContainer.style.marginRight = margin;
    pageContainer.style.transition = 'margin 0.3s ease';
  }
}

function toggleSidebar(activeTab = null) {
  console.log('Toggling sidebar, activeTab:', activeTab);
  
  if (!sidebarFrame) {
    console.log('No sidebar frame found, creating one');
    createSidebar();
  }

  sidebarVisible = !sidebarVisible;
  console.log('Setting sidebar visibility:', sidebarVisible);
  
  // Animate sidebar
  const sidebarContainer = shadowRoot.querySelector('.cognito-sidebar');
  if (sidebarContainer) {
    sidebarContainer.style.transform = `translateX(${sidebarVisible ? '0' : '350px'})`;
  }

  // Adjust Google Docs layout
  adjustDocsLayout();

  if (activeTab && sidebarVisible) {
    console.log('Switching to tab:', activeTab);
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
    const response = await fetch('http://localhost:5000/api/upload', {
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
  if (!doc) return;

  // Create outline text
  const outlineText = outline.sections.map((section, index) => {
    const keyPoints = section.key_points.map((point, i) => `  ${i + 1}. ${point}`).join('\n');
    return `${index + 1}. ${section.title}\n${keyPoints}`;
  }).join('\n\n');
  
  // Create a new div with the outline
  const outlineElement = document.createElement('div');
  outlineElement.textContent = outlineText;
  
  if (cursorPosition && cursorPosition.node) {
    // Insert at cursor position
    const range = document.createRange();
    range.setStart(cursorPosition.node, cursorPosition.offset);
    range.insertNode(outlineElement);
  } else {
    // Insert at the beginning
    doc.insertBefore(outlineElement, doc.firstChild);
  }
} 