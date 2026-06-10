import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DawKnob } from "@kaeldaw/ui-controls/DawKnob";
import { DawFader } from "@kaeldaw/ui-controls/DawFader";
import { DawWaveform } from "@kaeldaw/ui-controls/DawWaveform";
import { Timeline } from "@kaeldaw/sequencer/Timeline";
import { PianoRoll } from "@kaeldaw/sequencer/PianoRoll";
import { MixerChannel } from "@kaeldaw/mixer/MixerChannel";
import App from "./App";
import "./index.css";

const WC = [
  ["daw-knob", DawKnob],
  ["daw-fader", DawFader],
  ["daw-waveform", DawWaveform],
  ["daw-timeline", Timeline],
  ["daw-piano-roll", PianoRoll],
  ["daw-mixer-channel", MixerChannel],
] as const;

for (const [name, ctor] of WC) {
  if (!customElements.get(name)) {
    customElements.define(name, ctor);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
