// layout-manager.js - UI layout adjustments for Google Docs

import { debounce } from './utils.js';

console.log('[Cognito] Layout Manager module loaded');

/**
 * Setup observer for Google Docs UI changes
 * @param {Function} adjustLayoutCallback - Callback to adjust layout
 * @returns {MutationObserver} Created observer
 */
export function setupDocsObserver(adjustLayoutCallback) {
  // Create a one-time observer to wait for the editor to load
  const docsObserver = new MutationObserver((mutations, obs) => {
    const docsContainer = document.querySelector('.kix-appview-editor');
    if (docsContainer) {
      obs.disconnect();
      
      // Set up the actual observer for layout changes
      const newObserver = new MutationObserver(debounce(() => {
        if (document.querySelector('.kix-appview-editor')) {
          adjustLayoutCallback();
        }
      }, 100));

      newObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      return newObserver;
    }
  });

  docsObserver.observe(document.body, { childList: true, subtree: true });
  return docsObserver;
}

/**
 * Setup observer for generic web page changes
 * @param {Function} adjustLayoutCallback - Callback to adjust layout
 * @param {boolean} sidebarVisible - Whether sidebar is visible
 * @returns {MutationObserver} Created observer
 */
export function setupGenericObserver(adjustLayoutCallback, sidebarVisible) {
  // Add margin to body or main container
  const mainContainer = document.querySelector('main') || document.querySelector('#main') || document.body;
  if (mainContainer) {
    mainContainer.style.transition = 'margin-right 0.3s ease';
  }

  // Create observer for dynamic content
  const genericObserver = new MutationObserver(debounce(() => {
    if (sidebarVisible) {
      adjustLayoutCallback();
    }
  }, 100));

  genericObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  return genericObserver;
}

/**
 * Adjust layout for Google Docs
 * @param {boolean} sidebarVisible - Whether sidebar is visible
 */
