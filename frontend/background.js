//background.js
console.log('[Cognito] Background script loaded');

// Global variable to keep track of whether we've already tried to revoke and refresh tokens
let hasTriedTokenRefresh = false;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Cognito] Extension installed');
  hasTriedTokenRefresh = false;
  
  revokeAndClearAllTokens(() => {
    console.log('[Cognito] All tokens cleared on install');
  });
});

// Function to revoke and clear all tokens
function revokeAndClearAllTokens(callback) {
  // First try to get the current token
  chrome.identity.getAuthToken({ interactive: false }, function(token) {
    if (token) {
      console.log('[Cognito] Found token to revoke');
      // Revoke the token on Google's servers
      fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
      .then(() => {
        console.log('[Cognito] Successfully revoked token');
      })
      .catch(error => {
        console.error('[Cognito] Error revoking token:', error);
      })
      .finally(() => {
        // Remove from Chrome's cache
        chrome.identity.removeCachedAuthToken({ token }, () => {
          console.log('[Cognito] Removed token from cache');
          if (callback) {
            callback();
          }
        });
      });
    } else {
      // No token found, just call the callback
      console.log('[Cognito] No token found to revoke');
      if (callback) {
        callback();
      }
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Cognito] Message received:', request.action);
  
  // Handle reading document text
  if (request.action === "getDocText") {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) {
        console.error('[Cognito] Auth error:', chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError?.message || 'No token retrieved' });
        return;
      }

      const docId = request.docId;
      fetch(`https://docs.googleapis.com/v1/documents/${docId}?fields=body.content`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          const text = data.body.content
            .map(el => el.paragraph?.elements?.map(e => e.textRun?.content).join('') || '')
            .join('\n');
          sendResponse({ text });
        })
        .catch(err => sendResponse({ error: err.message }));
    });
    
    return true;
  }
  
  // Handle insertOutlineWithAPI action - enhanced API-based insertion method
  if (request.action === "insertOutlineWithAPI") {
    const docId = request.docId;
    const content = request.content;
    
    if (!docId || !content) {
      sendResponse({ 
        success: false, 
        error: 'Missing required parameters'
      });
      return true;
    }
    
    console.log('[Cognito] Inserting outline into document with Google Docs API:', docId);
    
    // Try with a fresh token every time
    refreshAndGetToken()
      .then(token => {
        console.log('[Cognito] Obtained fresh token for API access');
        
        // First check if we have write access to the document
        return checkDocumentAccess(docId, token)
          .then(accessInfo => {
            if (!accessInfo.canWrite) {
              throw new Error(`Permission denied: ${accessInfo.message}. You need edit access to this document.`);
            }
            
            // Use the batchUpdate endpoint to insert text at the beginning of the document
            return insertTextIntoDocument(docId, content, token);
          });
      })
      .then(response => {
        console.log('[Cognito] Document updated successfully:', response);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('[Cognito] Error inserting outline:', error);
        
        if (error.status === 401 || error.message.includes('token')) {
          console.log('[Cognito] Token issue detected, trying one more time with a fresh token');
          
          // Properly handle token revocation process
          chrome.identity.getAuthToken({ interactive: false }, function(oldToken) {
            // If we have a token, remove it
            if (oldToken) {
              chrome.identity.removeCachedAuthToken({ token: oldToken }, function() {
                // Try to get a completely fresh token
                chrome.identity.getAuthToken({ interactive: true }, function(freshToken) {
                  if (chrome.runtime.lastError || !freshToken) {
                    const errorMsg = chrome.runtime.lastError 
                      ? chrome.runtime.lastError.message 
                      : 'No token retrieved';
                    console.error('[Cognito] Failed to get fresh token:', errorMsg);
                    sendResponse({ 
                      success: false, 
                      error: 'Authentication failed after retry: ' + errorMsg,
                      details: error.details || error.message
                    });
                    return;
                  }
                  
                  // Try one more time with the fresh token
                  insertTextIntoDocument(docId, content, freshToken)
                    .then(response => {
                      console.log('[Cognito] Document updated successfully on retry:', response);
                      sendResponse({ success: true });
                    })
                    .catch(finalError => {
                      console.error('[Cognito] Final error after token refresh:', finalError);
                      sendResponse({ 
                        success: false, 
                        error: 'API error: ' + finalError.message,
                        details: finalError.details || finalError.message
                      });
                    });
                });
              });
            } else {
              // No existing token to revoke, just try again
              chrome.identity.getAuthToken({ interactive: true }, function(freshToken) {
                // Same token handling logic as above
                if (chrome.runtime.lastError || !freshToken) {
                  sendResponse({ 
                    success: false, 
                    error: 'Authentication failed: ' + 
                           (chrome.runtime.lastError?.message || 'No token retrieved'),
                    details: error.details || error.message
                  });
                  return;
                }
                
                insertTextIntoDocument(docId, content, freshToken)
                  .then(response => {
                    console.log('[Cognito] Document updated successfully with new token:', response);
                    sendResponse({ success: true });
                  })
                  .catch(finalError => {
                    console.error('[Cognito] Final error after getting new token:', finalError);
                    sendResponse({ 
                      success: false, 
                      error: 'API error: ' + finalError.message,
                      details: finalError.details || finalError.message
                    });
                  });
              });
            }
          });
        } else {
          // For other errors, return detailed error information
          sendResponse({ 
            success: false, 
            error: formatErrorMessage(error),
            details: error.details || error.message
          });
        }
      });
    
    return true;
  }
  
  // Legacy insertOutlineSimple handler - redirect to the new API method
  if (request.action === "insertOutlineSimple") {
    console.log('[Cognito] Redirecting legacy outline insertion to API method');
    
    // Modified approach to handle legacy requests
    const docId = request.docId;
    const content = request.content;
    
    // Simply call the same code path as insertOutlineWithAPI
    if (!docId || !content) {
      sendResponse({ 
        success: false, 
        error: 'Missing required parameters'
      });
      return true;
    }
    
    // Use the same implementation as insertOutlineWithAPI
    refreshAndGetToken()
      .then(token => {
        console.log('[Cognito] Obtained fresh token for API access (legacy path)');
        
        return checkDocumentAccess(docId, token)
          .then(accessInfo => {
            if (!accessInfo.canWrite) {
              throw new Error(`Permission denied: ${accessInfo.message}. You need edit access to this document.`);
            }
            
            return insertTextIntoDocument(docId, content, token);
          });
      })
      .then(response => {
        console.log('[Cognito] Document updated successfully via legacy path:', response);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('[Cognito] Error in legacy handler:', error);
        sendResponse({ 
          success: false, 
          error: formatErrorMessage(error),
          details: error.details || error.message
        });
      });
    
    return true;
  }
  
  // Default response for unhandled actions
  sendResponse({ success: false, error: 'Unrecognized action' });
  return true;
});

