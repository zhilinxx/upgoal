// client/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

/* Boot theme ASAP to avoid flash and ensure all pages get it */
(() => {
  try {
    const saved = localStorage.getItem("theme");
    // if saved is exactly "dark", use dark; otherwise default to light
    const t = saved === "dark" ? "dark" : "light";

    // Always persist the decision so the key exists even on first load
    if (saved !== t) {
      localStorage.setItem("theme", t);
    }

    document.documentElement.setAttribute("data-theme", t);
  } catch {
    // localStorage might be blocked; default to light
    document.documentElement.setAttribute("data-theme", "light");
  }
})();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
