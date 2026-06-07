import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { Timeline } from "../Timeline";

beforeAll(() => {
  if (!customElements.get("daw-timeline")) {
    customElements.define("daw-timeline", Timeline);
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

function createTimeline(): Timeline {
  const el = document.createElement("daw-timeline") as Timeline;
  document.body.appendChild(el);
  return el;
}

describe("Timeline", () => {
  it("esta registrado como custom element", () => {
    const Ctor = customElements.get("daw-timeline");
    expect(Ctor).toBe(Timeline);
  });

  it("crea un canvas interno en connectedCallback", () => {
    const tl = createTimeline();
    const canvas = tl.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas!.tagName).toBe("CANVAS");
  });

  it("addClip agrega un clip y getClips lo retorna", () => {
    const tl = createTimeline();
    const id = tl.addClip(0, 0, 480, "#ff0000", "Test");
    const clips = tl.getClips();
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({ id, trackIndex: 0, startTick: 0, durationTicks: 480, color: "#ff0000", name: "Test" });
  });

  it("removeClip elimina el clip y no aparece en getClips", () => {
    const tl = createTimeline();
    const id = tl.addClip(0, 0, 480);
    expect(tl.getClips()).toHaveLength(1);
    tl.removeClip(id);
    expect(tl.getClips()).toHaveLength(0);
  });

  it("clearClips elimina todos los clips", () => {
    const tl = createTimeline();
    tl.addClip(0, 0, 480);
    tl.addClip(1, 480, 480);
    tl.clearClips();
    expect(tl.getClips()).toHaveLength(0);
  });

  it("playheadTick se setea y se lee", () => {
    const tl = createTimeline();
    tl.playheadTick = 240;
    expect(tl.playheadTick).toBe(240);
  });

  it("playheadTick no acepta negativos", () => {
    const tl = createTimeline();
    tl.playheadTick = -10;
    expect(tl.playheadTick).toBe(0);
  });

  it("pixelsPerBeat se clamp entre 10 y 200", () => {
    const tl = createTimeline();
    tl.pixelsPerBeat = 5;
    expect(tl.pixelsPerBeat).toBe(10);
    tl.pixelsPerBeat = 500;
    expect(tl.pixelsPerBeat).toBe(200);
  });

  it("zoomIn aumenta pixelsPerBeat", () => {
    const tl = createTimeline();
    const before = tl.pixelsPerBeat;
    tl.zoomIn();
    expect(tl.pixelsPerBeat).toBeGreaterThan(before);
  });

  it("zoomOut disminuye pixelsPerBeat", () => {
    const tl = createTimeline();
    tl.zoomIn();
    const before = tl.pixelsPerBeat;
    tl.zoomOut();
    expect(tl.pixelsPerBeat).toBeLessThan(before);
  });

  it("numTracks se setea y clamp a minimo 1", () => {
    const tl = createTimeline();
    tl.numTracks = 16;
    expect(tl.numTracks).toBe(16);
    tl.numTracks = 0;
    expect(tl.numTracks).toBe(1);
  });

  it("totalDurationTicks se setea y clamp a minimo 1", () => {
    const tl = createTimeline();
    tl.totalDurationTicks = 7680;
    expect(tl.totalDurationTicks).toBe(7680);
    tl.totalDurationTicks = 0;
    expect(tl.totalDurationTicks).toBe(1);
  });

  it("selectedClipId se setea y se lee", () => {
    const tl = createTimeline();
    const id = tl.addClip(0, 0, 480);
    tl.selectedClipId = id;
    expect(tl.selectedClipId).toBe(id);
    tl.selectedClipId = null;
    expect(tl.selectedClipId).toBeNull();
  });

  it("removeClip limpia selectedClipId si el clip seleccionado es eliminado", () => {
    const tl = createTimeline();
    const id = tl.addClip(0, 0, 480);
    tl.selectedClipId = id;
    tl.removeClip(id);
    expect(tl.selectedClipId).toBeNull();
  });

  it("dispara timeline-click en canvas vacio", () => {
    const tl = createTimeline();
    const canvas = tl.querySelector("canvas")!;
    const handler = vi.fn();
    tl.addEventListener("timeline-click", handler);
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100, clientY: 100 }));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toHaveProperty("tick");
    expect(detail).toHaveProperty("trackIndex");
  });

  it("mousedown sobre clip lo selecciona", () => {
    const tl = createTimeline();
    tl.numTracks = 1;
    const id = tl.addClip(0, 0, 480, "#ff0000", "Clip1");
    const canvas = tl.querySelector("canvas")!;
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 50, clientY: HEADER_OFFSET + 24 }));
    expect(tl.selectedClipId).toBe(id);
  });

  it("dispara clip-move al arrastrar y soltar clip", () => {
    const tl = createTimeline();
    tl.numTracks = 1;
    tl.addClip(0, 0, 480, "#ff0000", "Clip1");
    const canvas = tl.querySelector("canvas")!;
    const handler = vi.fn();
    tl.addEventListener("clip-move", handler);
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 50, clientY: HEADER_OFFSET + 24 }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 150, clientY: HEADER_OFFSET + 24 }));
    document.dispatchEvent(new MouseEvent("mouseup"));
    expect(handler).toHaveBeenCalledTimes(1);
    const clip = tl.getClips()[0];
    expect(clip.startTick).toBeGreaterThan(0);
  });

  it("dispara clip-resize al arrastrar borde derecho", () => {
    const tl = createTimeline();
    tl.numTracks = 1;
    tl.addClip(0, 0, 480, "#ff0000", "Clip1");
    const canvas = tl.querySelector("canvas")!;
    const handler = vi.fn();
    tl.addEventListener("clip-resize", handler);
    const resizeX = 480 * tl.pixelsPerTick;
    canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: resizeX, clientY: HEADER_OFFSET + 24 }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: resizeX + 100, clientY: HEADER_OFFSET + 24 }));
    document.dispatchEvent(new MouseEvent("mouseup"));
    expect(handler).toHaveBeenCalledTimes(1);
    const clip = tl.getClips()[0];
    expect(clip.durationTicks).toBeGreaterThan(480);
  });

  it("scrollX y scrollY se actualizan con wheel", () => {
    const tl = createTimeline();
    tl.scrollX = 0;
    tl.scrollY = 0;
    tl.dispatchEvent(new WheelEvent("wheel", { deltaX: 100, deltaY: 50 }));
    expect(tl.scrollX).toBe(100);
    expect(tl.scrollY).toBe(50);
  });

  it("ctrl+wheel cambia zoom", () => {
    const tl = createTimeline();
    const before = tl.pixelsPerBeat;
    tl.dispatchEvent(new WheelEvent("wheel", { deltaY: -50, ctrlKey: true }));
    expect(tl.pixelsPerBeat).toBeGreaterThan(before);
  });

  it("keyboard Delete remueve clip seleccionado", () => {
    const tl = createTimeline();
    const id = tl.addClip(0, 0, 480);
    tl.selectedClipId = id;
    tl.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    expect(tl.getClips()).toHaveLength(0);
  });

  it("disconnectedCallback remueve event listeners y no crashea", () => {
    const tl = createTimeline();
    tl.remove();
    expect(document.body.contains(tl)).toBe(false);
  });
});

const HEADER_OFFSET = 24;
