// Detect programming language (enhanced)
function detectLanguage(text) {
  // Check for specific patterns
  if (/def\s+\w+\(/.test(text) || /import\s+\w+/.test(text) || /from\s+\w+\s+import/.test(text)) return "python";
  if (/function\s+\w+\(/.test(text) || /const\s+\w+\s*=/.test(text) || /let\s+\w+\s*=/.test(text) || /var\s+\w+\s*=/.test(text)) return "javascript";
  if (/#include\s+<.*>/.test(text) || /using\s+namespace/.test(text)) return "cpp";
  if (/public\s+class/.test(text) || /public\s+static\s+void\s+main/.test(text)) return "java";
  if (/<!DOCTYPE\s+html>/.test(text) || /<html/.test(text) || /<div/.test(text)) return "html";
  if (/\{[\s\S]*\}/.test(text) && /[a-zA-Z-]+\s*:/.test(text)) return "css";
  if (/SELECT\s+.*FROM/.test(text.toUpperCase()) || /INSERT\s+INTO/.test(text.toUpperCase())) return "sql";
  if (/#[a-zA-Z_]\w*/.test(text) || /struct\s+\w+/.test(text)) return "c";
  
  return "javascript"; // Default fallback
}

// Fetch explanation from Gemini API
async function getAIExplanation(keyword, language) {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) return "❌ API key missing! Go to Options to set it.";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: `Explain what "${keyword}" does in ${language}. Provide a concise explanation with usage example and code snippet. Format your response with proper headings and code blocks.` }
        ]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No explanation found.";
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "Error fetching explanation.";
  }
}

// Track selection state
let selectionTimeout;
let currentTooltip = null;

// Listen for text selection
document.addEventListener("mouseup", async (e) => {
  // Clear any existing timeout
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }

  // Wait a bit to ensure selection is complete
  selectionTimeout = setTimeout(async () => {
    const selectedText = window.getSelection().toString().trim();
    
    // Only proceed if we have selected text and it looks like code
    if (!selectedText || selectedText.length < 2) {
      removeTooltip();
      return;
    }

    // Check if the selected text contains code-like patterns
    const codePatterns = [
      /[\(\)\{\}\[\]]/,  // Brackets/parentheses
      /[a-zA-Z_]\w*\s*\(/,  // Function calls
      /[a-zA-Z_]\w*\s*\.\s*[a-zA-Z_]\w*/,  // Method calls
      /[a-zA-Z_]\w*\s*=\s*/,  // Assignments
      /[a-zA-Z_]\w*\s*:\s*/,  // Object properties
      /[<>]/,  // HTML tags or comparison operators
      /[;{}]/,  // Statement terminators
      /def\s+|function\s+|class\s+|import\s+|from\s+|const\s+|let\s+|var\s+/,  // Keywords
      /[a-zA-Z_]\w*\s*\[/,  // Array access
      /\/\*[\s\S]*\*\/|\/\/.*$/m  // Comments
    ];

    const looksLikeCode = codePatterns.some(pattern => pattern.test(selectedText));
    
    if (!looksLikeCode) {
      removeTooltip();
      return;
    }

    removeTooltip();

    // Get selection position
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const tooltip = document.createElement("div");
    tooltip.id = "contextify-tooltip";
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <div class="tooltip-title">
          <span class="code-snippet">${escapeHtml(selectedText.substring(0, 50))}</span>
          ${selectedText.length > 50 ? '<span class="truncated">...</span>' : ''}
        </div>
        <button id="contextify-close-btn" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="tooltip-content">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Analyzing code...</p>
        </div>
      </div>
      <div class="tooltip-actions">
        <button id="contextify-copy-btn" title="Copy selected code">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </button>
      </div>
    `;

    // Position tooltip
    const x = rect.left + window.pageXOffset;
    const y = rect.bottom + window.pageYOffset + 10;
    
    tooltip.style.left = `${Math.min(x, window.innerWidth - 400)}px`;
    tooltip.style.top = `${y}px`;
    
    document.body.appendChild(tooltip);
    currentTooltip = tooltip;

    // Add event listeners
    document.querySelector("#contextify-close-btn").onclick = removeTooltip;
    document.querySelector("#contextify-copy-btn").onclick = () => {
      navigator.clipboard.writeText(selectedText);
      const btn = document.querySelector("#contextify-copy-btn");
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
        Copied!
      `;
      setTimeout(() => {
        if (btn) btn.innerHTML = originalHTML;
      }, 2000);
    };

    // Get explanation
    const language = detectLanguage(selectedText);
    const explanation = await getAIExplanation(selectedText, language);

    // Update tooltip content if it still exists
    if (currentTooltip && document.contains(currentTooltip)) {
      const htmlContent = convertMarkdownToHTML(explanation, language);
      currentTooltip.querySelector(".tooltip-content").innerHTML = htmlContent;
    }
  }, 300); // 300ms delay to ensure selection is complete
});

