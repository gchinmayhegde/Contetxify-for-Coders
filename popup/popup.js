document.addEventListener('DOMContentLoaded', function() {
  const settingsBtn = document.getElementById('settingsBtn');
  const testBtn = document.getElementById('testBtn');

  // Settings button
  settingsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // Test button
  testBtn.addEventListener('click', function() {
    // Get the current active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      
      // Check if we can inject scripts into this tab
      if (currentTab.url.startsWith('chrome://') || 
          currentTab.url.startsWith('chrome-extension://') ||
          currentTab.url.startsWith('moz-extension://')) {
        showMessage('Cannot test on this page. Please try on a regular webpage with code!', 'error');
        return;
      }

      // Inject a test script that creates a sample code snippet
      chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        function: createTestCodeSnippet
      }, function() {
        showMessage('Test code snippet created! Try selecting it on the page.', 'success');
        // Close popup after a short delay
        setTimeout(() => window.close(), 2000);
      });
    });
  });

  // Check API key status
  chrome.storage.sync.get('apiKey', function(data) {
    if (!data.apiKey) {
      showMessage('⚠️ Please set your Gemini API key in settings first!!', 'warning');
      settingsBtn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)';
      settingsBtn.style.color = '#fff';
    }
  });
});

function createTestCodeSnippet() {
  // Remove any existing test elements
  const existingTest = document.getElementById('contextify-test-element');
  if (existingTest) {
    existingTest.remove();
  }

  // Create a test code snippet
  const testElement = document.createElement('div');
  testElement.id = 'contextify-test-element';
  testElement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1e1e1e;
    color: #ffffff;
    padding: 20px;
    border-radius: 12px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 14px;
    z-index: 999998;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    border: 1px solid #00ffae;
    max-width: 400px;
    line-height: 1.6;
  `;

  testElement.innerHTML = `
    <div style="color: #00ffae; font-weight: bold; margin-bottom: 16px; text-align: center;">
      🚀 Contextify Test Code Snippet
    </div>
    <div style="background: #2d2d2d; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <div style="color: #ff6b6b;">function</div> <div style="color: #ffe66d; display: inline;">displayDate</div><div style="color: #fff; display: inline;">() {</div><br>
      &nbsp;&nbsp;<div style="color: #ff6b6b; display: inline;">const</div> <div style="color: #95e1d3; display: inline;">now</div> <div style="color: #fff; display: inline;">= </div><div style="color: #ff6b6b; display: inline;">new</div> <div style="color: #ffe66d; display: inline;">Date</div><div style="color: #fff; display: inline;">();</div><br>
      &nbsp;&nbsp;<div style="color: #95e1d3; display: inline;">console</div><div style="color: #fff; display: inline;">.</div><div style="color: #ffe66d; display: inline;">log</div><div style="color: #fff; display: inline;">(</div><div style="color: #4ecdc4; display: inline;">"Current time:"</div><div style="color: #fff; display: inline;">, now);</div><br>
      <div style="color: #fff;">}</div>
    </div>
    <div style="text-align: center; color: #ccc; font-size: 12px; margin-bottom: 12px;">
      👆 Try selecting any part of this code!
    </div>
    <div style="text-align: center;">
      <button id="contextify-close-test" style="background: #ff6b6b; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px;">
        Close Test
      </button>
    </div>
  `;

  document.body.appendChild(testElement);

  // Add close functionality
  document.getElementById('contextify-close-test').addEventListener('click', function() {
    testElement.remove();
  });

  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (document.getElementById('contextify-test-element')) {
      testElement.remove();
    }
  }, 30000);
}

function showMessage(message, type) {
  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    left: 10px;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  switch(type) {
    case 'success':
      messageEl.style.background = '#d4edda';
      messageEl.style.color = '#155724';
      messageEl.style.border = '1px solid #c3e6cb';
      break;
    case 'error':
      messageEl.style.background = '#f8d7da';
      messageEl.style.color = '#721c24';
      messageEl.style.border = '1px solid #f5c6cb';
      break;
    case 'warning':
      messageEl.style.background = '#fff3cd';
      messageEl.style.color = '#856404';
      messageEl.style.border = '1px solid #ffeaa7';
      break;
  }

  messageEl.textContent = message;
  document.body.appendChild(messageEl);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.remove();
        }
      }, 300);
    }
  }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(-20px); opacity: 0; }
  }
`;
document.head.appendChild(style);

console.log("Contextify popup loaded successfully!");