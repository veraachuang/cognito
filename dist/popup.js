/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./popup.js":
/*!******************!*\
  !*** ./popup.js ***!
  \******************/
/***/ (() => {

eval("document.addEventListener('DOMContentLoaded', () => {\n  const connectionStatus = document.getElementById('connection-status');\n  const connectButton = document.getElementById('connect-button');\n  const toggleSidebarBtn = document.getElementById('toggle-sidebar');\n  const uploadDocsBtn = document.getElementById('upload-docs');\n  const createOutlineBtn = document.getElementById('create-outline');\n\n  // Helper function to send messages to content script\n  async function sendMessage(message) {\n    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });\n    if (!tab) return;\n\n    try {\n      await chrome.tabs.sendMessage(tab.id, message);\n    } catch (error) {\n      // If content script isn't injected, inject it and try again\n      await chrome.scripting.executeScript({\n        target: { tabId: tab.id },\n        files: ['content.js']\n      });\n      await chrome.tabs.sendMessage(tab.id, message);\n    }\n  }\n\n  // Check if we're on Google Docs and update status\n  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {\n    const isGoogleDocs = tabs[0]?.url.startsWith('https://docs.google.com/document');\n    connectionStatus.textContent = isGoogleDocs ? 'Connected' : 'Not connected';\n    connectionStatus.classList.toggle('connected', isGoogleDocs);\n  });\n\n  // Connect button\n  connectButton.addEventListener('click', async () => {\n    await sendMessage({ action: 'toggleSidebar', tab: 'upload' });\n    window.close();\n  });\n\n  // Toggle Sidebar button\n  toggleSidebarBtn.addEventListener('click', () => {\n    sendMessage({ action: 'toggleSidebar' });\n  });\n\n  // Quick Actions buttons\n  uploadDocsBtn.addEventListener('click', () => {\n    sendMessage({ action: 'toggleSidebar', tab: 'upload' });\n  });\n\n  createOutlineBtn.addEventListener('click', () => {\n    sendMessage({ action: 'toggleSidebar', tab: 'braindump' });\n  });\n\n  // Listen for messages from the content script\n  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {\n    console.log('Received message in popup:', request);\n    if (request.type === 'connectionStatusChanged') {\n      connectionStatus.textContent = request.connected ? 'Connected' : 'Not connected';\n      connectionStatus.classList.toggle('connected', request.connected);\n    }\n    sendResponse({ received: true });\n    return true;\n  });\n}); \n\n//# sourceURL=webpack://cognito-extension/./popup.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./popup.js"]();
/******/ 	
/******/ })()
;