export function adjustDocsLayout(sidebarVisible) {
  // Main content containers that need margin and width adjustment
  const mainContainers = [
    '.kix-appview-editor',
    '.docs-toolbar-wrapper',
    '.docs-titlebar-badges',
    '.docs-horizontal-ruler',
    '.docs-menubar',
    '.docs-header',
    '.companion-guest-app-switcher-container'
  ];

  const margin = sidebarVisible ? '350px' : '0';
  
  // Adjust main content containers
  mainContainers.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      if (selector === '.companion-guest-app-switcher-container') {
        // Special handling for companion container
        element.style.right = margin;
        element.style.transition = 'right 0.3s ease';
      } else {
        element.style.marginRight = margin;
        element.style.width = sidebarVisible ? `calc(100% - ${margin})` : '100%';
        element.style.transition = 'all 0.3s ease';
      }
    }
  });

  // Handle the document page container specifically
  const pageContainer = document.querySelector('.kix-page');
  if (pageContainer) {
    pageContainer.style.marginRight = margin;
    pageContainer.style.transition = 'margin 0.3s ease';
  }

  // Adjust Google Docs side panel containers
  const sidePanelContainers = [
    '.companion-app-switcher-container',
    '.companion-guest-app-switcher-container'
  ];

  sidePanelContainers.forEach(selector => {
    const container = document.querySelector(selector);
    if (container) {
      if (sidebarVisible) {
        container.style.right = margin;
        container.style.width = 'var(--companion-app-switcher-width)';
      } else {
        container.style.right = '0';
        container.style.width = '';
      }
      container.style.transition = 'right 0.3s ease';
    }
  });

  // Adjust toolbar wrapper specifically
  const toolbarWrapper = document.querySelector('.docs-toolbar-wrapper');
  if (toolbarWrapper) {
    toolbarWrapper.style.marginRight = margin;
    toolbarWrapper.style.width = sidebarVisible ? `calc(100% - ${margin})` : '100%';
    toolbarWrapper.style.transition = 'all 0.3s ease';
    
    // Ensure the inner toolbar elements are properly aligned
    const innerToolbar = toolbarWrapper.querySelector('.docs-toolbar');
    if (innerToolbar) {
      innerToolbar.style.width = '100%';
      innerToolbar.style.transition = 'all 0.3s ease';
    }
  }

  // Handle responsive UI elements
  if (sidebarVisible) {
    // Add compact mode class to body
    document.body.classList.add('docs-size-compact');
    
    // Adjust share button to compact mode
    const shareButtonText = document.querySelector('.docs-share-button-label');
    if (shareButtonText) {
      shareButtonText.style.display = 'none';
    }

    // Make menu bar more compact
    const menuBar = document.querySelector('.docs-menubar');
    if (menuBar) {
      // Adjust menu bar container
      menuBar.style.padding = '0 4px';
      
      // Adjust individual menu items
      const menuItems = menuBar.querySelectorAll('.goog-menu-button, .docs-menu-button');
      menuItems.forEach(item => {
        item.style.padding = '0 3px';
        item.style.minWidth = '20px';
        // Hide menu item text, keep only first letter
        const menuText = item.querySelector('.goog-menu-button-caption, .docs-menu-button-label');
        if (menuText) {
          const text = menuText.textContent;
          if (text && text.length > 1) {
            menuText.setAttribute('data-full-text', text);
            menuText.textContent = text[0];
          }
        }
      });
    }

    // Adjust toolbar buttons to be more compact
    const toolbarButtons = document.querySelectorAll('.goog-toolbar-button, .docs-toolbar-button');
    toolbarButtons.forEach(button => {
      button.style.padding = '0 4px';
      button.style.margin = '0 1px';
    });

    // Make header more compact
    const header = document.querySelector('.docs-titlebar-buttons');
    if (header) {
      header.style.gap = '4px';
      header.style.padding = '0 8px';
    }

    // Handle side panel toggle buttons
    const sidePanelToggles = document.querySelectorAll('.companion-collapser-button-container, .companion-guest-collapser-button-container');
    sidePanelToggles.forEach(toggle => {
      if (toggle) {
        toggle.style.right = margin;
        toggle.style.transition = 'right 0.3s ease';
      }
    });

  } else {
    // Remove compact mode
    document.body.classList.remove('docs-size-compact');
    
    // Restore share button text
    const shareButtonText = document.querySelector('.docs-share-button-label');
    if (shareButtonText) {
      shareButtonText.style.display = '';
    }

    // Restore menu bar
    const menuBar = document.querySelector('.docs-menubar');
    if (menuBar) {
      // Restore menu bar container
      menuBar.style.padding = '';
      
      // Restore menu items
      const menuItems = menuBar.querySelectorAll('.goog-menu-button, .docs-menu-button');
      menuItems.forEach(item => {
        item.style.padding = '';
        item.style.minWidth = '';
        // Restore menu item text
        const menuText = item.querySelector('.goog-menu-button-caption, .docs-menu-button-label');
        if (menuText && menuText.hasAttribute('data-full-text')) {
          menuText.textContent = menuText.getAttribute('data-full-text');
          menuText.removeAttribute('data-full-text');
        }
      });
    }

    // Restore toolbar buttons
    const toolbarButtons = document.querySelectorAll('.goog-toolbar-button, .docs-toolbar-button');
    toolbarButtons.forEach(button => {
      button.style.padding = '';
      button.style.margin = '';
    });

    // Restore header
    const header = document.querySelector('.docs-titlebar-buttons');
    if (header) {
      header.style.gap = '';
      header.style.padding = '';
    }

    // Restore side panel toggle buttons
    const sidePanelToggles = document.querySelectorAll('.companion-collapser-button-container, .companion-guest-collapser-button-container');
    sidePanelToggles.forEach(toggle => {
      if (toggle) {
        toggle.style.right = '0';
      }
    });
  }

  // Also adjust generic layout
  adjustGenericLayout(sidebarVisible);
}

/**
 * Adjust layout for generic web pages
 * @param {boolean} sidebarVisible - Whether sidebar is visible
 */
export function adjustGenericLayout(sidebarVisible) {
  const mainContainer = document.querySelector('main') || document.querySelector('#main') || document.body;
  const margin = sidebarVisible ? '350px' : '0';
  
  if (mainContainer) {
    mainContainer.style.marginRight = margin;
    mainContainer.style.width = sidebarVisible ? `calc(100% - ${margin})` : '100%';
  }
} 