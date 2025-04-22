// content.js - Main entry point for the content script

import { cleanup } from './modules/utils.js';
import { initGoogleApiClient, startGoogleApiPolling } from './modules/google-docs-api.js';
import { getVisibleGoogleDocsText, processAndSendText } from './modules/text-processor.js';
import { createSidebar, toggleSidebar } from './modules/sidebar-ui.js';
import { setupDocsObserver, setupGenericObserver } from './modules/layout-manager.js';
import { initMessageListeners } from './modules/message-handler.js';

console.log('[Cognito] Content script initialized');

// Application state
const state = {
  sidebarFrame: null,
  sidebarVisible: false,
  shadowRoot: null,
  docsObserver: null,
  genericObserver: null,
  layoutDebounceTimer: null,
  canvasPollingInterval: null,
  lastText: '',
  accessToken: null,
  documentId: null
};

// Initialize on page load
function initialize() {
  try {
    // First try the Google API approach
    initGoogleApiClient();
    
    // Set up the UI components
    const sidebarState = createSidebar();
    state.sidebarFrame = sidebarState.sidebarFrame;
    state.shadowRoot = sidebarState.shadowRoot;
    state.sidebarVisible = sidebarState.sidebarVisible;
    
    // Setup observers for layout adjustments
    state.docsObserver = setupDocsObserver(() => adjustLayout());
    state.genericObserver = setupGenericObserver(() => adjustLayout(), state.sidebarVisible);
    
    // Initialize message listeners
    initMessageListeners();
  } catch (error) {
    console.error('[Cognito] Error during initialization:', error);
    // Fall back to DOM method if initialization fails
    startCanvasModePolling();
  }
}

// Adjust layout based on sidebar visibility
function adjustLayout() {
  const module = require('./modules/layout-manager.js');
  
  if (document.querySelector('.kix-appview-editor')) {
    module.adjustDocsLayout(state.sidebarVisible);
  } else {
    module.adjustGenericLayout(state.sidebarVisible);
  }
}

// Start polling in canvas mode (DOM-based)
function startCanvasModePolling() {
  console.log('[Cognito] Starting DOM-based polling (fallback)');
  clearInterval(state.canvasPollingInterval);

  state.canvasPollingInterval = setInterval(() => {
    const rawText = getVisibleGoogleDocsText();
    state.lastText = processAndSendText(rawText, state.sidebarFrame);
  }, 2000);
}

// Handle Google API ready event
document.addEventListener('cognito-google-api-ready', (event) => {
  const { documentId, accessToken } = event.detail;
  state.documentId = documentId;
  state.accessToken = accessToken;
  
  if (documentId) {
    state.canvasPollingInterval = startGoogleApiPolling((text) => {
      state.lastText = processAndSendText(text, state.sidebarFrame);
    });
  } else {
    console.warn('[Cognito] Could not extract document ID, falling back to DOM method');
    startCanvasModePolling();
  }
});

// Handle Google API failure event
document.addEventListener('cognito-google-api-failed', () => {
  console.warn('[Cognito] Google API failed, falling back to DOM method');
  startCanvasModePolling();
});

// Listen for extension unload/reload
window.addEventListener('beforeunload', () => cleanup(state));

// Wait for page to fully load before initializing
window.addEventListener('load', initialize);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initialize, state };
}

