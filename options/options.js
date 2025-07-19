document.getElementById("saveBtn").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value.trim();
  if (apiKey) {
    chrome.storage.sync.set({ apiKey }, () => {
      document.getElementById("status").textContent = "✅ API key saved!!";
      setTimeout(() => document.getElementById("status").textContent = "", 2000);
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get("apiKey", (data) => {
    if (data.apiKey) {
      document.getElementById("apiKey").value = data.apiKey;
    }
  });
});
