import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Blank screen detector: if the app hasn't rendered visible content within
// a few seconds, show a fallback with a reload button.
const BLANK_TIMEOUT_MS = 8000;
const blankTimer = window.setTimeout(() => {
  const root = document.getElementById("root");
  const isBlank = !root || root.childElementCount === 0 || root.innerText.trim() === "";
  if (isBlank) {
    if (root) {
      root.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:hsl(0 0% 100%);color:hsl(222 47% 11%);">
          <div style="max-width:420px;text-align:center;">
            <div style="width:56px;height:56px;border-radius:9999px;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;">⚠️</div>
            <h1 style="font-size:22px;font-weight:600;margin:0 0 8px;">Não foi possível carregar</h1>
            <p style="font-size:14px;color:#64748b;margin:0 0 20px;">O aplicativo demorou para responder. Tente recarregar.</p>
            <button onclick="window.location.reload()" style="background:#0f172a;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:500;">Recarregar app</button>
          </div>
        </div>`;
    }
  }
}, BLANK_TIMEOUT_MS);

// Cancel detector once React commits something
const observer = new MutationObserver(() => {
  const root = document.getElementById("root");
  if (root && root.childElementCount > 0) {
    window.clearTimeout(blankTimer);
    observer.disconnect();
  }
});
observer.observe(document.getElementById("root")!, { childList: true, subtree: true });

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
