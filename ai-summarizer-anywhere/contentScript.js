/* contentScript.js */
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
