import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOscSine = vi.fn((_freq: number, phase: number) =>
  Math.sin(2 * Math.PI * phase)
);
const mockOscSaw = vi.fn((_freq: number, phase: number) => {
  const p = phase % 1.0;
  return 2.0 * p - 1.0;
});
const mockOscSquare = vi.fn((_freq: number, phase: number) =>
  phase % 1.0 < 0.5 ? 1.0 : -1.0
);

vi.mock("kaeldaw-dsp", () => ({
  osc_sine: mockOscSine,
  osc_saw: mockOscSaw,
  osc_square: mockOscSquare,
}));

describe("RustOscillator", () => {
  let RustOscillator: typeof import("../RustOscillator").RustOscillator;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../RustOscillator");
    RustOscillator = mod.RustOscillator;
  });

  it("crea oscilador sine con frecuencia 440 y sampleRate 48000", () => {
    const osc = new RustOscillator("sine", 440, 48000);
    expect(osc.type).toBe("sine");
    expect(osc.frequency).toBe(440);
    expect(osc.sampleRate).toBe(48000);
  });

  it("generate(100) retorna Float32Array de longitud 100", () => {
    const osc = new RustOscillator("sine", 440, 48000);
    const buf = osc.generate(100);
    expect(buf).toBeInstanceOf(Float32Array);
    expect(buf.length).toBe(100);
  });

  it("generate(0) retorna Float32Array vacio", () => {
    const osc = new RustOscillator("sine", 440, 48000);
    const buf = osc.generate(0);
    expect(buf.length).toBe(0);
  });

  it("100 samples sine 440 a 48000, todos en rango [-1, 1]", () => {
    const osc = new RustOscillator("sine", 440, 48000);
    const buf = osc.generate(100);
    for (const s of buf) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("setFrequency(880) actualiza frecuencia", () => {
    const osc = new RustOscillator("sine", 440, 48000);
    osc.setFrequency(880);
    expect(osc.frequency).toBe(880);
  });

  it("setFrequency clamp 20-8000", () => {
    const osc = new RustOscillator("sine", 440, 48000);
    osc.setFrequency(10);
    expect(osc.frequency).toBe(20);
    osc.setFrequency(10000);
    expect(osc.frequency).toBe(8000);
  });

  it("generate() llama a osc_sine con fase incremental para tipo sine", () => {
    const osc = new RustOscillator("sine", 100, 1000);
    osc.generate(1);
    expect(mockOscSine).toHaveBeenCalledWith(100, 0.1, 1000);
    osc.generate(1);
    expect(mockOscSine).toHaveBeenCalledWith(100, 0.2, 1000);
  });

  it("tipo saw llama a osc_saw", () => {
    const osc = new RustOscillator("saw", 440, 48000);
    const buf = osc.generate(10);
    expect(buf.length).toBe(10);
    expect(mockOscSaw).toHaveBeenCalled();
  });

  it("tipo square llama a osc_square", () => {
    const osc = new RustOscillator("square", 440, 48000);
    const buf = osc.generate(10);
    expect(buf.length).toBe(10);
    expect(mockOscSquare).toHaveBeenCalled();
  });
});
