/* background.js */
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
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {},
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
