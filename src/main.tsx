import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

// ✅ PWA: Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // ✅ NO DEV (localhost): desregistra para não interferir no Supabase/Auth
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    // ✅ PRODUÇÃO: registra + força atualização automática
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("Service Worker registrado");

        // checa updates periodicamente (ajuda no Android/PWA)
        try {
          window.setInterval(() => {
            reg.update().catch(() => {});
          }, 60 * 1000); // 1 min
        } catch {
          // ignora
        }

        // quando houver update, recarrega automaticamente
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // quando instalou e já existe SW controlando, é update
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("Nova versão encontrada. Recarregando...");
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => console.error("Erro ao registrar SW:", err));
  });
}
