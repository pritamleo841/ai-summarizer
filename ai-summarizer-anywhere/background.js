// background.js

async function summarizeText(inputText, provider, apiKey) {
  const instruction = "Summarize the following text in 3-4 sentences:";

  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: instruction },
            { role: "user", content: inputText }
          ],
          max_tokens: 200
        })
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || "⚠️ No summary returned.";
    }

    if (provider === "huggingface") {
      const res = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: inputText })
      });
      const data = await res.json();
      return data[0]?.summary_text || "⚠️ No summary returned.";
    }

    if (provider === "ollama") {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama2", prompt: instruction + "\n" + inputText })
      });
      const data = await res.json();
      return data.response?.trim() || "⚠️ No summary returned.";
    }

    return "⚠️ Unknown provider selected.";
  } catch (err) {
    return "❌ Error: " + err.message;
  }
}

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize",
    title: "Summarize with AI",
    contexts: ["selection"]
  });
});

// When user clicks "Summarize with AI"
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize") {
    chrome.storage.sync.get(["provider", "apiKey"], async (items) => {
      const provider = items.provider || "openai";
      const apiKey = items.apiKey || "";

      const summary = await summarizeText(info.selectionText, provider, apiKey);

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text) => {
          const div = document.createElement("div");
          div.innerText = text;
          div.style.position = "fixed";
          div.style.bottom = "20px";
          div.style.right = "20px";
          div.style.background = "#4A90E2";
          div.style.color = "white";
          div.style.padding = "10px";
          div.style.borderRadius = "8px";
          div.style.zIndex = "9999";
          div.style.maxWidth = "300px";
          div.style.fontFamily = "sans-serif";
          document.body.appendChild(div);
          setTimeout(() => div.remove(), 10000);
        },
        args: [summary]
      });
    });
  }
});
