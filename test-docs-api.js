/**
 * Test script for Google Docs API 
 * 
 * This script can be manually run in Chrome's console when you're on a Google Doc page
 * to test if the insertion functionality works correctly.
 * 
 * How to use:
 * 1. Open a Google Doc
 * 2. Open Chrome DevTools (F12 or right-click -> Inspect)
 * 3. Copy this entire script to the console and press Enter
 * 4. Call testDocAPIInsertion() in the console
 */

function testDocAPIInsertion() {
  // Get the document ID from the URL
  const docId = extractDocId();
  if (!docId) {
    console.error('Could not determine Google Doc ID');
    return;
  }
  
  console.log('Test starting for document ID:', docId);
  console.log('Checking for existing tokens...');
  
  // First check for and remove any existing token
  getAndClearExistingToken()
    .then(() => {
      console.log('Requesting fresh auth token...');
      return getFreshToken();
    })
    .then(token => {
      console.log('Token obtained successfully, testing document access...');
      
      // Test document access
      return fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        console.log('Access test status:', res.status, res.statusText);
        if (!res.ok) {
          throw new Error(`Access test failed: ${res.status}`);
        }
        return res.json().then(data => ({ token, data }));
      });
    })
    .then(({ token, data }) => {
      console.log('Document title:', data.title);
      console.log('Document access confirmed, attempting insertion...');
      
      // Now attempt insertion
      const testContent = "TEST INSERTION VIA GOOGLE DOCS API\n\n• This is a test insertion\n• Created at " + new Date().toLocaleString() + "\n• If you see this, the API is working correctly!\n\n";
      
      const requestBody = {
        requests: [
          {
            insertText: {
              location: {
                index: 1  // Start of the document
              },
              text: testContent
            }
          }
        ]
      };
      
      return fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    })
    .then(res => {
      console.log('Insertion API response:', res.status, res.statusText);
      if (!res.ok) {
        return res.text().then(text => {
          throw new Error(`API error: ${res.status} - ${text}`);
        });
      }
      return res.json();
    })
    .then(data => {
      console.log('Success! Document updated:', data);
      console.log('Test completed successfully!');
    })
    .catch(error => {
      console.error('Test failed:', error);
      
      // Additional debug info for failure cases
      if (error.message.includes('403')) {
        console.log('This is likely a permissions issue. Make sure:');
        console.log('1. Your OAuth client ID is properly set up for this app');
        console.log('2. You have the "https://www.googleapis.com/auth/documents" scope');
        console.log('3. You have edit permissions on this document');
      }
    });
}

// Helper function to extract document ID from URL
function extractDocId() {
  const m = location.pathname.match(/\/document\/(?:u\/\d+\/)?d\/([^/]+)/) ||
            location.pathname.match(/\/d\/([^/]+)/);
  return (m && m[1]) || new URLSearchParams(location.search).get('id') || null;
}

// Get and clear any existing token
function getAndClearExistingToken() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, function(token) {
      if (chrome.runtime.lastError || !token) {
        console.log('No existing token found or error occurred:', chrome.runtime.lastError?.message);
        resolve();
        return;
      }
      
      console.log('Found existing token, removing it...');
      chrome.identity.removeCachedAuthToken({ token }, function() {
        console.log('Existing token removed successfully');
        resolve();
      });
    });
  });
}

// Get a fresh token
function getFreshToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) {
        const errorMsg = chrome.runtime.lastError
          ? chrome.runtime.lastError.message 
          : 'No token retrieved';
        console.error('Failed to get authentication token:', errorMsg);
        reject(new Error('Authentication failed: ' + errorMsg));
        return;
      }
      
      console.log('New token obtained successfully');
      resolve(token);
    });
  });
}

/**
 * Comprehensive diagnostic function for Google Docs API integration
 * This function tests each step individually to help diagnose where issues might be occurring
 */
function diagnoseDocs() {
  console.log('===== DIAGNOSTIC TESTS FOR GOOGLE DOCS API =====');
  console.log('Starting diagnostic at', new Date().toLocaleString());
  
  // Step 1: Test chrome.identity API
  console.log('\n----- STEP 1: Testing chrome.identity API -----');
  testChromeIdentity()
    .then(() => {
      // Step 2: Test document access
      console.log('\n----- STEP 2: Testing document access -----');
      return testDocumentAccess();
    })
    .then(() => {
      // Step 3: Test document write permissions
      console.log('\n----- STEP 3: Testing document write permissions -----');
      return testDocumentWriteAccess();
    })
    .then(() => {
      console.log('\n===== DIAGNOSTIC COMPLETE =====');
      console.log('All tests completed. If you reached this point without errors, your API setup is correct.');
      console.log('You can now try a full insertion test with testDocAPIInsertion()');
    })
    .catch(error => {
      console.error('\n===== DIAGNOSTIC FAILED =====');
      console.error('The diagnostic test failed at one of the steps. See the error above for details.');
    });
}

