// content.js
let sidebarFrame = null;
let sidebarVisible = false;

console.log('[Cognito] Content script initialized');

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
    '.docs-header',
    '.companion-guest-app-switcher-container'
  ];

  const margin = sidebarVisible ? '350px' : '0';
  
  // Adjust main content containers
  mainContainers.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      if (selector === '.companion-guest-app-switcher-container') {
        // Special handling for companion container
        element.style.right = margin;
        element.style.transition = 'right 0.3s ease';
      } else {
        element.style.marginRight = margin;
        element.style.width = sidebarVisible ? `calc(100% - ${margin})` : '100%';
        element.style.transition = 'all 0.3s ease';
      }
    }
  });

  // Handle the document page container specifically
  const pageContainer = document.querySelector('.kix-page');
  if (pageContainer) {
    pageContainer.style.marginRight = margin;
    pageContainer.style.transition = 'margin 0.3s ease';
  }

  // Adjust Google Docs side panel containers
  const sidePanelContainers = [
    '.companion-app-switcher-container',
    '.companion-guest-app-switcher-container'
  ];

  sidePanelContainers.forEach(selector => {
    const container = document.querySelector(selector);
    if (container) {
      if (sidebarVisible) {
        container.style.right = margin;
        container.style.width = 'var(--companion-app-switcher-width)';
      } else {
        container.style.right = '0';
        container.style.width = '';
      }
      container.style.transition = 'right 0.3s ease';
    }
  });

  // Adjust toolbar wrapper specifically
  const toolbarWrapper = document.querySelector('.docs-toolbar-wrapper');
  if (toolbarWrapper) {
    toolbarWrapper.style.marginRight = margin;
    toolbarWrapper.style.width = sidebarVisible ? `calc(100% - ${margin})` : '100%';
    toolbarWrapper.style.transition = 'all 0.3s ease';
    
    // Ensure the inner toolbar elements are properly aligned
    const innerToolbar = toolbarWrapper.querySelector('.docs-toolbar');
    if (innerToolbar) {
      innerToolbar.style.width = '100%';
      innerToolbar.style.transition = 'all 0.3s ease';
    }
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

    // Handle side panel toggle buttons
    const sidePanelToggles = document.querySelectorAll('.companion-collapser-button-container, .companion-guest-collapser-button-container');
    sidePanelToggles.forEach(toggle => {
      if (toggle) {
        toggle.style.right = margin;
        toggle.style.transition = 'right 0.3s ease';
      }
    });

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

    // Restore side panel toggle buttons
    const sidePanelToggles = document.querySelectorAll('.companion-collapser-button-container, .companion-guest-collapser-button-container');
    sidePanelToggles.forEach(toggle => {
      if (toggle) {
        toggle.style.right = '0';
      }
    });
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
  if (!sidebarFrame) createSidebar();

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
      if (sidebarFrame?.contentWindow) {
        sidebarFrame.contentWindow.postMessage({ action: 'switchTab', tab: activeTab }, '*');
      }
    }, 300);
  }
}

// Listen for extension unload/reload
window.addEventListener('beforeunload', cleanup);

