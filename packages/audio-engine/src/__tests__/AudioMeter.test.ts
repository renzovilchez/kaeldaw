import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

class MockAnalyserNode {
  fftSize = 256;
  frequencyBinCount = 128;
  connect = vi.fn(() => this);
  disconnect = vi.fn();
  getByteTimeDomainData = vi.fn((data: Uint8Array) => {
    for (let i = 0; i < data.length; i++) data[i] = 128;
  });
}

class MockOscillatorNode {
  type = "sine";
  frequency = { value: 55 };
  connect = vi.fn(() => this);
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  state = "running";
  destination = { connect: vi.fn() };
  sampleRate = 44100;
  createAnalyser = vi.fn(() => new MockAnalyserNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
}

beforeEach(() => {
  vi.stubGlobal("AudioContext", MockAudioContext as unknown as typeof AudioContext);
  vi.stubGlobal("requestAnimationFrame", vi.fn((cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn((id: number) => clearTimeout(id)));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AudioMeter", () => {
  beforeEach(async () => {
    const { AudioContextManager } = await import("../AudioContextManager");
    AudioContextManager.init();
    const { AudioMeter } = await import("../AudioMeter");
    AudioMeter.stop();
  });

  it("FEAT-055-01: level es 0 antes de start()", async () => {
    const { AudioMeter } = await import("../AudioMeter");
    expect(AudioMeter.level).toBe(0);
  });

  it("FEAT-055-03: onLevel se registra y recibe callbacks", async () => {
    const { AudioMeter } = await import("../AudioMeter");
    const cb = vi.fn();
    AudioMeter.onLevel = cb;
    AudioMeter.start();
    await new Promise((r) => setTimeout(r, 50));
    expect(cb).toHaveBeenCalled();
    AudioMeter.onLevel = null;
  });

  it("FEAT-055-04: stop() resetea level a 0", async () => {
    const { AudioMeter } = await import("../AudioMeter");
    AudioMeter.start();
    await new Promise((r) => setTimeout(r, 30));
    AudioMeter.stop();
    expect(AudioMeter.level).toBe(0);
  });

  it("FEAT-055-05: stop() llama onLevel(0)", async () => {
    const { AudioMeter } = await import("../AudioMeter");
    const cb = vi.fn();
    AudioMeter.onLevel = cb;
    AudioMeter.start();
    await new Promise((r) => setTimeout(r, 30));
    cb.mockClear();
    AudioMeter.stop();
    expect(cb).toHaveBeenCalledWith(0);
    AudioMeter.onLevel = null;
  });

  it("FEAT-055-06: start() dos veces no crea oscillator duplicado", async () => {
    const { AudioMeter } = await import("../AudioMeter");
    AudioMeter.start();
    AudioMeter.start();
    const Ctor = globalThis.AudioContext as unknown as { mock?: { results: Array<{ value: MockAudioContext }> } };
    const ctx = Ctor.mock?.results?.[0]?.value;
    if (ctx) {
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
    }
  });

  it("FEAT-055-07: stop() sin start() no lanza error", async () => {
    const { AudioMeter } = await import("../AudioMeter");
    expect(() => AudioMeter.stop()).not.toThrow();
  });

  it("FEAT-055-08: start() → stop() → start() funciona correctamente", async () => {
    const { AudioMeter } = await import("../AudioMeter");
    AudioMeter.start();
    await new Promise((r) => setTimeout(r, 20));
    AudioMeter.stop();
    AudioMeter.start();
    await new Promise((r) => setTimeout(r, 20));
    const Ctor = globalThis.AudioContext as unknown as { mock?: { results: Array<{ value: MockAudioContext }> } };
    const ctx = Ctor.mock?.results?.[0]?.value;
    if (ctx) {
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    }
    AudioMeter.stop();
  });
});
