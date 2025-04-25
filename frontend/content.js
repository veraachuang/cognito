// content.js
console.log('[Cognito] Content script initialized');

let sidebarFrame = null, sidebarVisible = false;

/** Create the sidebar iframe (only once) */
function createSidebar() {
  if (sidebarFrame) return;
  sidebarFrame = document.createElement('iframe');
  sidebarFrame.src = chrome.runtime.getURL('frontend/sidebar.html');
  sidebarFrame.id  = 'cognito-sidebar';
  sidebarFrame.style.cssText = `
    position: fixed; top: 0; right: -350px;
    width: 350px; height: 100vh;
    border: none; z-index: 9999;
    transition: right 0.3s ease;
  `;
  document.body.appendChild(sidebarFrame);
}

/** Pull the Doc-ID out of /document/d/<ID>/edit URLs */
function extractDocId() {
  const m = location.pathname.match(/\/document\/(?:u\/\d+\/)?d\/([^/]+)/) ||
            location.pathname.match(/\/d\/([^/]+)/);
  return (m && m[1]) || new URLSearchParams(location.search).get('id') || null;
}

/** When sidebar says it’s ready, send over the Doc-ID */
window.addEventListener('message', evt => {
  if (evt.data?.action === 'sidebarReady' && sidebarFrame?.contentWindow) {
    sidebarFrame.contentWindow.postMessage(
      { action: 'docId', value: extractDocId() },
      '*'
    );
  }
});

/** Toggle the sidebar open/closed */
function toggleSidebar(activeTab = null) {
  if (!sidebarFrame) createSidebar();
  sidebarVisible = !sidebarVisible;
  sidebarFrame.style.right = sidebarVisible ? '0' : '-350px';

  // shrink the editor to make room
  ['.docs-editor-container','.docs-editor','.docs-content-wrapper']
    .map(s => document.querySelector(s))
    .forEach(el => {
      if (el) {
        el.style.width = sidebarVisible
          ? 'calc(100% - 350px)'
          : '100%';
        el.style.transition = 'width 0.3s ease';
      }
    });

  // optionally switch to a specific tab
  if (activeTab && sidebarVisible) {
    setTimeout(() => {
      sidebarFrame?.contentWindow?.postMessage(
        { action: 'switchTab', tab: activeTab },
        '*'
      );
    }, 300);
  }
}

/** Listen for messages from popup or background */
chrome.runtime.onMessage.addListener((req, _, send) => {
  if (req.action === 'toggleSidebar') {
    toggleSidebar(req.tab);
    send({ success: true });
  } else {
    send({ success: false, error: 'Unknown action' });
  }
  return true;
});

/** Also let the iframe close itself */
window.addEventListener('message', evt => {
  if (evt.source === sidebarFrame?.contentWindow &&
      evt.data?.action === 'closeSidebar') {
    toggleSidebar();
  }
});