/**
 * More aggressive token invalidation when standard methods don't work
 * This is useful in environments with stricter security policies
 */
function forceTokenInvalidation() {
  return new Promise((resolve, reject) => {
    // First try to get the current token without prompting user
    chrome.identity.getAuthToken({ interactive: false }, function(token) {
      if (chrome.runtime.lastError || !token) {
        // No existing token found, nothing to invalidate
        console.log('[Cognito] No existing token found, skipping invalidation');
        resolve(null);
        return;
      }
      
      console.log('[Cognito] Found token, attempting to invalidate');
      
      // Approach 1: First try Chrome's built-in method
      chrome.identity.removeCachedAuthToken({ token }, function() {
        if (chrome.runtime.lastError) {
          console.warn('[Cognito] Error removing cached token:', chrome.runtime.lastError.message);
          // Continue with other approaches
        }
        
        // Approach 2: Try to revoke the token on Google's servers
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        .then(response => {
          if (response.ok) {
            console.log('[Cognito] Successfully revoked token on Google servers');
          } else {
            console.warn('[Cognito] Error revoking token on Google servers:', response.status);
          }
          
          // Even if revocation failed, consider token invalidated for our purposes
          resolve(token);
        })
        .catch(error => {
          console.warn('[Cognito] Network error during token revocation:', error);
          // Continue treating the token as invalidated
          resolve(token);
        });
      });
    });
  });
}

