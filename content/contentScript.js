// Detect programming language (basic)
function detectLanguage(text) {
  if (/def\s+\w+\(/.test(text)) return "Python";
  if (/function\s+\w+\(/.test(text)) return "JavaScript";
  if (/#include\s+<.*>/.test(text)) return "C++";
  if (/public\s+class/.test(text)) return "Java";
  return "Unknown";
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
          { text: `Explain what "${keyword}" does in ${language}. Provide short usage and example.` }
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

// Listen for double-click and show tooltip
document.addEventListener("dblclick", async (e) => {
  const selectedText = window.getSelection().toString().trim();
  if (!selectedText) return;

  removeTooltip();

  const tooltip = document.createElement("div");
  tooltip.id = "contextify-tooltip";
  tooltip.innerHTML = `
    <div class="tooltip-header">
      <strong id="contextify-title">${selectedText}</strong>
      <button id="contextify-close-btn">×</button>
    </div>
    <div class="tooltip-content"><p>Loading explanation...</p></div>
    <button id="contextify-copy-btn">Copy</button>
  `;
  tooltip.style.top = `${e.pageY + 10}px`;
  tooltip.style.left = `${e.pageX + 10}px`;
  document.body.appendChild(tooltip);

  // Close button
  document.querySelector("#contextify-close-btn").onclick = removeTooltip;

  // Copy button
  document.querySelector("#contextify-copy-btn").onclick = () => {
    navigator.clipboard.writeText(selectedText);
  };

  const language = detectLanguage(document.body.innerText);
  const explanation = await getAIExplanation(selectedText, language);

  // Convert markdown to HTML
  const htmlContent = convertMarkdownToHTML(explanation);
  tooltip.querySelector(".tooltip-content").innerHTML = htmlContent;
});

function removeTooltip() {
  const oldTooltip = document.querySelector("#contextify-tooltip");
  if (oldTooltip) oldTooltip.remove();
}

// Basic Markdown parser
function convertMarkdownToHTML(md) {
  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold
    .replace(/`([^`]+)`/g, "<code>$1</code>")         // inline code
    .replace(/```(\w+)?([\s\S]*?)```/g, "<pre><code>$2</code></pre>"); // code block
}
