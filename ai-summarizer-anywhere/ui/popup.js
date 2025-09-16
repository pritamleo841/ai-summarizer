// popup.js

window.onload = () => {
  chrome.storage.sync.get(["provider", "apiKey"], (items) => {
    if (items.provider) document.getElementById("provider").value = items.provider;
    if (items.apiKey) document.getElementById("apiKey").value = items.apiKey;
  });
};

document.getElementById("saveBtn").addEventListener("click", () => {
  const provider = document.getElementById("provider").value;
  const apiKey = document.getElementById("apiKey").value;
  chrome.storage.sync.set({ provider, apiKey }, () => {
    alert("✅ Settings saved!");
  });
});
