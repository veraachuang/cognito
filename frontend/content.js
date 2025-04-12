// Create and inject the sidebar iframe
let sidebarFrame = null;
let sidebarVisible = false;

function createSidebar() {
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
  if (!sidebarFrame) {
    createSidebar();
  }

  sidebarVisible = !sidebarVisible;
  sidebarFrame.style.right = sidebarVisible ? '0' : '-350px';

  if (activeTab) {
    sidebarFrame.contentWindow.postMessage({ action: 'switchTab', tab: activeTab }, '*');
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleSidebar') {
    toggleSidebar(request.tab);
  }
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
      applyOutlineToDoc(data.outline);
      break;
  }
});

// Function to handle file uploads
async function handleFileUpload(files) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  try {
    const response = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    sidebarFrame.contentWindow.postMessage({
      action: 'uploadComplete',
      success: true,
      data: result
    }, '*');
  } catch (error) {
    sidebarFrame.contentWindow.postMessage({
      action: 'uploadComplete',
      success: false,
      error: error.message
    }, '*');
  }
}

// Function to apply the generated outline to the Google Doc
function applyOutlineToDoc(outline) {
  // This function will need to use Google Docs API to insert the outline
  // For MVP, we'll just insert it at the cursor position
  const doc = document.querySelector('div[contenteditable="true"]');
  if (!doc) return;

  // Create outline text
  const outlineText = outline.map((item, index) => `${index + 1}. ${item}`).join('\n');
  
  // Create a new div with the outline
  const outlineElement = document.createElement('div');
  outlineElement.textContent = outlineText;
  
  // Insert at cursor position or at the beginning
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.insertNode(outlineElement);
  } else {
    doc.insertBefore(outlineElement, doc.firstChild);
  }
} 