let lastText = "";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TEXT_SELECTED") {
    lastText = message.text;
  }

  if (message.type === "GET_TEXT") {
    sendResponse({ text: lastText });
  }

  return true;
});

