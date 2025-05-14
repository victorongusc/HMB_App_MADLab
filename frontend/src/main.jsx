import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// global brand theme (fonts, palette, utilities)
import "./assets/usc-theme.css";

// component‑specific styles
import "./index.css"; // now just minimal resets

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);