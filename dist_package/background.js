//background.js
console.log('chrome.identity is', chrome.identity);

// Function to forcefully clear all tokens
function forceTokenReset(callback) {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (token) {
      console.log('[Cognito] Found existing token, revoking it');
      // First remove it from Chrome's cache
      chrome.identity.removeCachedAuthToken({ token }, () => {
        // Then tell Google to revoke it
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
          .then(() => {
            console.log('[Cognito] Successfully revoked token');
            // Clear any other cached tokens
            chrome.identity.clearAllCachedAuthTokens(() => {
              console.log('[Cognito] Cleared all cached auth tokens');
              if (callback) callback();
            });
          })
          .catch(err => {
            console.error('[Cognito] Error revoking token:', err);
            chrome.identity.clearAllCachedAuthTokens(() => {
              console.log('[Cognito] Cleared all cached auth tokens after revoke error');
              if (callback) callback();
            });
          });
      });
    } else {
      console.log('[Cognito] No token found to revoke');
      chrome.identity.clearAllCachedAuthTokens(() => {
        console.log('[Cognito] Cleared all auth tokens anyway');
        if (callback) callback();
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Cognito] Extension installed.');
  forceTokenReset(() => {
    console.log('[Cognito] Tokens reset on extension install/update');
  });
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
  
  // Handle inserting outline into a Google Doc
  if (request.action === "insertOutline") {
    const docId = request.docId;
    const content = request.content;
    
    if (!docId || !content) {
      sendResponse({ success: false, error: 'Missing required parameters' });
      return true;
    }
    
    // Force reset tokens to ensure we get a clean one with the right permissions
    forceTokenReset(() => {
      console.log('[Cognito] Tokens reset before requesting new one for document insertion');
      
      // Request a new token with explicit scopes
      chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: ['https://www.googleapis.com/auth/documents']
      }, (token) => {
        if (chrome.runtime.lastError || !token) {
          console.error('[Cognito] Error getting token:', chrome.runtime.lastError);
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError?.message || 'Failed to authenticate with Google'
          });
          return;
        }
        
        console.log('[Cognito] Got new token for document insertion:', token.substring(0, 5) + '...');
        
        // Prepare the request to insert content at current cursor position
        const requestBody = {
          requests: [
            {
              insertText: {
                // Insert at end of document as a fallback location
                endOfSegmentLocation: {
                  segmentId: ""
                },
                text: content
              }
            }
          ]
        };
        
        console.log('[Cognito] Sending request to Google Docs API:', JSON.stringify(requestBody));
        
        // Send request to Google Docs API
        fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
        .then(response => {
          console.log('[Cognito] Got response from API:', response.status);
          
          if (!response.ok) {
            // Check if it's an authorization issue
            if (response.status === 401 || response.status === 403) {
              console.error('[Cognito] Auth error, invalidating token');
              // Invalidate the token and try again
              forceTokenReset(() => {
                console.log('[Cognito] Forcefully removed invalid token, user should try again');
              });
            }
            
            return response.text().then(text => {
              console.error('[Cognito] API error details:', text);
              throw new Error(`API error: ${response.status} - ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log('[Cognito] Document updated successfully:', data);
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('[Cognito] Error updating document:', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to update document'
          });
        });
      });
    });
    
    return true;
  }
  
  // Add a debug action to force token reset for testing
  if (request.action === "resetTokens") {
    forceTokenReset(() => {
      sendResponse({ success: true, message: "Tokens successfully reset" });
    });
    return true;
  }

  sendResponse({ success: false, error: 'No matching action' });
});
