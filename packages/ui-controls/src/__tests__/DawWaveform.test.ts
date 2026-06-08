import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { DawWaveform } from "../DawWaveform";

beforeAll(() => {
  if (!customElements.get("daw-waveform")) {
    customElements.define("daw-waveform", DawWaveform);
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

function createWaveform(): DawWaveform {
  const el = document.createElement("daw-waveform") as DawWaveform;
  document.body.appendChild(el);
  return el;
}

function makeSine(length: number, sampleRate = 44100): Float32Array {
  const arr = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
  }
  return arr;
}

describe("DawWaveform", () => {
  it("esta registrado como custom element", () => {
    const Ctor = customElements.get("daw-waveform");
    expect(Ctor).toBe(DawWaveform);
  });

  it("crea un canvas interno en connectedCallback", () => {
    const wf = createWaveform();
    const canvas = wf.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas!.tagName).toBe("CANVAS");
  });

  it("samples null o vacio no crashea draw()", () => {
    const wf = createWaveform();
    expect(() => wf.draw()).not.toThrow();
    wf.samples = null;
    expect(() => wf.draw()).not.toThrow();
  });

  it("set samples con array no crashea", () => {
    const wf = createWaveform();
    const arr = makeSine(1000);
    expect(() => { wf.samples = arr; }).not.toThrow();
    expect(wf.samples).toBe(arr);
  });

  it("playheadPosition se setea y se lee", () => {
    const wf = createWaveform();
    wf.playheadPosition = 0.5;
    expect(wf.playheadPosition).toBe(0.5);
  });

  it("playheadPosition se clamp entre 0 y 1", () => {
    const wf = createWaveform();
    wf.playheadPosition = -0.1;
    expect(wf.playheadPosition).toBe(0);
    wf.playheadPosition = 1.5;
    expect(wf.playheadPosition).toBe(1);
  });

  it("waveColor y backgroundColor cambian la salida", () => {
    const wf = createWaveform();
    wf.waveColor = "#ff0000";
    expect(wf.waveColor).toBe("#ff0000");
    wf.backgroundColor = "#000000";
    expect(wf.backgroundColor).toBe("#000000");
  });

  it("click emite waveform-click con position", () => {
    const wf = createWaveform();
    const canvas = wf.querySelector("canvas")!;
    const handler = vi.fn();
    wf.addEventListener("waveform-click", handler);
    canvas.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 50, clientY: 10 }));
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(detail).toHaveProperty("position");
    expect(detail.position).toBeGreaterThanOrEqual(0);
    expect(detail.position).toBeLessThanOrEqual(1);
  });

  it("clear() limpia samples", () => {
    const wf = createWaveform();
    wf.samples = makeSine(100);
    expect(wf.samples).not.toBeNull();
    wf.clear();
    expect(wf.samples).toBeNull();
  });

  it("zoom cambia el valor", () => {
    const wf = createWaveform();
    wf.zoom = 2;
    expect(wf.zoom).toBe(2);
  });

  it("zoom se clamp entre 0.1 y 100", () => {
    const wf = createWaveform();
    wf.zoom = 0;
    expect(wf.zoom).toBe(0.1);
    wf.zoom = 200;
    expect(wf.zoom).toBe(100);
  });

  it("height cambia la dimension del canvas", () => {
    const wf = createWaveform();
    wf.height = 128;
    expect(wf.height).toBe(128);
  });

  it("loadFromArray setea samples", () => {
    const wf = createWaveform();
    const arr = makeSine(200);
    wf.loadFromArray(arr);
    expect(wf.samples).toBe(arr);
    expect(wf.samples!.length).toBe(200);
  });

  it("disconnectedCallback remueve event listeners y no crashea", () => {
    const wf = createWaveform();
    wf.remove();
    expect(document.body.contains(wf)).toBe(false);
  });
});
