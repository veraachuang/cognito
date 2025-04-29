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

/***/ "./js/popup.js":
/*!*********************!*\
  !*** ./js/popup.js ***!
  \*********************/
/***/ (() => {

eval("//popup.js\ndocument.addEventListener('DOMContentLoaded', () => {\n  const connectionStatus = document.getElementById('connection-status');\n  const connectButton = document.getElementById('connect-button');\n  const toggleSidebarBtn = document.getElementById('toggle-sidebar');\n  const uploadDocsBtn = document.getElementById('upload-docs');\n  const createOutlineBtn = document.getElementById('create-outline');\n\n  // Send messages to content script\n  async function sendMessage(message) {\n    console.log('Sending message:', message);\n    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });\n    if (!tab?.id) return;\n\n    try {\n      const response = await chrome.tabs.sendMessage(tab.id, message);\n      console.log('Message response:', response);\n    } catch (error) {\n      await chrome.scripting.executeScript({\n        target: { tabId: tab.id },\n        files: ['content.js']\n      });\n      await chrome.tabs.sendMessage(tab.id, message);\n    }\n  }\n\n  // Update status based on whether user is in a Google Doc\n  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {\n    const isGoogleDocs = tabs[0]?.url?.startsWith('https://docs.google.com/document');\n    connectionStatus.textContent = isGoogleDocs ? 'Connected' : 'Not connected';\n    connectionStatus.classList.toggle('connected', isGoogleDocs);\n  });\n\n  // Button behaviors\n  connectButton?.addEventListener('click', () => {\n    sendMessage({ action: 'toggleSidebar', tab: 'upload', fromPopup: true });\n    window.close();\n  });\n\n  toggleSidebarBtn?.addEventListener('click', () => {\n    sendMessage({ action: 'toggleSidebar' });\n  });\n\n  uploadDocsBtn?.addEventListener('click', () => {\n    sendMessage({ action: 'toggleSidebar', tab: 'upload' });\n  });\n\n  createOutlineBtn?.addEventListener('click', () => {\n    sendMessage({ action: 'toggleSidebar', tab: 'braindump' });\n  });\n\n  // Optional: Handle incoming messages if needed\n  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {\n    if (request.type === 'connectionStatusChanged') {\n      connectionStatus.textContent = request.connected ? 'Connected' : 'Not connected';\n      connectionStatus.classList.toggle('connected', request.connected);\n    }\n    sendResponse({ received: true });\n    return true;\n  });\n});\n\n//# sourceURL=webpack://cognito-extension/./js/popup.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./js/popup.js"]();
/******/ 	
/******/ })()
;