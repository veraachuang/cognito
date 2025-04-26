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

/** When sidebar says it's ready, send over the Doc-ID */
window.addEventListener('message', evt => {
  if (evt.data?.action === 'sidebarReady' && sidebarFrame?.contentWindow) {
    sidebarFrame.contentWindow.postMessage(
      { action: 'docId', value: extractDocId() },
      '*'
    );
  }
  
  // Handle applying outline to the document
  if (evt.data?.action === 'applyOutline' && evt.source === sidebarFrame?.contentWindow) {
    insertOutlineIntoDoc(evt.data.outline);
  }
});

/** Insert the outline content into the Google Doc */
function insertOutlineIntoDoc(outlineHTML) {
  // Get Doc ID
  const docId = extractDocId();
  if (!docId) {
    alert('Could not determine Google Doc ID. Please make sure you are in a Google Doc.');
    return;
  }
  
  // First convert HTML to plain text that's formatted for Google Docs
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = outlineHTML;
  
  // Process the HTML to create a structured outline text
  let outlineText = processOutlineToText(tempDiv);
  
  // Show a loading toast
  const toast = showToast('Inserting outline via Google Docs API...', 60000);
  
  // Use the Google Docs API to insert the text
  chrome.runtime.sendMessage({
    action: 'insertOutlineWithAPI',
    docId: docId,
    content: outlineText
  }, response => {
    // Remove the processing toast
    toast?.remove();
    
    if (response && response.success) {
      // Show success message
      showToast('Outline applied to document successfully!');
    } else {
      // Show error message with detailed information
      const errorMsg = response?.error || 'Unknown error';
      console.error('[Cognito] Error applying outline:', errorMsg);
      showToast(`Error: ${errorMsg}. Please try again.`, 5000);
      
      // Log detailed error information
      if (response?.details) {
        console.error('[Cognito] API Error details:', response.details);
      }
    }
  });
}

/** Helper to copy text to clipboard */
function copyToClipboard(text) {
  // Try modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('[Cognito] Text copied to clipboard using Clipboard API');
        showToast('Text copied to clipboard. Press Ctrl+V or Cmd+V to paste.');
      })
      .catch(err => {
        console.error('[Cognito] Clipboard API failed:', err);
        fallbackCopyToClipboard(text);
      });
  } else {
    fallbackCopyToClipboard(text);
  }
}

/** Fallback method for clipboard copy */
function fallbackCopyToClipboard(text) {
  // Create a temporary textarea
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';  // Avoid scrolling to bottom
  textArea.style.left = '-9999px';    // Move outside the screen
  textArea.style.top = '0';
  textArea.setAttribute('readonly', ''); // Prevent keyboard from appearing on mobile
  document.body.appendChild(textArea);
  
  try {
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    if (successful) {
      console.log('[Cognito] Text copied to clipboard using execCommand');
      showToast('Outline copied to clipboard. Press Ctrl+V or Cmd+V to paste.');
    } else {
      throw new Error('execCommand copy failed');
    }
  } catch (err) {
    console.error('[Cognito] Could not copy text:', err);
    alert('Failed to copy to clipboard. Your outline is:\n\n' + text.substring(0, 100) + '...');
  }
  
  document.body.removeChild(textArea);
}

/** Process outline HTML to create a properly formatted text for Google Docs */
function processOutlineToText(container) {
  let result = '';
  
  // Add a title at the beginning
  result += "GENERATED OUTLINE\n\n";
  
  // Find all elements in the container
  const headers = container.querySelectorAll('h2, h3, h4, h5');
  const lists = container.querySelectorAll('ul');
  
  // Process headings and their associated content
  if (headers.length > 0) {
    let currentLevel = 0;
    
    // Process each heading and its associated content
    headers.forEach(header => {
      // Determine heading level (for proper indentation)
      const level = parseInt(header.tagName.substring(1)) - 2;
      const indent = '  '.repeat(Math.max(0, level));
      
      // Add the header with formatting based on its level
      result += `${indent}${header.textContent.toUpperCase()}\n`;
      
      // Process all siblings until the next header
      let nextElement = header.nextElementSibling;
      
      // Process lists and paragraphs under this header
      while (nextElement && !['H2', 'H3', 'H4', 'H5'].includes(nextElement.tagName)) {
        if (nextElement.tagName === 'UL') {
          result += processListToText(nextElement, level + 1);
          result += '\n';
        } else if (nextElement.tagName === 'P') {
          result += `${indent}  ${nextElement.textContent}\n`;
        }
        
        nextElement = nextElement.nextElementSibling;
      }
      
      // Add an extra blank line after each section
      result += '\n';
    });
  } 
  // If no headers found, process all lists directly
  else if (lists.length > 0) {
    lists.forEach(list => {
      result += processListToText(list, 0);
      result += '\n';
    });
  }
  
  return result;
}

/** Helper function to process UL lists into formatted text */
function processListToText(list, indentLevel = 0) {
  let result = '';
  const baseIndent = '  '.repeat(indentLevel);
  
  // Process list items
  const items = list.querySelectorAll(':scope > li');
  items.forEach(item => {
    // Extract the text from this list item (excluding nested lists)
    let itemText = item.childNodes[0].nodeType === 3 ? 
                  item.childNodes[0].textContent.trim() :
                  Array.from(item.childNodes)
                    .filter(node => node.nodeType === 3)
                    .map(node => node.textContent.trim())
                    .join(' ');
    
    if (!itemText && item.firstChild && item.firstChild.nodeType !== 3) {
      itemText = item.firstChild.textContent.trim();
    }
    
    // Add this list item with bullet point
    result += `${baseIndent}• ${itemText}\n`;
    
    // Process any nested lists
    const nestedLists = item.querySelectorAll(':scope > ul');
    nestedLists.forEach(nestedList => {
      result += processListToText(nestedList, indentLevel + 1);
    });
  });
  
  return result;
}

/** Show a temporary toast message */
function showToast(message, duration = 3000) {
  // Remove any existing toasts
  document.querySelector('.cognito-toast')?.remove();
  
  const toast = document.createElement('div');
  toast.className = 'cognito-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #333;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 10000;
    font-family: 'Google Sans', Arial, sans-serif;
  `;
  
  document.body.appendChild(toast);
  
  if (duration !== Infinity) {
    setTimeout(() => {
      toast.style.opacity = 0;
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, duration);
  }
  
  return toast;
}

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
