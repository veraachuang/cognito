//background.js
console.log('chrome.identity is', chrome.identity);

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Cognito] Extension installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Cognito] Message received in background:', request);

  if (request.action === "getDocText") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ error: chrome.runtime.lastError?.message || 'No token retrieved.' });
        return;
      }

      const docId = request.docId;
      fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          const text = data.body.content
            .map(el => el.paragraph?.elements?.map(e => e.textRun?.content).join('') || '')
            .join('\n');
          sendResponse({ text });
        })
        .catch((err) => sendResponse({ error: err.message }));
    });

    return true;
  }

  sendResponse({ success: false, error: 'No matching action' });
});
