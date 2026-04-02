document.addEventListener("mouseup", async (e) => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // Remove existing popup
  const existingPopup = document.getElementById("debrief-inline-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  if (selectedText.length > 0) {
    // Send text to background for storage (for toolbar popup compatibility)
    chrome.runtime.sendMessage({
      type: "TEXT_SELECTED",
      text: selectedText
    });

    // Create and show inline popup
    createInlinePopup(selection, selectedText);
  }
});

// Close popup when clicking outside
document.addEventListener("mousedown", (e) => {
  const popup = document.getElementById("debrief-inline-popup");
  if (popup && !popup.contains(e.target)) {
    popup.remove();
  }
});

function createInlinePopup(selection, selectedText) {
  const popup = document.createElement("div");
  popup.id = "debrief-inline-popup";
  popup.className = "debrief-popup";
  
  // Get selection position
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Initial content - loading state
  popup.innerHTML = `
    <div class="debrief-popup-header">
      <span class="debrief-popup-title">Debrief</span>
      <button class="debrief-close-btn" aria-label="Close">&times;</button>
    </div>
    <div class="debrief-popup-content">
      <div class="debrief-selected-text">${escapeHtml(selectedText)}</div>
      <div class="debrief-loading">
        <div class="debrief-spinner"></div>
        <span>Analyzing...</span>
      </div>
    </div>
  `;
  
  // Add styles if not already added
  if (!document.getElementById("debrief-popup-styles")) {
    addPopupStyles();
  }
  
  document.body.appendChild(popup);
  
  // Position popup
  positionPopup(popup, rect);
  
  // Close button handler
  popup.querySelector(".debrief-close-btn").addEventListener("click", () => {
    popup.remove();
  });
  
  // Fetch analysis
  fetchAnalysis(selectedText, popup);
}

function positionPopup(popup, rect) {
  const popupRect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const popupWidth = 380;
  const popupHeight = Math.min(400, popupRect.height || 200);
  const margin = 16;
  
  // Calculate available space in each direction
  const spaceTop = rect.top;
  const spaceBottom = viewportHeight - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = viewportWidth - rect.right;
  
  let top, left;
  let position = "bottom";
  
  // Determine best position
  if (spaceBottom >= popupHeight + margin || spaceBottom >= spaceTop) {
    // Position below
    top = rect.bottom + margin + window.scrollY;
    position = "bottom";
  } else {
    // Position above
    top = rect.top - popupHeight - margin + window.scrollY;
    position = "top";
  }
  
  // Center horizontally relative to selection, but keep within viewport
  const selectionCenter = rect.left + rect.width / 2;
  left = selectionCenter - popupWidth / 2 + window.scrollX;
  
  // Ensure popup stays within viewport bounds
  if (left < margin) {
    left = margin;
  } else if (left + popupWidth > viewportWidth - margin) {
    left = viewportWidth - popupWidth - margin;
  }
  
  // Apply position
  popup.style.position = "absolute";
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
  popup.style.width = `${popupWidth}px`;
  popup.dataset.position = position;
}

async function fetchAnalysis(text, popup) {
  const urls = ["http://127.0.0.1:8000/analyze", "http://localhost:8000/analyze"];
  let lastError;
  
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) throw new Error("Analysis failed");
      
      const data = await response.json();
      renderResults(popup, data);
      
      // Reposition after content loads
      const range = window.getSelection().getRangeAt(0);
      const rect = range.getBoundingClientRect();
      positionPopup(popup, rect);
      return;
      
    } catch (error) {
      console.error(`Debrief analysis error (${url}):`, error);
      lastError = error;
    }
  }
  renderError(popup, lastError?.message || "Failed to analyze");
}

