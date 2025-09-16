// setup.js — generates the AI Summarizer Anywhere project with multi-provider support
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

const rootDir = path.join(__dirname, "ai-summarizer-anywhere");
const uiDir = path.join(rootDir, "ui");
const iconsDir = path.join(rootDir, "icons");

// ensure dirs
[ rootDir, uiDir, iconsDir ].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// manifest.json
const manifest = {
  manifest_version: 3,
  name: "AI Summarizer Anywhere",
  description: "Summarize selected text with AI (OpenAI, Hugging Face, or Ollama).",
  version: "1.1",
  permissions: ["storage", "contextMenus", "scripting", "activeTab"],
  background: { service_worker: "background.js" },
  action: {
    default_popup: "ui/popup.html",
    default_icon: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["contentScript.js"]
    }
  ]
};
fs.writeFileSync(path.join(rootDir, "manifest.json"), JSON.stringify(manifest, null, 2));

// background.js (multi-provider)
const background = `/* background.js */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize",
    title: "Summarize with AI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarize" && info.selectionText) {
    const text = info.selectionText.trim();
    if (!text) return;

    const { provider, apiKey, summaryMode } = await chrome.storage.sync.get(["provider", "apiKey", "summaryMode"]);
    const mode = summaryMode || "short";

    try {
      const summary = await callProvider(provider || "openai", apiKey, text, mode);

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (summary) => window.postMessage({ type: "AI_SUMMARY_RESULT", summary }, "*"),
        args: [summary]
      });
    } catch (err) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msg) => alert(msg),
        args: [err.message || "An error occurred."]
      });
    }
  }
});

async function callProvider(provider, apiKey, inputText, mode) {
  let instruction = "Summarize this text concisely.";
  if (mode === "short") instruction = "Summarize in 1-2 sentences.";
  if (mode === "medium") instruction = "Summarize in a short paragraph.";
  if (mode === "long") instruction = "Summarize in detail with bullet points.";

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${apiKey}\` },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: inputText }
        ],
        max_tokens: 200
      })
    });
    if (res.status === 429) throw new Error("⚠️ OpenAI rate limit reached. Try again later.");
    if (!res.ok) throw new Error("OpenAI error: " + res.status);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "No summary.";
  }

  if (provider === "huggingface") {
    const res = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
      method: "POST",
      headers: apiKey ? { "Authorization": \`Bearer \${apiKey}\` } : {},
      body: JSON.stringify({ inputs: inputText })
    });
    if (!res.ok) throw new Error("Hugging Face error: " + res.status);
    const data = await res.json();
    return data[0]?.summary_text || "No summary.";
  }

  if (provider === "ollama") {
    const res = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: inputText }
        ]
      })
    });
    if (!res.ok) throw new Error("Ollama error: " + res.status);
    const data = await res.json();
    return data.message?.content || "No summary.";
  }

  throw new Error("Unknown provider: " + provider);
}
`;
fs.writeFileSync(path.join(rootDir, "background.js"), background);

// contentScript.js
const contentScript = `/* contentScript.js */
(function() {
  const overlayId = "ai-summary-overlay";
  window.addEventListener("message", (event) => {
    if (event.data.type === "AI_SUMMARY_RESULT") {
      let overlay = document.getElementById(overlayId);
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = overlayId;
        overlay.style.position = "fixed";
        overlay.style.bottom = "20px";
        overlay.style.right = "20px";
        overlay.style.width = "300px";
        overlay.style.maxHeight = "300px";
        overlay.style.overflowY = "auto";
        overlay.style.background = "white";
        overlay.style.border = "1px solid #ccc";
        overlay.style.borderRadius = "8px";
        overlay.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        overlay.style.zIndex = 999999;
        overlay.style.padding = "10px";
        overlay.style.fontSize = "14px";
        overlay.style.lineHeight = "1.4";
        document.body.appendChild(overlay);
      }
      overlay.textContent = event.data.summary;
    }
  });
})();
`;
fs.writeFileSync(path.join(rootDir, "contentScript.js"), contentScript);

