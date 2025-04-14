// Create and inject the sidebar iframe
let sidebarFrame = null;
let sidebarVisible = false;
let shadowRoot = null;
let docsObserver = null;
let genericObserver = null;
let layoutDebounceTimer = null;

// Initialize the content script
console.log('Content script initialized');

// Cleanup function for observers and elements
function cleanup() {
  if (docsObserver) {
    docsObserver.disconnect();
    docsObserver = null;
  }
  if (genericObserver) {
    genericObserver.disconnect();
    genericObserver = null;
  }
  if (shadowRoot) {
    shadowRoot.host.remove();
    shadowRoot = null;
  }
  if (sidebarFrame) {
    sidebarFrame = null;
  }
  sidebarVisible = false;
}

// Debounce function to prevent rapid layout adjustments
function debounce(func, wait) {
  return function executedFunction(...args) {
    const later = () => {
      layoutDebounceTimer = null;
      func(...args);
    };
    clearTimeout(layoutDebounceTimer);
    layoutDebounceTimer = setTimeout(later, wait);
  };
}

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

  sidebarVisible = false;  // Start with sidebar hidden

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
      z-index: 2147483647;
      transition: transform 0.3s ease;
      user-select: none;
      -webkit-user-select: none;
      pointer-events: auto;
      transform: translateX(350px);  // Start hidden
    }
    .cognito-content-shift {
      transition: margin-right 0.3s ease, width 0.3s ease;
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

  // Add class to body for content shifting
  document.body.classList.add('cognito-content-shift');
  
  // Setup observers for layout adjustment
  setupDocsObserver();
  setupGenericObserver();
}

