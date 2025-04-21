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

eval("document.addEventListener(\"DOMContentLoaded\",(()=>{const e=document.getElementById(\"connection-status\"),t=document.getElementById(\"connect-button\"),n=document.getElementById(\"toggle-sidebar\"),o=document.getElementById(\"upload-docs\"),c=document.getElementById(\"create-outline\");async function a(e){console.log(\"Sending message:\",e);const[t]=await chrome.tabs.query({active:!0,currentWindow:!0});if(t)try{const n=await chrome.tabs.sendMessage(t.id,e);console.log(\"Message response:\",n)}catch(n){console.error(\"Error sending message:\",n);try{await chrome.scripting.executeScript({target:{tabId:t.id},files:[\"content.js\"]});const n=await chrome.tabs.sendMessage(t.id,e);console.log(\"Message response after injection:\",n)}catch(e){console.error(\"Error injecting content script:\",e)}}else console.error(\"No active tab found\")}chrome.tabs.query({active:!0,currentWindow:!0},(t=>{const n=t[0]?.url?.startsWith(\"https://docs.google.com/document\");e.textContent=n?\"Connected\":\"Not connected\",e.classList.toggle(\"connected\",n)})),t.addEventListener(\"click\",(async()=>{await a({action:\"toggleSidebar\",tab:\"upload\"}),window.close()})),n.addEventListener(\"click\",(async()=>{await a({action:\"toggleSidebar\"})})),o.addEventListener(\"click\",(async()=>{await a({action:\"toggleSidebar\",tab:\"upload\"})})),c.addEventListener(\"click\",(async()=>{await a({action:\"toggleSidebar\",tab:\"braindump\"})})),chrome.runtime.onMessage.addListener(((t,n,o)=>(console.log(\"Received message in popup:\",t),\"connectionStatusChanged\"===t.type&&(e.textContent=t.connected?\"Connected\":\"Not connected\",e.classList.toggle(\"connected\",t.connected)),o({received:!0}),!0)))}));\n\n//# sourceURL=webpack://cognito-extension/./popup.js?");

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