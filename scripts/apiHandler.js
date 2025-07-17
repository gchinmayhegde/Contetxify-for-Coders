export async function getAIExplanation(keyword, language) {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) return "❌ API key missing! Go to Options to set it.";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: `Explain what "${keyword}" does in ${language}. Give a short usage and code example.` }
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