function renderResults(popup, data) {
  const contentDiv = popup.querySelector(".debrief-popup-content");
  
  // Build tokens HTML
  const tokensHtml = data.tokens.map((t, i) => `
    <div class="debrief-token" style="animation-delay: ${i * 50}ms">
      ${t.translation ? `<span class="debrief-token-translation">${escapeHtml(t.translation)}</span>` : ""}
      <span class="debrief-token-word">${escapeHtml(t.text)}</span>
      <div class="debrief-token-info">
        <span class="debrief-tag debrief-pos">${escapeHtml(t.pos.toLowerCase())}</span>
        ${t.dep !== "punct" ? `<span class="debrief-tag debrief-dep">${escapeHtml(t.dep)}</span>` : ""}
        ${t.case?.length > 0 ? `<span class="debrief-tag debrief-case">${escapeHtml(t.case[0].toLowerCase())}</span>` : ""}
      </div>
    </div>
  `).join("");
  
  contentDiv.innerHTML = `
    <div class="debrief-german">${escapeHtml(data.original)}</div>
    <div class="debrief-english-label">English</div>
    <div class="debrief-translation">${escapeHtml(data.translation)}</div>
    <div class="debrief-section-label">Word Breakdown</div>
    <div class="debrief-tokens">
      ${tokensHtml}
    </div>
  `;
}

function renderError(popup, message) {
  const contentDiv = popup.querySelector(".debrief-popup-content");
  contentDiv.innerHTML = `
    <div class="debrief-error">
      <div class="debrief-error-icon">⚠️</div>
      <div class="debrief-error-message">Failed to analyze text</div>
      <div class="debrief-error-details">${escapeHtml(message)}</div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addPopupStyles() {
  const style = document.createElement("style");
  style.id = "debrief-popup-styles";
  style.textContent = `
    .debrief-popup {
      position: absolute;
      z-index: 2147483647;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1a1a1a;
      overflow: hidden;
      animation: debrief-popup-in 0.25s ease;
      max-height: 500px;
      overflow-y: auto;
      min-width: 320px;
    }
    
    @keyframes debrief-popup-in {
      from { opacity: 0; transform: scale(0.95) translateY(-5px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    .debrief-popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #2563eb;
      color: #fff;
    }
    
    .debrief-popup-title {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }
    
    .debrief-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #fff;
      font-size: 18px;
      font-weight: 300;
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.2s;
    }
    
    .debrief-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .debrief-popup-content {
      padding: 16px;
    }
    
    .debrief-german {
      font-size: 16px;
      font-weight: 500;
      color: #1e293b;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    
    .debrief-english-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    .debrief-translation {
      background: #f0fdf4;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      color: #166534;
      border: 1px solid #bbf7d0;
      margin-bottom: 16px;
    }
    
    .debrief-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 30px;
      color: #64748b;
      font-size: 13px;
    }
    
    .debrief-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: debrief-spin 0.8s linear infinite;
    }
    
    @keyframes debrief-spin {
      to { transform: rotate(360deg); }
    }
    
    .debrief-section-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .debrief-tokens {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .debrief-token {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      min-width: 65px;
      transition: all 0.2s;
    }
    
    .debrief-token:hover {
      border-color: #2563eb;
      background: #eff6ff;
    }
    
    .debrief-token-translation {
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
    }
    
    .debrief-token-word {
      font-weight: 600;
      font-size: 13px;
      color: #1e293b;
    }
    
    .debrief-token-info {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    
    .debrief-tag {
      font-size: 9px;
      padding: 2px 5px;
      border-radius: 4px;
    }
    
    .debrief-pos {
      background: #dbeafe;
      color: #1d4ed8;
    }
    
    .debrief-dep {
      background: #fef3c7;
      color: #b45309;
    }
    
    .debrief-case {
      background: #fce7f3;
      color: #be185d;
    }
    
    .debrief-token-in {
      animation: debrief-token-in 0.3s ease forwards;
      opacity: 0;
      transform: translateY(5px);
    }
    
    @keyframes debrief-token-in {
      to { opacity: 1; transform: translateY(0); }
    }
    
    .debrief-error {
      text-align: center;
      padding: 24px;
      color: #dc2626;
    }
    
    .debrief-error-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    
    .debrief-error-message {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .debrief-error-details {
      font-size: 12px;
      color: #64748b;
    }
    
    .debrief-popup::-webkit-scrollbar {
      width: 6px;
    }
    
    .debrief-popup::-webkit-scrollbar-track {
      background: #f1f5f9;
    }
    
    .debrief-popup::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
  `;
  document.head.appendChild(style);
}
