// outline-manager.js - Outline generation and application

console.log('[Cognito] Outline Manager module loaded');

/**
 * Format the outline for display
 * @param {Object} outline - Outline data
 * @returns {Object} Formatted outline with text and html
 */
export function formatOutline(outline) {
  console.log('Starting outline formatting with outline:', outline);
  
  // Validate outline structure
  if (!outline || typeof outline !== 'object') {
    console.error('Invalid outline object:', outline);
    throw new Error('Invalid outline object provided');
  }

  let text = '';

  // Process each section
  outline.sections.forEach((section, sectionIndex) => {
    // Section title with proper formatting
    text += `${section.title}\n\n`;

    // Key points with bullet points and proper formatting
    if (Array.isArray(section.key_points) && section.key_points.length > 0) {
      section.key_points.forEach(point => {
        if (point && typeof point === 'string') {
          text += `• ${point.trim()}\n`;
        }
      });
    }

    // Add extra newline between sections
    text += '\n';
  });

  // Ensure there's always some content
  if (!text.trim()) {
    text = 'Empty Outline\n\n• No content provided\n';
  }

  console.log('Formatted outline text:', text);

  return {
    text: text,
    html: text
  };
}

/**
 * Apply the outline to the Google Doc
 * @param {Object} outline - Outline data
 */
export async function applyOutlineToDocument(outline) {
  console.log('Starting applyOutlineToDocument');
  console.log('Outline data:', outline);

  try {
    // Find the editor directly
    const editor = document.querySelector('.kix-appview-editor');
    if (!editor) {
      // If editor isn't found immediately, we might need to wait for it too,
      // but for now, we'll assume it should be present or throw.
      throw new Error('Google Docs editor (.kix-appview-editor) not found.');
    }
    console.log('Found editor:', editor);

    // Check if the page element already exists
    const page = editor.querySelector('.kix-page');
    if (page) {
      console.log('.kix-page found immediately.');
      insertStyledOutline(page, outline);
    } else {
      console.log('.kix-page not found immediately. Setting up MutationObserver...');
      // If page doesn't exist, wait for it with a MutationObserver
      const observer = new MutationObserver((mutations, obs) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              // Check if the added node is the page or contains the page
              if (node.nodeType === Node.ELEMENT_NODE) {
                const foundPage = (node.matches && node.matches('.kix-page')) 
                                  ? node 
                                  : node.querySelector('.kix-page');
                
                if (foundPage) {
                  console.log('.kix-page found by MutationObserver.');
                  obs.disconnect(); // Stop observing once found
                  insertStyledOutline(foundPage, outline); 
                  return; // Exit once handled
                }
              }
            }
          }
        }
      });

      // Start observing the editor for child additions
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      console.log('MutationObserver is waiting for .kix-page...');
    }

  } catch (error) {
    // Catch errors finding the editor or setting up the observer
    console.error('Error applying outline:', error);
    console.error('Error stack:', error.stack);
    notifyOutlineApplied(false, error.message);
  }
}

/**
 * Insert styled outline into the page
 * @param {Element} pageElement - The page element to insert into
 * @param {Object} outline - Outline data
 */
function insertStyledOutline(pageElement, outline) {
  try {
    console.log('Inserting outline into page:', pageElement);
    // Format the outline
    const formattedOutline = formatOutline(outline);
    console.log('Formatted outline text:', formattedOutline.text);

    // Create the container div for the outline
    const outlineContainer = document.createElement('div');
    outlineContainer.className = 'cognito-inserted-outline';
    Object.assign(outlineContainer.style, {
      border: '1px solid #e0e0e0',
      padding: '10px 15px',
      margin: '10px 0',
      backgroundColor: '#f9f9f9',
      borderRadius: '4px',
      fontFamily: 'Arial, sans-serif', // Ensure consistent font
      fontSize: '11pt' // Match typical Google Docs font size
    });

    // Split the text into paragraphs and create elements
    const paragraphs = formattedOutline.text.split('\n');
    paragraphs.forEach(paragraphText => {
      if (paragraphText.trim()) {
        const paragraphElement = document.createElement('div');
        paragraphElement.textContent = paragraphText;
        paragraphElement.style.marginBottom = '5px';
        paragraphElement.style.lineHeight = '1.4'; // Improve readability
        outlineContainer.appendChild(paragraphElement);
      }
    });

    // Insert the container at the top of the page
    pageElement.insertBefore(outlineContainer, pageElement.firstChild);

    // Notify success
    console.log('Outline application completed successfully.');
    notifyOutlineApplied(true);
  } catch (error) {
    console.error('Error during outline insertion:', error);
    console.error('Error stack:', error.stack);
    notifyOutlineApplied(false, `Error during insertion: ${error.message}`);
  }
}

/**
 * Notify the sidebar of outline application status
 * @param {boolean} success - Whether application was successful
 * @param {string} errorMessage - Error message if applicable
 */
function notifyOutlineApplied(success, errorMessage = null) {
  const sidebarFrame = document.querySelector('iframe[src*="sidebar.html"]');
  
  if (sidebarFrame?.contentWindow) {
    sidebarFrame.contentWindow.postMessage({
      action: 'outlineApplied',
      success,
      ...(errorMessage && { error: errorMessage })
    }, '*');
  } else {
    console.warn('Sidebar frame not found for notification');
  }
} 