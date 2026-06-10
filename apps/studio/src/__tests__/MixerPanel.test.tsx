import { describe, it, expect, beforeAll } from "vitest";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";

import { MixerPanel } from "../mixer/MixerPanel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

class MockMixerChannel extends HTMLElement {
  static observedAttributes = ["channel-name", "volume", "pan", "mute", "solo", "meter-level", "channel-number"];
  attributeChangedCallback() {}
}

beforeAll(() => {
  if (!customElements.get("daw-mixer-channel")) {
    customElements.define("daw-mixer-channel", MockMixerChannel);
  }
});

const defaultChannels = [
  { id: "t1", name: "Kick", volume: 0.8, pan: 0, mute: false, solo: false, meterLevel: 0 },
  { id: "t2", name: "Snare", volume: 0.6, pan: -0.3, mute: true, solo: false, meterLevel: 0.5 },
];

describe("MixerPanel", () => {
  it("FEAT-060-01: renderiza sin errores", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => {
      root.render(createElement(MixerPanel as any, {
        channels: defaultChannels,
        masterVolume: 1,
        masterMeterLevel: 0,
        onVolumeChange: () => {},
        onPanChange: () => {},
        onToggleMute: () => {},
        onToggleSolo: () => {},
        onSetMasterVolume: () => {},
        delayEnabled: false,
        reverbEnabled: false,
        onToggleDelay: () => {},
        onToggleReverb: () => {},
      }));
    });
    expect(container.innerHTML).not.toBe("");
    root.unmount();
  });

  it("FEAT-060-02: contiene texto Mixer", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => {
      root.render(createElement(MixerPanel as any, {
        channels: defaultChannels,
        masterVolume: 1,
        masterMeterLevel: 0,
        onVolumeChange: () => {},
        onPanChange: () => {},
        onToggleMute: () => {},
        onToggleSolo: () => {},
        onSetMasterVolume: () => {},
        delayEnabled: false,
        reverbEnabled: false,
        onToggleDelay: () => {},
        onToggleReverb: () => {},
      }));
    });
    expect(container.textContent).toContain("Mixer");
    root.unmount();
  });

  it("FEAT-060-03: botones D y R existen", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => {
      root.render(createElement(MixerPanel as any, {
        channels: defaultChannels,
        masterVolume: 1,
        masterMeterLevel: 0,
        onVolumeChange: () => {},
        onPanChange: () => {},
        onToggleMute: () => {},
        onToggleSolo: () => {},
        onSetMasterVolume: () => {},
        delayEnabled: false,
        reverbEnabled: false,
        onToggleDelay: () => {},
        onToggleReverb: () => {},
      }));
    });
    expect(container.textContent).toContain("D");
    expect(container.textContent).toContain("R");
    root.unmount();
  });

  it("FEAT-060-04: daw-mixer-channel presente", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => {
      root.render(createElement(MixerPanel as any, {
        channels: defaultChannels,
        masterVolume: 1,
        masterMeterLevel: 0,
        onVolumeChange: () => {},
        onPanChange: () => {},
        onToggleMute: () => {},
        onToggleSolo: () => {},
        onSetMasterVolume: () => {},
        delayEnabled: false,
        reverbEnabled: false,
        onToggleDelay: () => {},
        onToggleReverb: () => {},
      }));
    });
    const channels = container.querySelectorAll("daw-mixer-channel");
    expect(channels.length).toBeGreaterThan(0);
    root.unmount();
  });
});