// Inside the refreshAndGetToken function, add a fallback mechanism:
function refreshAndGetToken() {
  return new Promise((resolve, reject) => {
    // First attempt using standard approach
    getAndClearExistingToken()
      .then(() => {
        return getNewToken();
      })
      .then(token => {
        resolve(token);
      })
      .catch(error => {
        console.warn('[Cognito] Error with standard token approach:', error);
        console.log('[Cognito] Trying fallback token approach');
        
        // Fallback approach: More aggressive token invalidation
        forceTokenInvalidation()
          .then(() => {
            // Now try to get a completely fresh token
            chrome.identity.getAuthToken({ interactive: true }, function(token) {
              if (chrome.runtime.lastError || !token) {
                reject(new Error('Failed to get authentication token after fallback: ' + 
                                (chrome.runtime.lastError?.message || 'No token retrieved')));
              } else {
                resolve(token);
              }
            });
          })
          .catch(fallbackError => {
            reject(fallbackError);
          });
      });
  });
}

/**
 * Helper function to get and clear an existing token
 */
function getAndClearExistingToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, function(existingToken) {
      if (chrome.runtime.lastError) {
        console.log('[Cognito] No existing token found or error:', chrome.runtime.lastError.message);
        resolve();
        return;
      }
      
      if (!existingToken) {
        console.log('[Cognito] No existing token found');
        resolve();
        return;
      }
      
      // Token exists, remove it
      console.log('[Cognito] Removing existing token');
      chrome.identity.removeCachedAuthToken({ token: existingToken }, function() {
        if (chrome.runtime.lastError) {
          console.warn('[Cognito] Error removing token:', chrome.runtime.lastError.message);
        }
        resolve();
      });
    });
  });
}

/**
 * Helper function to get a new token
 */
function getNewToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) {
        const error = chrome.runtime.lastError 
          ? chrome.runtime.lastError.message 
          : 'No token retrieved';
        console.error('[Cognito] Failed to get auth token:', error);
        reject(new Error('Failed to get authentication token: ' + error));
      } else {
        console.log('[Cognito] Successfully obtained new token');
        resolve(token);
      }
    });
  });
}

/**
 * Format error messages for better user understanding
 */
function formatErrorMessage(error) {
  // Check for common error patterns and provide more user-friendly messages
  if (error.status === 403) {
    return 'Permission denied: You need edit access to this document';
  } else if (error.status === 401) {
    return 'Authentication error: Please try again or reload the extension';
  } else if (error.status === 404) {
    return 'Document not found: The document may have been deleted or moved';
  } else if (error.details && error.details.includes('Rate Limit Exceeded')) {
    return 'API rate limit exceeded: Please try again in a moment';
  }
  
  // Default error message
  return error.message || 'An unknown error occurred';
}

/**
 * Enhanced function to check document access with more detailed information
 */
function checkDocumentAccess(docId, token) {
  return fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 403) {
        return { canWrite: false, message: 'No permission to edit this document' };
      } else if (response.status === 404) {
        return { canWrite: false, message: 'Document not found' };
      }
      throw new Error(`Could not access document: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // If we can get document details, check if we have edit capabilities
    // In Google Docs API, if we can read the document content, we likely have at least read access
    return { 
      canWrite: true, 
      title: data.title || 'Unnamed Document',
      message: 'Document access verified'
    };
  })
  .catch(error => {
    console.error('[Cognito] Error checking document access:', error);
    return { 
      canWrite: false, 
      message: error.message || 'Could not verify document access'
    };
  });
}

/**
 * Enhanced function to insert text into a Google Doc with better error handling
 */
function insertTextIntoDocument(docId, content, token) {
  // Create a request to insert the text at the beginning of the document
  const requestBody = {
    requests: [
      {
        insertText: {
          location: {
            index: 1  // Start of the document (after initial position 0)
          },
          text: content
        }
      }
    ]
  };
  
  console.log('[Cognito] Sending batchUpdate request to Google Docs API');
  
  return fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    console.log('[Cognito] API response status:', response.status);
    
    if (!response.ok) {
      return response.text().then(text => {
        console.error('[Cognito] API error response:', text);
        
        // Create a detailed error object
        const error = new Error(`API error: ${response.status}`);
        error.status = response.status;
        error.details = text;
        throw error;
      });
    }
    return response.json();
  });
}
