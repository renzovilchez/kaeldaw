import { describe, it, expect, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("@kaeldaw/audio-engine/Transport", () => {
  const mockTransport = {
    state: "stopped",
    bpm: 120,
    timeSignature: { beats: 4, beatValue: 4 },
    position: 0,
    ppqn: 960,
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
  };
  return { Transport: mockTransport };
});

import { TransportPanel } from "../TransportPanel";
import { Transport } from "@kaeldaw/audio-engine/Transport";

function render(el: HTMLElement): Root {
  const root = createRoot(el);
  act(() => { root.render(<TransportPanel />); });
  return root;
}

describe("TransportPanel", () => {
  let container: HTMLElement;
  let root: Root;

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
  });

  it("renderiza boton play", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = render(container);
    const playBtn = container.querySelector('[data-testid="play-btn"]');
    expect(playBtn).not.toBeNull();
  });

  it("renderiza boton stop", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = render(container);
    const stopBtn = container.querySelector('[data-testid="stop-btn"]');
    expect(stopBtn).not.toBeNull();
  });

  it("renderiza display de posicion", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = render(container);
    const display = container.querySelector('[data-testid="position-display"]');
    expect(display).not.toBeNull();
  });

  it("click en play llama a Transport.play()", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = render(container);
    const playBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="play-btn"]',
    )!;
    act(() => { playBtn.click(); });
    expect(Transport.play).toHaveBeenCalledOnce();
  });

  it("click en stop llama a Transport.stop()", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = render(container);
    const stopBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="stop-btn"]',
    )!;
    act(() => { stopBtn.click(); });
    expect(Transport.stop).toHaveBeenCalledOnce();
  });

  it("display de posicion muestra formato BBB:BB:TTT", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = render(container);
    const display = container.querySelector('[data-testid="position-display"]');
    expect(display?.textContent).toMatch(/^\d{3}:\d{2}:\d{3}$/);
  });

  it("TransportPanel muestra BPM desde Transport.bpm", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = render(container);
    const bpmDisplay = container.querySelector('[data-testid="bpm-display"]');
    expect(bpmDisplay?.textContent).toContain("120");
  });
});
