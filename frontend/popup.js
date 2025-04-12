document.addEventListener('DOMContentLoaded', () => {
  const connectionStatus = document.getElementById('connection-status');
  const connectButton = document.getElementById('connect-button');
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  const uploadDocsBtn = document.getElementById('upload-docs');
  const createOutlineBtn = document.getElementById('create-outline');

  // Helper function to send messages to content script
  async function sendMessage(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      // If content script isn't injected, inject it and try again
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await chrome.tabs.sendMessage(tab.id, message);
    }
  }

  // Check if we're on Google Docs and update status
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const isGoogleDocs = tabs[0]?.url.startsWith('https://docs.google.com/document');
    connectionStatus.textContent = isGoogleDocs ? 'Connected' : 'Not connected';
    connectionStatus.classList.toggle('connected', isGoogleDocs);
  });

  // Connect button
  connectButton.addEventListener('click', () => {
    sendMessage({ action: 'toggleSidebar', tab: 'upload' });
  });

  // Toggle Sidebar button
  toggleSidebarBtn.addEventListener('click', () => {
    sendMessage({ action: 'toggleSidebar' });
  });

  // Quick Actions buttons
  uploadDocsBtn.addEventListener('click', () => {
    sendMessage({ action: 'toggleSidebar', tab: 'upload' });
  });

  createOutlineBtn.addEventListener('click', () => {
    sendMessage({ action: 'toggleSidebar', tab: 'braindump' });
  });

  // Listen for messages from the content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message in popup:', request);
    if (request.type === 'connectionStatusChanged') {
      connectionStatus.textContent = request.connected ? 'Connected' : 'Not connected';
      connectionStatus.classList.toggle('connected', request.connected);
    }
    sendResponse({ received: true });
    return true;
  });
}); 