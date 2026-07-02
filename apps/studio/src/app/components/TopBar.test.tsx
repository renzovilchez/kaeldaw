import { describe, it, expect, beforeEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

import { TopBar } from "./TopBar";
import { WindowManagerProvider } from "../../shared/components/WindowManager";
import { useTransportStore } from "@kaeldaw/project/useTransportStore";

let root: Root;
let container: HTMLDivElement;

function renderTopBar(props: Record<string, unknown> = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      createElement(
        WindowManagerProvider,
        null,
        createElement(TopBar, {
          projectName: "Test Project",
          onSetName: () => {},
          onSave: () => {},
          onLoad: () => {},
          onExport: () => {},
          onUndo: () => {},
          onRedo: () => {},
          ...props,
        }),
      ),
    );
  });
}

function cleanup() {
  if (root) {
    act(() => {
      root.unmount();
    });
    root = undefined!;
  }
  if (container && container.parentNode) {
    document.body.removeChild(container);
  }
  container = undefined!;
}

beforeEach(() => {
  cleanup();
  useTransportStore.setState({
    bpm: 120,
    timeSignature: { beats: 4, beatValue: 4 },
    state: "stopped",
    position: 0,
    ppqn: 480,
  });
});

describe("TopBar", () => {
  it("FEAT-061-01: renderiza logo KaelDAW", () => {
    renderTopBar();
    expect(container.textContent).toContain("KaelDAW");
    cleanup();
  });

  it("FEAT-061-02: renderiza project name input", () => {
    renderTopBar();
    const input = container.querySelector(
      "input[value='Test Project']",
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    cleanup();
  });

  it("FEAT-061-03: renderiza boton play/pause", () => {
    renderTopBar();
    expect(container.textContent).toContain("\u25B6");
    cleanup();
  });

  it("FEAT-061-04: renderiza boton stop", () => {
    renderTopBar();
    expect(container.textContent).toContain("\u23F9");
    cleanup();
  });

  it("FEAT-061-05: renderiza posicion BBB:TT", () => {
    renderTopBar();
    expect(container.textContent).toContain("001:01:000");
    cleanup();
  });

  it("FEAT-061-06: renderiza BPM input", () => {
    renderTopBar();
    const input = container.querySelector(
      "input[value='120']",
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    cleanup();
  });

  it("FEAT-061-07: renderiza botones Save, Load, Export", () => {
    renderTopBar();
    expect(container.textContent).toContain("Save");
    expect(container.textContent).toContain("Load");
    expect(container.textContent).toContain("Export");
    cleanup();
  });

  it("FEAT-061-08: renderiza botones Undo (↩), Redo (↪)", () => {
    renderTopBar();
    expect(container.textContent).toContain("\u21A9");
    expect(container.textContent).toContain("\u21AA");
    cleanup();
  });

  it("FEAT-061-09: renderiza 4 window toggle buttons", () => {
    renderTopBar();
    const buttons = container.querySelectorAll("button");
    const windowButtons = Array.from(buttons).filter(
      (b) =>
        b.textContent?.includes("Timeline") ||
        b.textContent?.includes("Piano") ||
        b.textContent?.includes("Mixer") ||
        b.textContent?.includes("Tracks"),
    );
    expect(windowButtons.length).toBe(4);
    cleanup();
  });
});
