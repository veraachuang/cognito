chrome.runtime.onInstalled.addListener(() => {
  console.log('[Cognito] Extension installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Cognito] Message received in background:', request);
  sendResponse({ success: false, error: 'No API support in background.' });
});

