// sidebar-ui.js - UI components for sidebar

import { createShadowContainer } from './utils.js';
import { adjustDocsLayout, adjustGenericLayout } from './layout-manager.js';

console.log('[Cognito] Sidebar UI module loaded');

let sidebarFrame = null;
let sidebarVisible = false;
let shadowRoot = null;

/**
 * Create and initialize the sidebar
 * @returns {Object} Object containing sidebar elements
 */
export function createSidebar() {
  if (sidebarFrame) {
    console.log('Sidebar already exists');
    return { sidebarFrame, shadowRoot, sidebarVisible };
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
  
  return { sidebarFrame, shadowRoot, sidebarVisible };
}

/**
 * Toggle the sidebar visibility
 * @param {string|null} activeTab - Optional tab to activate
 * @returns {boolean} New visibility state
 */
export function toggleSidebar(activeTab = null) {
  console.log('toggleSidebar called with activeTab:', activeTab);
  
  if (!sidebarFrame) {
    console.log('Creating new sidebar');
    const sidebarElements = createSidebar();
    sidebarFrame = sidebarElements.sidebarFrame;
    shadowRoot = sidebarElements.shadowRoot;
    sidebarVisible = sidebarElements.sidebarVisible;
  }

  sidebarVisible = !sidebarVisible;
  console.log('Sidebar visible:', sidebarVisible);

  const sidebarContainer = shadowRoot.querySelector('.cognito-sidebar');
  if (sidebarContainer) {
    sidebarContainer.style.transform = sidebarVisible ? 'translateX(0)' : 'translateX(350px)';
    
    // If an active tab is specified, send it to the sidebar
    if (activeTab && sidebarFrame.contentWindow) {
      sidebarFrame.contentWindow.postMessage({ 
        action: 'switchTab', 
        tab: activeTab 
      }, '*');
    }
  }

  // Adjust the main content layout
  adjustLayout();
  
  return sidebarVisible;
}

/**
 * Adjust the layout based on sidebar visibility
 */
function adjustLayout() {
  if (document.querySelector('.kix-appview-editor')) {
    adjustDocsLayout(sidebarVisible);
  } else {
    adjustGenericLayout(sidebarVisible);
  }
}

/**
 * Handle file uploads
 * @param {FileList} files - Files to handle
 */
export function handleFileUpload(files) {
  console.log('[Cognito] Received files:', files);
  // Implement file handling logic
}

/**
 * Get the current state of the sidebar
 * @returns {Object} Sidebar state
 */
export function getSidebarState() {
  return {
    sidebarFrame, 
    shadowRoot, 
    sidebarVisible
  };
}

/**
 * Update the sidebar state with new values
 * @param {Object} newState - New sidebar state values
 */
export function updateSidebarState(newState) {
  if (newState.sidebarFrame !== undefined) sidebarFrame = newState.sidebarFrame;
  if (newState.shadowRoot !== undefined) shadowRoot = newState.shadowRoot;
  if (newState.sidebarVisible !== undefined) sidebarVisible = newState.sidebarVisible;
} 