function setupDocsObserver() {
  if (docsObserver) {
    docsObserver.disconnect();
  }

  // Create a one-time observer to wait for the editor to load
  docsObserver = new MutationObserver((mutations, obs) => {
    const docsContainer = document.querySelector('.kix-appview-editor');
    if (docsContainer) {
      obs.disconnect();
      
      // Set up the actual observer for layout changes
      docsObserver = new MutationObserver(debounce(() => {
        if (document.querySelector('.kix-appview-editor')) {
          adjustDocsLayout();
        }
      }, 100));

      docsObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  });

  docsObserver.observe(document.body, { childList: true, subtree: true });
}

function setupGenericObserver() {
  if (genericObserver) {
    genericObserver.disconnect();
  }

  // Add margin to body or main container
  const mainContainer = document.querySelector('main') || document.querySelector('#main') || document.body;
  if (mainContainer) {
    mainContainer.style.transition = 'margin-right 0.3s ease';
  }

  // Create observer for dynamic content
  genericObserver = new MutationObserver(debounce(() => {
    if (sidebarVisible) {
      adjustGenericLayout();
    }
  }, 100));

  genericObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
}

function adjustDocsLayout() {
  // Main content containers that need margin and width adjustment
  const mainContainers = [
    '.kix-appview-editor',
    '.docs-toolbar-wrapper',
    '.docs-titlebar-badges',
    '.docs-horizontal-ruler',
    '.docs-menubar',
    '.docs-header'
  ];

  const margin = sidebarVisible ? '350px' : '0';
  
  // Adjust main content containers
  mainContainers.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.style.marginRight = margin;
      element.style.width = sidebarVisible ? `calc(100% - ${margin})` : '100%';
      element.style.transition = 'all 0.3s ease';
    }
  });

  // Handle the document page container specifically
  const pageContainer = document.querySelector('.kix-page');
  if (pageContainer) {
    pageContainer.style.marginRight = margin;
    pageContainer.style.transition = 'margin 0.3s ease';
  }

  // Adjust Google Docs side panel container
  const sidePanelContainer = document.querySelector('.companion-app-switcher-container');
  if (sidePanelContainer) {
    if (sidebarVisible) {
      sidePanelContainer.style.right = margin;
      sidePanelContainer.style.width = 'var(--companion-app-switcher-width)';
    } else {
      sidePanelContainer.style.right = '0';
      sidePanelContainer.style.width = '';
    }
    sidePanelContainer.style.transition = 'right 0.3s ease';
  }

  // Handle responsive UI elements
  if (sidebarVisible) {
    // Add compact mode class to body
    document.body.classList.add('docs-size-compact');
    
    // Adjust share button to compact mode
    const shareButtonText = document.querySelector('.docs-share-button-label');
    if (shareButtonText) {
      shareButtonText.style.display = 'none';
    }

    // Make menu bar more compact
    const menuBar = document.querySelector('.docs-menubar');
    if (menuBar) {
      // Adjust menu bar container
      menuBar.style.padding = '0 4px';
      
      // Adjust individual menu items
      const menuItems = menuBar.querySelectorAll('.goog-menu-button, .docs-menu-button');
      menuItems.forEach(item => {
        item.style.padding = '0 3px';
        item.style.minWidth = '20px';
        // Hide menu item text, keep only first letter
        const menuText = item.querySelector('.goog-menu-button-caption, .docs-menu-button-label');
        if (menuText) {
          const text = menuText.textContent;
          if (text && text.length > 1) {
            menuText.setAttribute('data-full-text', text);
            menuText.textContent = text[0];
          }
        }
      });
    }

    // Adjust toolbar buttons to be more compact
    const toolbarButtons = document.querySelectorAll('.goog-toolbar-button, .docs-toolbar-button');
    toolbarButtons.forEach(button => {
      button.style.padding = '0 4px';
      button.style.margin = '0 1px';
    });

    // Make header more compact
    const header = document.querySelector('.docs-titlebar-buttons');
    if (header) {
      header.style.gap = '4px';
      header.style.padding = '0 8px';
    }

    // Handle side panel toggle button
    const sidePanelToggle = document.querySelector('.companion-collapser-button-container');
    if (sidePanelToggle) {
      sidePanelToggle.style.right = margin;
      sidePanelToggle.style.transition = 'right 0.3s ease';
    }

  } else {
    // Remove compact mode
    document.body.classList.remove('docs-size-compact');
    
    // Restore share button text
    const shareButtonText = document.querySelector('.docs-share-button-label');
    if (shareButtonText) {
      shareButtonText.style.display = '';
    }

    // Restore menu bar
    const menuBar = document.querySelector('.docs-menubar');
    if (menuBar) {
      // Restore menu bar container
      menuBar.style.padding = '';
      
      // Restore menu items
      const menuItems = menuBar.querySelectorAll('.goog-menu-button, .docs-menu-button');
      menuItems.forEach(item => {
        item.style.padding = '';
        item.style.minWidth = '';
        // Restore menu item text
        const menuText = item.querySelector('.goog-menu-button-caption, .docs-menu-button-label');
        if (menuText && menuText.hasAttribute('data-full-text')) {
          menuText.textContent = menuText.getAttribute('data-full-text');
          menuText.removeAttribute('data-full-text');
        }
      });
    }

    // Restore toolbar buttons
    const toolbarButtons = document.querySelectorAll('.goog-toolbar-button, .docs-toolbar-button');
    toolbarButtons.forEach(button => {
      button.style.padding = '';
      button.style.margin = '';
    });

    // Restore header
    const header = document.querySelector('.docs-titlebar-buttons');
    if (header) {
      header.style.gap = '';
      header.style.padding = '';
    }

    // Restore side panel toggle button
    const sidePanelToggle = document.querySelector('.companion-collapser-button-container');
    if (sidePanelToggle) {
      sidePanelToggle.style.right = '0';
    }
  }

  // Also adjust generic layout
  adjustGenericLayout();
}

function adjustGenericLayout() {
  const mainContainer = document.querySelector('main') || document.querySelector('#main') || document.body;
  const margin = sidebarVisible ? '350px' : '0';
  
  if (mainContainer) {
    mainContainer.style.marginRight = margin;
    mainContainer.style.width = sidebarVisible ? `calc(100% - ${margin})` : '100%';
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
    sidebarContainer.style.transform = sidebarVisible ? 'none' : 'translateX(350px)';
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

// Listen for extension unload/reload
window.addEventListener('beforeunload', cleanup);

// Handle extension reload
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'toggleSidebar') {
    console.log('Handling toggleSidebar action');
    // Clean up existing instances before creating new ones
    cleanup();
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