// Close tooltip when clicking outside
document.addEventListener("click", (e) => {
  if (currentTooltip && !currentTooltip.contains(e.target)) {
    removeTooltip();
  }
});

// Remove tooltip when selection changes
document.addEventListener("selectionchange", () => {
  // Only remove if no text is selected
  if (window.getSelection().toString().trim() === "") {
    setTimeout(() => {
      if (window.getSelection().toString().trim() === "") {
        removeTooltip();
      }
    }, 100);
  }
});

function removeTooltip() {
  const oldTooltip = document.querySelector("#contextify-tooltip");
  if (oldTooltip) {
    oldTooltip.style.animation = "fadeOut 0.2s ease-in-out";
    setTimeout(() => {
      if (oldTooltip.parentNode) {
        oldTooltip.remove();
      }
    }, 200);
  }
  currentTooltip = null;
}

// Enhanced Markdown parser with syntax highlighting
function convertMarkdownToHTML(md, language = "javascript") {
  let html = md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold
    .replace(/\*(.*?)\*/g, "<em>$1</em>") // italic
    .replace(/`([^`]+)`/g, "<code class='inline-code'>$1</code>") // inline code
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
      const detectedLang = lang || language;
      return `<pre><code class="language-${detectedLang}">${escapeHtml(code.trim())}</code></pre>`;
    })
    .replace(/^### (.*$)/gm, "<h3>$1</h3>") // h3
    .replace(/^## (.*$)/gm, "<h2>$1</h2>") // h2
    .replace(/^# (.*$)/gm, "<h1>$1</h1>") // h1
    .replace(/\n\n/g, "</p><p>") // paragraphs
    .replace(/\n/g, "<br>"); // line breaks

  // Wrap in paragraphs if not already wrapped
  if (!html.includes("<p>") && !html.includes("<h") && !html.includes("<pre>")) {
    html = `<p>${html}</p>`;
  }

  return html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load Highlight.js for syntax highlighting
function loadHighlightJS() {
  if (window.hljs) return;
  
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
  document.head.appendChild(link);

  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
  script.onload = () => {
    // Load common languages
    const languages = ['javascript', 'python', 'java', 'cpp', 'html', 'css', 'sql', 'c'];
    languages.forEach(lang => {
      const langScript = document.createElement("script");
      langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/${lang}.min.js`;
      document.head.appendChild(langScript);
    });
    
    // Apply highlighting to existing code blocks
    setTimeout(() => {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
      });
    }, 100);
  };
  document.head.appendChild(script);
}

// Load Highlight.js when script loads
loadHighlightJS();

// Apply syntax highlighting to dynamically added code blocks
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const codeBlocks = node.querySelectorAll ? node.querySelectorAll('pre code') : [];
          codeBlocks.forEach((block) => {
            if (window.hljs && !block.classList.contains('hljs')) {
              hljs.highlightBlock(block);
            }
          });
        }
      });
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});