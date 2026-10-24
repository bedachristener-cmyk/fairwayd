import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import "./leafletIconFix";
import App from "./App";
import {
  applyShape,
  applyTheme,
  getInitialShape,
  getInitialTheme,
} from "./theme/theme";

applyTheme(getInitialTheme());
applyShape(getInitialShape());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
