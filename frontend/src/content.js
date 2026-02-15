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
  try {
    const response = await fetch("http://localhost:8000/analyze", {
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
    
  } catch (error) {
    console.error("Debrief analysis error:", error);
    renderError(popup, error.message);
  }
}

function renderResults(popup, data) {
  const contentDiv = popup.querySelector(".debrief-popup-content");
  
  // Build tokens HTML
  const tokensHtml = data.tokens.map((t, i) => `
    <div class="debrief-token" style="animation-delay: ${i * 50}ms">
      <div class="debrief-token-word">${escapeHtml(t.text)}</div>
      <div class="debrief-token-info">
        <span class="debrief-pos">${escapeHtml(t.pos)}</span>
        <span class="debrief-dep">${escapeHtml(t.dep)}</span>
        ${t.case?.length > 0 ? `<span class="debrief-case">${escapeHtml(t.case[0])}</span>` : ""}
      </div>
    </div>
  `).join("");
  
  contentDiv.innerHTML = `
    <div class="debrief-translation-section">
      <div class="debrief-section-label">Translation</div>
      <div class="debrief-translation">${escapeHtml(data.translation)}</div>
    </div>
    
    <div class="debrief-tokens-section">
      <div class="debrief-section-label">Word Analysis</div>
      <div class="debrief-tokens">
        ${tokensHtml}
      </div>
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
      background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%);
      border-radius: 16px;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.1),
        0 0 20px rgba(76, 175, 239, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #e8eaed;
      overflow: hidden;
      animation: debrief-popup-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      max-height: 500px;
      overflow-y: auto;
    }
    
    @keyframes debrief-popup-in {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .debrief-popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    
    .debrief-popup-title {
      font-size: 15px;
      font-weight: 600;
      color: #8ab4f8;
      letter-spacing: 0.3px;
    }
    
    .debrief-close-btn {
      background: none;
      border: none;
      color: #9aa0a6;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    
    .debrief-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #e8eaed;
    }
    
    .debrief-popup-content {
      padding: 18px;
    }
    
    .debrief-selected-text {
      font-size: 13px;
      color: #9aa0a6;
      margin-bottom: 16px;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border-left: 3px solid #8ab4f8;
      font-style: italic;
      line-height: 1.5;
    }
    
    .debrief-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      color: #9aa0a6;
      font-size: 14px;
    }
    
    .debrief-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(138, 180, 248, 0.2);
      border-top-color: #8ab4f8;
      border-radius: 50%;
      animation: debrief-spin 0.8s linear infinite;
    }
    
    @keyframes debrief-spin {
      to { transform: rotate(360deg); }
    }
    
    .debrief-section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #5f6368;
      margin-bottom: 10px;
    }
    
    .debrief-translation-section {
      margin-bottom: 20px;
    }
    
    .debrief-translation {
      background: linear-gradient(135deg, rgba(138, 180, 248, 0.1) 0%, rgba(138, 180, 248, 0.05) 100%);
      padding: 14px 16px;
      border-radius: 12px;
      font-size: 15px;
      line-height: 1.6;
      color: #e8eaed;
      border: 1px solid rgba(138, 180, 248, 0.15);
    }
    
    .debrief-tokens-section {
      margin-top: 4px;
    }
    
    .debrief-tokens {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .debrief-token {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 12px;
      min-width: 60px;
      animation: debrief-token-in 0.3s ease forwards;
      opacity: 0;
      transform: translateY(8px);
      transition: all 0.2s ease;
    }
    
    .debrief-token:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(138, 180, 248, 0.3);
      transform: translateY(-2px);
    }
    
    @keyframes debrief-token-in {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .debrief-token-word {
      font-weight: 600;
      font-size: 14px;
      color: #e8eaed;
      margin-bottom: 6px;
    }
    
    .debrief-token-info {
      display: flex;
      gap: 6px;
      font-size: 11px;
    }
    
    .debrief-pos {
      color: #81c995;
      font-weight: 500;
    }
    
    .debrief-dep {
      color: #9aa0a6;
    }
    
    .debrief-case {
      color: #8ab4f8;
      font-weight: 600;
      background: rgba(138, 180, 248, 0.15);
      padding: 1px 6px;
      border-radius: 4px;
    }
    
    .debrief-error {
      text-align: center;
      padding: 24px;
    }
    
    .debrief-error-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    
    .debrief-error-message {
      font-size: 14px;
      font-weight: 600;
      color: #e8eaed;
      margin-bottom: 6px;
    }
    
    .debrief-error-details {
      font-size: 12px;
      color: #9aa0a6;
    }
    
    /* Scrollbar styling */
    .debrief-popup::-webkit-scrollbar {
      width: 8px;
    }
    
    .debrief-popup::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02);
    }
    
    .debrief-popup::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }
    
    .debrief-popup::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  `;
  document.head.appendChild(style);
}