/**
 * Step 1: Test chrome.identity API
 */
function testChromeIdentity() {
  return new Promise((resolve, reject) => {
    console.log('Testing ability to get an OAuth token...');
    
    // First check for existing token
    chrome.identity.getAuthToken({ interactive: false }, function(existingToken) {
      console.log('Existing token check result:', existingToken ? 'Token exists' : 'No existing token');
      
      if (chrome.runtime.lastError) {
        console.log('Error checking for existing token:', chrome.runtime.lastError.message);
      }
      
      // Now try to get a new token with user interaction
      console.log('Testing interactive token retrieval...');
      chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError || !token) {
          console.error('❌ Failed to get token:', chrome.runtime.lastError?.message || 'No token returned');
          reject(new Error('Token retrieval failed'));
          return;
        }
        
        console.log('✅ Successfully obtained token');
        
        // Test token removal if we got a token
        console.log('Testing token removal...');
        chrome.identity.removeCachedAuthToken({ token }, function() {
          if (chrome.runtime.lastError) {
            console.error('❌ Error removing token:', chrome.runtime.lastError.message);
            // Non-fatal error, continue
          } else {
            console.log('✅ Successfully removed token');
          }
          resolve();
        });
      });
    });
  });
}

/**
 * Step 2: Test document access
 */
function testDocumentAccess() {
  return new Promise((resolve, reject) => {
    const docId = extractDocId();
    if (!docId) {
      console.error('❌ Could not determine document ID from URL');
      reject(new Error('Missing document ID'));
      return;
    }
    
    console.log('Document ID:', docId);
    console.log('Getting fresh token for API access...');
    
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) {
        console.error('❌ Failed to get token:', chrome.runtime.lastError?.message || 'No token returned');
        reject(new Error('Token retrieval failed'));
        return;
      }
      
      console.log('✅ Token obtained. Testing document metadata access...');
      
      fetch(`https://docs.googleapis.com/v1/documents/${docId}?fields=title`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        console.log('API response status:', response.status, response.statusText);
        
        if (!response.ok) {
          console.error('❌ Failed to access document');
          throw new Error(`Document access failed with status ${response.status}`);
        }
        
        return response.json();
      })
      .then(data => {
        console.log('✅ Document access successful');
        console.log('Document title:', data.title);
        resolve();
      })
      .catch(error => {
        console.error('❌ Error during document access:', error);
        reject(error);
      });
    });
  });
}

/**
 * Step 3: Test document write permissions with a minimal insertion
 */
function testDocumentWriteAccess() {
  return new Promise((resolve, reject) => {
    const docId = extractDocId();
    if (!docId) {
      console.error('❌ Could not determine document ID from URL');
      reject(new Error('Missing document ID'));
      return;
    }
    
    console.log('Getting fresh token for API write test...');
    
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) {
        console.error('❌ Failed to get token:', chrome.runtime.lastError?.message || 'No token returned');
        reject(new Error('Token retrieval failed'));
        return;
      }
      
      console.log('✅ Token obtained. Testing document write access...');
      
      // Create a minimal test request - just a small text insertion
      const testContent = "TEST - " + new Date().toLocaleTimeString();
      const requestBody = {
        requests: [
          {
            insertText: {
              location: {
                index: 1  // Insert at the beginning
              },
              text: testContent
            }
          }
        ]
      };
      
      console.log('Sending API write request...');
      
      fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      .then(response => {
        console.log('API write response status:', response.status, response.statusText);
        
        if (!response.ok) {
          return response.text().then(text => {
            console.error('❌ Write access failed. API response:', text);
            throw new Error(`Document write failed with status ${response.status}: ${text}`);
          });
        }
        
        return response.json();
      })
      .then(data => {
        console.log('✅ Document write successful! API response:', data);
        resolve();
      })
      .catch(error => {
        console.error('❌ Error during document write test:', error);
        
        // Provide more specific guidance on fixing permissions issues
        if (error.message.includes('403')) {
          console.error('This appears to be a permissions issue. Please check:');
          console.error('1. Your manifest.json contains the scope: https://www.googleapis.com/auth/documents');
          console.error('2. Your OAuth client ID is correctly configured in the Google Cloud Console');
          console.error('3. You have edit permissions on this specific document');
        }
        
        reject(error);
      });
    });
  });
}

console.log('Test script loaded! Call testDocAPIInsertion() to run the test.');
console.log('Diagnostic tools loaded! Call diagnoseDocs() to run a comprehensive test or testDocAPIInsertion() for a full test.'); 