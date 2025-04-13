let latestDocText = "";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXT_UPDATE") {
    latestDocText = message.data;
    console.log("Received text from Docs:", latestDocText);
  } else if (message.type === "GET_LATEST_TEXT") {
    sendResponse({ text: latestDocText });
  }
});