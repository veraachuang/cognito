// utils.js - Utility functions for Cognito extension

console.log('[Cognito] Utils module loaded');

/**
 * Debounce function to prevent rapid executions
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timer = null;
  
  return function executedFunction(...args) {
    const later = () => {
      timer = null;
      func(...args);
    };
    clearTimeout(timer);
    timer = setTimeout(later, wait);
  };
}

/**
 * Extract document ID from URL
 * @returns {string|null} Document ID or null if not found
 */
export function extractDocumentId() {
  const urlPattern = /\/document\/d\/([a-zA-Z0-9-_]+)/;
  const match = window.location.href.match(urlPattern);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Clean up any active observers and elements
 * @param {Object} state - Application state containing elements to clean up
 */
export function cleanup(state) {
  if (state.docsObserver) {
    state.docsObserver.disconnect();
    state.docsObserver = null;
  }
  
  if (state.genericObserver) {
    state.genericObserver.disconnect();
    state.genericObserver = null;
  }
  
  if (state.shadowRoot) {
    state.shadowRoot.host.remove();
    state.shadowRoot = null;
  }
  
  if (state.sidebarFrame) {
    state.sidebarFrame = null;
  }
  
  if (state.canvasPollingInterval) {
    clearInterval(state.canvasPollingInterval);
    state.canvasPollingInterval = null;
  }
  
  state.sidebarVisible = false;
}

/**
 * Creates a shadow DOM container
 * @returns {ShadowRoot} The created shadow root
 */
export function createShadowContainer() {
  const container = document.createElement('div');
  container.id = 'cognito-container';
  const shadowRoot = container.attachShadow({ mode: 'open' });
  document.body.appendChild(container);
  return shadowRoot;
} 