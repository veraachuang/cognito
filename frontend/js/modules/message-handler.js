// message-handler.js - Manage messaging between content script and sidebar

import { toggleSidebar, handleFileUpload, getSidebarState } from './sidebar-ui.js';
import { getCursorPosition } from './text-processor.js';
import { applyOutlineToDocument } from './outline-manager.js';

console.log('[Cognito] Message Handler module loaded');

/**
 * Initialize message listeners
 */
export function initMessageListeners() {
  // Add message listener for extension messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'toggleSidebar') {
      console.log('Toggling sidebar with tab:', request.tab);
      toggleSidebar(request.tab);
      sendResponse({ success: true });
      return true;
    } else if (request.action === 'fetchDocText') {
      const text = getVisibleGoogleDocsText();
      sendResponse({ success: true, text });
    } else {
      sendResponse({ success: false, error: 'Unknown action' });
    }
    return true;
  });

  // Add window message listener for sidebar communication
  window.addEventListener('message', handleWindowMessage);
  
  // Listen for extension unload/reload
  window.addEventListener('beforeunload', () => {
    // Clean up listeners
    window.removeEventListener('message', handleWindowMessage);
  });
}

/**
 * Handle window messages from sidebar iframe
 * @param {MessageEvent} event - Message event
 */
function handleWindowMessage(event) {
  const { sidebarFrame } = getSidebarState();
  
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
      applyOutlineToDocument(parsedOutline);
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
} 