// Handle extension reload
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleSidebar') {
    console.log('Handling toggleSidebar action');
    // Clean up existing instances before creating new ones
    cleanup();
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
  console.log('Received message event:', event.data);
  console.log('Event source:', event.source);
  console.log('Sidebar frame:', sidebarFrame?.contentWindow);
  
  if (event.source !== sidebarFrame?.contentWindow) {
    console.log('Message source does not match sidebar frame');
    return;
  }
  const { action, data } = event.data;
  console.log('Processing action:', action, 'with data:', data);

  switch (action) {
    case 'closeSidebar':
      console.log('Handling closeSidebar action');
      toggleSidebar();
      break;
    case 'uploadFiles':
      console.log('Handling uploadFiles action');
      handleFileUpload(data.files);
      break;
    case 'applyOutline':
      console.log('Handling applyOutline action');
      console.log('Raw outline data:', data.outline);
      
      // Ensure outline data is properly structured
      if (!data.outline) {
        console.error('No outline data provided');
        return;
      }

      // Parse the outline data, handling both string and array formats
      let title = '';
      let keyPoints = [];
      
      if (typeof data.outline === 'string') {
        // If it's a single string, use it as the title
        title = data.outline;
      } else if (Array.isArray(data.outline)) {
        // If it's an array, first element is title, rest are key points
        title = data.outline[0] || '';
        keyPoints = data.outline.slice(1) || [];
      } else if (typeof data.outline === 'object') {
        // If it's an object with title and points
        title = data.outline.title || '';
        keyPoints = data.outline.points || [];
      }

      const parsedOutline = {
        sections: [{
          title: title,
          key_points: Array.isArray(keyPoints) ? keyPoints.map(point => point.toString().trim()) : []
        }]
      };
      
      console.log('Parsed outline:', parsedOutline);
      integration.applyOutlineToDocument(parsedOutline);
      break;
    case 'getCursorPosition':
      console.log('Handling getCursorPosition action');
      const position = getCursorPosition();
      sidebarFrame.contentWindow.postMessage({
        action: 'cursorPosition',
        position: position
      }, '*');
      break;
    default:
      console.log('Unknown action received:', action);
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
    position: selection.toString()
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

// Unique prefix for scoped class names
const CLASS_PREFIX = 'cognito-ext';

class GoogleDocsIntegration {
    constructor() {
        this.sidebarFrame = null;
        this.docIframe = null;
        this.observer = null;
        this.isInitialized = false;
        this.initialize().catch(console.error);
    }

    async initialize() {
        if (this.isInitialized) return;
        
        // Wait for Google Docs to fully load
        await this.waitForDocsLoad();
        
        // Initialize components
        this.injectSidebar();
        this.setupDocumentObserver();
        this.adjustDocsUI();
        
        // Setup message listeners
        this.setupMessageHandlers();
        
        this.isInitialized = true;
    }

    async waitForDocsLoad() {
        return new Promise(resolve => {
            const checkForIframe = () => {
                // Google Docs main editor iframe
                this.docIframe = document.querySelector('iframe.docs-editor-container');
                
                if (this.docIframe?.contentDocument?.body) {
                    resolve();
                } else {
                    setTimeout(checkForIframe, 100);
                }
            };
            checkForIframe();
        });
    }

    injectSidebar() {
        // Create sidebar iframe
        this.sidebarFrame = document.createElement('iframe');
        this.sidebarFrame.src = chrome.runtime.getURL('frontend/sidebar.html');
        this.sidebarFrame.className = `${CLASS_PREFIX}-sidebar`;
        
        // Apply sidebar styles
        Object.assign(this.sidebarFrame.style, {
            position: 'fixed',
            top: '0',
            right: '0',
            width: '300px',
            height: '100vh',
            border: 'none',
            backgroundColor: '#ffffff',
            boxShadow: '-2px 0 5px rgba(0, 0, 0, 0.1)',
            zIndex: '9999'
        });

        // Inject sidebar into page
        document.body.appendChild(this.sidebarFrame);
    }

    adjustDocsUI() {
        // Push Google Docs UI to the left
        const docsContainer = document.querySelector('.docs-editor-container').parentElement;
        if (docsContainer) {
            Object.assign(docsContainer.style, {
                marginRight: '300px',
                width: 'calc(100% - 300px)'
            });
        }

        // Adjust other Google Docs elements
        const topBar = document.getElementById('docs-chrome');
        if (topBar) {
            Object.assign(topBar.style, {
                marginRight: '300px',
                width: 'calc(100% - 300px)'
            });
        }
    }

    setupDocumentObserver() {
        // Create MutationObserver to track document changes
        this.observer = new MutationObserver(mutations => {
            this.handleDocumentChanges(mutations);
        });

        // Start observing the document body
        const config = {
            childList: true,
            subtree: true,
            characterData: true
        };

        if (this.docIframe?.contentDocument?.body) {
            this.observer.observe(this.docIframe.contentDocument.body, config);
        }
    }

    handleDocumentChanges(mutations) {
        // Debounce the change handler to avoid too frequent updates
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            const text = this.extractVisibleText();
            this.notifySidebarOfChanges(text);
        }, 500);
    }

    extractVisibleText() {
        if (!this.docIframe?.contentDocument?.body) return '';

        // Get all text nodes from the document
        const walker = document.createTreeWalker(
            this.docIframe.contentDocument.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let text = '';
        let node;
        
        while (node = walker.nextNode()) {
            // Skip hidden elements
            if (this.isNodeVisible(node)) {
                text += node.textContent + ' ';
            }
        }

        return text.trim();
    }

    isNodeVisible(node) {
        const element = node.parentElement;
        if (!element) return false;

        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }

    notifySidebarOfChanges(text) {
        if (this.sidebarFrame) {
            this.sidebarFrame.contentWindow.postMessage({
                action: 'documentChanged',
                text: text
            }, '*');
        }
    }

    setupMessageHandlers() {
        // Listen for messages from sidebar
        window.addEventListener('message', async (event) => {
            // Verify message origin
            if (event.source !== this.sidebarFrame?.contentWindow) return;

            const { action, data } = event.data;

            switch (action) {
                case 'getCursorPosition':
                    const position = this.getCursorPosition();
                    event.source.postMessage({
                        action: 'cursorPosition',
                        position: position
                    }, '*');
                    break;

                case 'applyOutline':
                    await this.applyOutlineToDocument(data.outline);
                    break;

                case 'closeSidebar':
                    this.removeSidebar();
                    break;
            }
        });
    }

    getCursorPosition() {
        // Get cursor position from Google Docs
        const cursor = this.docIframe?.contentDocument?.querySelector('.kix-cursor');
        if (!cursor) return null;

        const rect = cursor.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            height: rect.height,
            selectedText: window.getSelection().toString()
        };
    }

    // Helper function to insert the styled outline
    _insertStyledOutline(pageElement, outline) {
        try {
            console.log('Inserting outline into page:', pageElement);
            // Format the outline
            const formattedOutline = this.formatOutline(outline);
            console.log('Formatted outline text:', formattedOutline.text);

            // Create the container div for the outline
            const outlineContainer = document.createElement('div');
            outlineContainer.className = 'cognito-inserted-outline';
            Object.assign(outlineContainer.style, {
                border: '1px solid #e0e0e0',
                padding: '10px 15px',
                margin: '10px 0',
                backgroundColor: '#f9f9f9',
                borderRadius: '4px',
                fontFamily: 'Arial, sans-serif', // Ensure consistent font
                fontSize: '11pt' // Match typical Google Docs font size
            });

            // Split the text into paragraphs and create elements
            const paragraphs = formattedOutline.text.split('\n');
            paragraphs.forEach(paragraphText => {
                if (paragraphText.trim()) {
                    const paragraphElement = document.createElement('div');
                    paragraphElement.textContent = paragraphText;
                    paragraphElement.style.marginBottom = '5px';
                    paragraphElement.style.lineHeight = '1.4'; // Improve readability
                    outlineContainer.appendChild(paragraphElement);
                }
            });

            // Insert the container at the top of the page
            pageElement.insertBefore(outlineContainer, pageElement.firstChild);

            // Notify success
            console.log('Outline application completed successfully.');
            if (this.sidebarFrame?.contentWindow) {
                this.sidebarFrame.contentWindow.postMessage({
                    action: 'outlineApplied',
                    success: true
                }, '*');
            }
        } catch (error) {
             console.error('Error during outline insertion:', error);
             console.error('Error stack:', error.stack);
             if (this.sidebarFrame?.contentWindow) {
                 this.sidebarFrame.contentWindow.postMessage({
                     action: 'outlineApplied',
                     success: false,
                     error: `Error during insertion: ${error.message}`
                 }, '*');
             }
        }
    }

    async applyOutlineToDocument(outline) {
        console.log('Starting applyOutlineToDocument');
        console.log('Outline data:', outline);

        try {
            // Find the editor directly
            const editor = document.querySelector('.kix-appview-editor');
            if (!editor) {
                // If editor isn't found immediately, we might need to wait for it too,
                // but for now, we'll assume it should be present or throw.
                throw new Error('Google Docs editor (.kix-appview-editor) not found.');
            }
            console.log('Found editor:', editor);

            // Check if the page element already exists
            const page = editor.querySelector('.kix-page');
            if (page) {
                console.log('.kix-page found immediately.');
                this._insertStyledOutline(page, outline);
            } else {
                console.log('.kix-page not found immediately. Setting up MutationObserver...');
                // If page doesn't exist, wait for it with a MutationObserver
                const observer = new MutationObserver((mutations, obs) => {
                    for (const mutation of mutations) {
                        if (mutation.addedNodes.length > 0) {
                            for (const node of mutation.addedNodes) {
                                // Check if the added node is the page or contains the page
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    const foundPage = (node.matches && node.matches('.kix-page')) 
                                                      ? node 
                                                      : node.querySelector('.kix-page');
                                    
                                    if (foundPage) {
                                        console.log('.kix-page found by MutationObserver.');
                                        obs.disconnect(); // Stop observing once found
                                        this._insertStyledOutline(foundPage, outline); 
                                        return; // Exit once handled
                                    }
                                }
                            }
                        }
                    }
                });

                // Start observing the editor for child additions
                observer.observe(document.body, { 
                    childList: true, 
                    subtree: true 
                });
                
                console.log('MutationObserver is waiting for .kix-page...');
            }

        } catch (error) {
            // Catch errors finding the editor or setting up the observer
            console.error('Error applying outline:', error);
            console.error('Error stack:', error.stack);
            if (this.sidebarFrame?.contentWindow) {
                this.sidebarFrame.contentWindow.postMessage({
                    action: 'outlineApplied',
                    success: false,
                    error: error.message
                }, '*');
            }
        }
    }

    formatOutline(outline) {
        console.log('Starting outline formatting with outline:', outline);
        
        // Validate outline structure
        if (!outline || typeof outline !== 'object') {
            console.error('Invalid outline object:', outline);
            throw new Error('Invalid outline object provided');
        }

        let text = '';

        // Process each section
        outline.sections.forEach((section, sectionIndex) => {
            // Section title with proper formatting
            text += `${section.title}\n\n`;

            // Key points with bullet points and proper formatting
            if (Array.isArray(section.key_points) && section.key_points.length > 0) {
                section.key_points.forEach(point => {
                    if (point && typeof point === 'string') {
                        text += `• ${point.trim()}\n`;
                    }
                });
            }

            // Add extra newline between sections
            text += '\n';
        });

        // Ensure there's always some content
        if (!text.trim()) {
            text = 'Empty Outline\n\n• No content provided\n';
        }

        console.log('Formatted outline text:', text);

        return {
            text: text,
            html: text
        };
    }

    // Helper method to simulate typing
    async simulateTyping(element, text) {
        for (let char of text) {
            const event = new InputEvent('textInput', {
                data: char,
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(event);
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay between characters
        }
    }

    notifySidebarOfChanges(message) {
        console.log('Notifying sidebar of changes:', message);
        if (this.sidebarFrame?.contentWindow) {
            this.sidebarFrame.contentWindow.postMessage(message, '*');
        } else {
            console.error('Sidebar frame or contentWindow not available for notification');
        }
    }

    removeSidebar() {
        if (this.sidebarFrame) {
            this.sidebarFrame.remove();
            this.sidebarFrame = null;
        }

        // Restore original Google Docs UI
        const docsContainer = document.querySelector('.docs-editor-container').parentElement;
        if (docsContainer) {
            Object.assign(docsContainer.style, {
                marginRight: '0',
                width: '100%'
            });
        }

        const topBar = document.getElementById('docs-chrome');
        if (topBar) {
            Object.assign(topBar.style, {
                marginRight: '0',
                width: '100%'
            });
        }

        // Stop observing
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Initialize the integration
const integration = new GoogleDocsIntegration();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleDocsIntegration;
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

