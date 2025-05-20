//popup.js
document.addEventListener('DOMContentLoaded', () => {
  const connectionStatus = document.getElementById('connection-status');
  const connectButton = document.getElementById('connect-button');
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  const uploadDocsBtn = document.getElementById('upload-docs');
  const createOutlineBtn = document.getElementById('create-outline');

  // Send messages to content script
  async function sendMessage(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['frontend/content.js']
      });
      await chrome.tabs.sendMessage(tab.id, message);
    }
  }

  // Update status based on whether user is in a Google Doc
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const isGoogleDocs = tabs[0]?.url?.startsWith('https://docs.google.com/document');
    connectionStatus.textContent = isGoogleDocs ? 'Connected' : 'Not connected';
    connectionStatus.classList.toggle('connected', isGoogleDocs);
  });

  // Button behaviors
  connectButton?.addEventListener('click', () => {
    sendMessage({ action: 'toggleSidebar', tab: 'upload', fromPopup: true });
    window.close();
  });

  toggleSidebarBtn?.addEventListener('click', () => {
    sendMessage({ action: 'toggleSidebar' });
  });

  uploadDocsBtn?.addEventListener('click', () => {
    sendMessage({ action: 'toggleSidebar', tab: 'upload' });
  });

  createOutlineBtn?.addEventListener('click', () => {
    sendMessage({ action: 'toggleSidebar', tab: 'braindump' });
  });

  // Optional: Handle incoming messages if needed
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'connectionStatusChanged') {
      connectionStatus.textContent = request.connected ? 'Connected' : 'Not connected';
      connectionStatus.classList.toggle('connected', request.connected);
    }
    sendResponse({ received: true });
    return true;
  });
});