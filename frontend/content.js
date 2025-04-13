// ========== Globals ==========
let sidebarFrame = null;
let sidebarVisible = false;
let sidebarIsReady = false;
let lastText = "";

// ========== Sidebar ==========
function createSidebar() {
  sidebarFrame = document.createElement('iframe');
  sidebarFrame.src = chrome.runtime.getURL('sidebar.html');
  sidebarFrame.id = 'cognito-sidebar';
  sidebarFrame.style.cssText = `
    position: fixed;
    top: 0;
    right: -350px;
    width: 350px;
    height: 100vh;
    border: none;
    z-index: 9999;
    transition: right 0.3s ease;
  `;
  document.body.appendChild(sidebarFrame);
}

function toggleSidebar(activeTab = null) {
  if (!sidebarFrame) createSidebar();

  sidebarVisible = !sidebarVisible;
  sidebarFrame.style.right = sidebarVisible ? '0' : '-350px';

  if (activeTab) {
    setTimeout(() => {
      safePostToSidebar({ action: 'switchTab', tab: activeTab });
    }, 300);
  }

  if (sidebarVisible) {
    startObservingText(); // ⬅️ this replaces polling
  }
}

// ========== Safe PostMessage ==========
function safePostToSidebar(payload) {
  const tryPost = () => {
    if (sidebarFrame?.contentWindow && sidebarIsReady) {
      sidebarFrame.contentWindow.postMessage(payload, "*");
      console.log("[Cognito] Sent message to sidebar:", payload);
    } else {
      console.log("[Cognito] Sidebar not ready, retrying...");
      setTimeout(tryPost, 200);
    }
  };
  tryPost();
}

// ========== Real-Time Text Tracking ==========
function startObservingText() {
  const editorRoot = document.querySelector('.kix-appview-editor');
  if (!editorRoot) {
    console.warn("[Cognito] Google Docs editor not found.");
    return;
  }

  const observer = new MutationObserver(() => {
    const currentText = editorRoot.innerText.trim();
    if (currentText && currentText !== lastText) {
      lastText = currentText;

      const wordCount = currentText.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);

      safePostToSidebar({
        source: "cognito-content",
        action: "liveTextUpdate",
        data: currentText,
        features: {
          wordCount,
          readingTime: `${readingTime} min`
        }
      });
    }
  });

  observer.observe(editorRoot, {
    childList: true,
    subtree: true,
    characterData: true
  });

  console.log("[Cognito] MutationObserver started.");
}

// ========== Chrome Runtime Messages ==========
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'toggleSidebar') {
    toggleSidebar(request.tab);
  }
});

// ========== Sidebar <--> Content Messaging ==========
window.addEventListener('message', (event) => {
  if (event.source !== sidebarFrame?.contentWindow) return;

  const { action } = event.data;

  if (action === 'sidebarReady') {
    sidebarIsReady = true;
    console.log("[Cognito] Sidebar is ready.");
  }
});