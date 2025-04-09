document.addEventListener('DOMContentLoaded', () => {
  const connectionStatus = document.getElementById('connection-status');
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  const uploadDocsBtn = document.getElementById('upload-docs');
  const createOutlineBtn = document.getElementById('create-outline');

  // Check if we're on Google Docs
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const isGoogleDocs = currentTab.url.startsWith('https://docs.google.com/document');
    
    if (isGoogleDocs) {
      connectionStatus.textContent = 'Connected';
      connectionStatus.classList.add('connected');
    }
  });

  // Toggle sidebar
  toggleSidebarBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleSidebar' });
    });
  });

  // Upload documents button
  uploadDocsBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'toggleSidebar',
        tab: 'upload'
      });
    });
  });

  // Create outline button
  createOutlineBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'toggleSidebar',
        tab: 'braindump'
      });
    });
  });
}); 