import { describe, it, expect, beforeAll } from "vitest";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";

import { MixerPanel } from "./MixerPanel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

class MockMixerChannel extends HTMLElement {
  static observedAttributes = [
    "channel-name",
    "volume",
    "pan",
    "mute",
    "solo",
    "meter-level",
    "channel-number",
  ];
  attributeChangedCallback() {}
}

beforeAll(() => {
  if (!customElements.get("daw-mixer-channel")) {
    customElements.define("daw-mixer-channel", MockMixerChannel);
  }
});

const defaultChannels = [
  {
    id: "t1",
    name: "Kick",
    volume: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    meterLevel: 0,
    insertFx: [],
    sends: [],
    insertDelay: false,
    insertReverb: false,
    sendLevel: 0,
  },
  {
    id: "t2",
    name: "Snare",
    volume: 0.6,
    pan: -0.3,
    mute: true,
    solo: false,
    meterLevel: 0.5,
    insertFx: [],
    sends: [],
    insertDelay: false,
    insertReverb: false,
    sendLevel: 0,
  },
];

const defaultProps = {
  channels: defaultChannels,
  buses: [],
  masterVolume: 1,
  masterMeterLevel: 0,
  onVolumeChange: () => {},
  onPanChange: () => {},
  onToggleMute: () => {},
  onToggleSolo: () => {},
  onSetMasterVolume: () => {},
  onInsertDelay: () => {},
  onInsertReverb: () => {},
  onSendLevel: () => {},
  onBusVolume: () => {},
  onToggleBusMute: () => {},
};

function renderMixerPanel() {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(createElement(MixerPanel, defaultProps));
  });
  return { container, root };
}

describe("MixerPanel", () => {
  it("FEAT-060-01: renderiza sin errores", () => {
    const { container, root } = renderMixerPanel();
    expect(container.innerHTML).not.toBe("");
    root.unmount();
  });

  it("FEAT-060-02: contiene texto Mixer", () => {
    const { container, root } = renderMixerPanel();
    expect(container.textContent).toContain("Mixer");
    root.unmount();
  });

  it("FEAT-060-03: renderiza 2 canales + master = 3 daw-mixer-channel", () => {
    const { container, root } = renderMixerPanel();
    const channels = container.querySelectorAll("daw-mixer-channel");
    expect(channels.length).toBe(3);
    root.unmount();
  });

  it("FEAT-060-04: daw-mixer-channel presente", () => {
    const { container, root } = renderMixerPanel();
    const channels = container.querySelectorAll("daw-mixer-channel");
    expect(channels.length).toBeGreaterThan(0);
    root.unmount();
  });
});
