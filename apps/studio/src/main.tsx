import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DawKnob } from "@kaeldaw/ui-controls/DawKnob";
import { DawFader } from "@kaeldaw/ui-controls/DawFader";
import App from "./App.tsx";
import "./index.css";

if (!customElements.get("daw-knob")) {
  customElements.define("daw-knob", DawKnob);
}
if (!customElements.get("daw-fader")) {
  customElements.define("daw-fader", DawFader);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