// popup.html
const popupHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>AI Summarizer Settings</title>
  <link rel="stylesheet" href="styles.css"/>
</head>
<body>
  <div class="container">
    <h2>AI Summarizer</h2>
    <label>Provider</label>
    <select id="provider">
      <option value="openai">OpenAI</option>
      <option value="huggingface">Hugging Face</option>
      <option value="ollama">Ollama (local)</option>
    </select>
    <label>API Key</label>
    <input id="apiKey" placeholder="Enter API key if required" type="password"/>
    <label>Summary length</label>
    <select id="summaryMode">
      <option value="short">Short</option>
      <option value="medium">Medium</option>
      <option value="long">Long</option>
    </select>
    <div class="actions">
      <button id="save">Save</button>
      <button id="clear">Clear Key</button>
    </div>
    <p class="help">Highlight text, right-click and choose <b>Summarize with AI</b>.</p>
  </div>
  <script src="popup.js"></script>
</body>
</html>`;
fs.writeFileSync(path.join(uiDir, "popup.html"), popupHtml);

// popup.js
const popupJs = `document.addEventListener("DOMContentLoaded", async () => {
  const providerSelect = document.getElementById("provider");
  const apiKeyInput = document.getElementById("apiKey");
  const summaryModeSelect = document.getElementById("summaryMode");
  const saveBtn = document.getElementById("save");
  const clearBtn = document.getElementById("clear");

  const stored = await chrome.storage.sync.get(["provider", "apiKey", "summaryMode"]);
  if (stored.provider) providerSelect.value = stored.provider;
  if (stored.apiKey) apiKeyInput.value = stored.apiKey;
  if (stored.summaryMode) summaryModeSelect.value = stored.summaryMode;

  saveBtn.addEventListener("click", async () => {
    await chrome.storage.sync.set({
      provider: providerSelect.value,
      apiKey: apiKeyInput.value,
      summaryMode: summaryModeSelect.value
    });
    saveBtn.textContent = "Saved!";
    setTimeout(() => saveBtn.textContent = "Save", 1200);
  });

  clearBtn.addEventListener("click", async () => {
    await chrome.storage.sync.remove(["apiKey"]);
    apiKeyInput.value = "";
  });
});`;
fs.writeFileSync(path.join(uiDir, "popup.js"), popupJs);

// styles.css
const styles = `body { font-family: sans-serif; padding: 10px; }
.container { width: 240px; }
label { display: block; margin-top: 8px; font-size: 13px; }
input, select { width: 100%; padding: 5px; margin-top: 4px; }
.actions { margin-top: 12px; display: flex; justify-content: space-between; }
button { padding: 5px 10px; }`;
fs.writeFileSync(path.join(uiDir, "styles.css"), styles);

// README.md
const readme = `# AI Summarizer Anywhere

Chrome extension to summarize highlighted text using multiple AI providers:
- OpenAI (GPT-3.5 / GPT-4, requires API key)
- Hugging Face (free summarization models, API key optional)
- Ollama (local models like LLaMA, Mistral — no key needed)

## Setup
1. Run \`npm install canvas\`
2. Run \`node setup.js\` (this generates the extension files)
3. Open Chrome → \`chrome://extensions/\`
4. Enable Developer Mode → Load Unpacked → select \`ai-summarizer-anywhere/\`
5. In the popup, choose a provider and enter your API key if required.

Then highlight text → right-click → Summarize with AI.`;
fs.writeFileSync(path.join(rootDir, "README.md"), readme);

// generate icons
[16,48,128].forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#4A90E2";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "white";
  ctx.font = `bold ${Math.max(10, Math.floor(size * 0.5))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AI", size/2, size/2);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
});

console.log("✅ AI Summarizer Anywhere (multi-provider) extension generated!");
