document.addEventListener("DOMContentLoaded", async () => {
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
});