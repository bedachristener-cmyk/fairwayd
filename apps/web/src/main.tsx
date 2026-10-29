import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "leaflet/dist/leaflet.css";
import "./index.css";
import "./leafletIconFix";
import App from "./App";
import { recoverMissingFeedStyles } from "./styleRecovery";
import {
  applyShape,
  applyTheme,
  getInitialShape,
  getInitialTheme,
} from "./theme/theme";

if (document.readyState === "complete") {
  void recoverMissingFeedStyles();
} else {
  window.addEventListener("load", () => { void recoverMissingFeedStyles(); }, { once: true });
}

applyTheme(getInitialTheme());
applyShape(getInitialShape());

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    void registration?.update();

    window.setInterval(
      () => {
        void registration?.update();
      },
      60 * 60 * 1000,
    );
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
