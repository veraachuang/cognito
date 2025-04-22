// google-docs-api.js - Google Docs API integration

console.log('[Cognito] Google Docs API module loaded');

let accessToken = null;
let documentId = null;

/**
 * Initialize Google API client and authenticate
 */
export function initGoogleApiClient() {
  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = () => {
    gapi.load('client:auth2', initClient);
  };
  document.body.appendChild(script);
}

/**
 * Initialize Google API client
 */
async function initClient() {
  try {
    await gapi.client.init({
      apiKey: 'YOUR_API_KEY', // Replace with your actual API key
      clientId: 'YOUR_CLIENT_ID', // Replace with your actual client ID
      discoveryDocs: ['https://docs.googleapis.com/$discovery/rest?version=v1'],
      scope: 'https://www.googleapis.com/auth/documents.readonly'
    });

    // Listen for sign-in state changes
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatus);
    
    // Handle the initial sign-in state
    updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  } catch (error) {
    console.error('[Cognito] Error initializing Google API client:', error);
    // Notify caller of failure
    document.dispatchEvent(new CustomEvent('cognito-google-api-failed', { detail: error }));
  }
}

/**
 * Update sign-in status and handle authentication changes
 * @param {boolean} isSignedIn - Whether user is signed in
 */
function updateSignInStatus(isSignedIn) {
  if (isSignedIn) {
    accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
    console.log('[Cognito] Google API authenticated');
    
    // Extract document ID
    documentId = extractDocumentId();
    
    // Notify of successful authentication
    document.dispatchEvent(new CustomEvent('cognito-google-api-ready', { 
      detail: { documentId, accessToken }
    }));
  } else {
    console.warn('[Cognito] Not signed in to Google API');
    // Prompt for sign-in
    try {
      gapi.auth2.getAuthInstance().signIn();
    } catch (error) {
      console.error('[Cognito] Error signing in:', error);
      document.dispatchEvent(new CustomEvent('cognito-google-api-failed', { detail: error }));
    }
  }
}

/**
 * Extract document ID from URL
 * @returns {string|null} Document ID or null if not found
 */
function extractDocumentId() {
  const urlPattern = /\/document\/d\/([a-zA-Z0-9-_]+)/;
  const match = window.location.href.match(urlPattern);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Fetch document content using Google Docs API
 * @returns {Promise<string|null>} Document text content or null if failed
 */
export async function fetchDocumentContent() {
  if (!accessToken || !documentId) {
    return null;
  }

  try {
    const response = await gapi.client.docs.documents.get({
      documentId: documentId
    });

    // Process the document content
    const document = response.result;
    let fullText = '';
    
    // Extract text from document elements
    if (document.body && document.body.content) {
      document.body.content.forEach(element => {
        if (element.paragraph) {
          element.paragraph.elements.forEach(paraElement => {
            if (paraElement.textRun && paraElement.textRun.content) {
              fullText += paraElement.textRun.content;
            }
          });
        }
      });
    }
    
    return fullText;
  } catch (error) {
    console.error('[Cognito] Error fetching document content:', error);
    return null;
  }
}

/**
 * Start polling for document changes using Google API
 * @param {Function} callback - Function to call with fetched text
 * @returns {number} Interval ID
 */
export function startGoogleApiPolling(callback) {
  console.log('[Cognito] Starting Google API polling');
  
  const intervalId = setInterval(async () => {
    try {
      const text = await fetchDocumentContent();
      
      if (!text) {
        console.warn('[Cognito] No text retrieved from Google API');
        return;
      }
      
      callback(text);
    } catch (error) {
      console.error('[Cognito] Error in Google API polling:', error);
    }
  }, 2000);
  
  return intervalId;
} 