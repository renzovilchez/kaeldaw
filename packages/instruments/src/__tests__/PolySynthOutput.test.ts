import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@kaeldaw/audio-engine/WasmEffects", () => ({
  initWasmEffects: vi.fn(async () => {}),
  createWasmDelay: vi.fn(() => 1),
  setWasmDelay: vi.fn(),
  processWasmDelay: vi.fn((_h: number, s: number) => s),
  freeWasmDelay: vi.fn(),
  createWasmReverb: vi.fn(() => 2),
  setWasmReverb: vi.fn(),
  processWasmReverb: vi.fn((_h: number, s: number) => s),
  freeWasmReverb: vi.fn(),
}));

class MockAnalyserNode {
  fftSize = 256;
  frequencyBinCount = 128;
  connect = vi.fn(() => this);
  disconnect = vi.fn();
  getByteTimeDomainData = vi.fn((data: Uint8Array) => {
    for (let i = 0; i < data.length; i++) data[i] = 128;
  });
}

class MockGainNode {
  gain = { value: 1 };
  connect = vi.fn(() => this);
  disconnect = vi.fn();
}

class MockScriptProcessorNode {
  onaudioprocess: ((e: AudioProcessingEvent) => void) | null = null;
  connect = vi.fn(() => this);
  disconnect = vi.fn();
}

class MockAudioContext {
  state = "running";
  destination = { connect: vi.fn() };
  sampleRate = 44100;
  createGain = vi.fn(() => new MockGainNode());
  createAnalyser = vi.fn(() => new MockAnalyserNode());
  createScriptProcessor = vi.fn(() => new MockScriptProcessorNode());
  resume = vi.fn();
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

describe("PolySynthOutput", () => {
  beforeEach(async () => {
    const { AudioContextManager } = await import("@kaeldaw/audio-engine/AudioContextManager");
    AudioContextManager.init();
    const { PolySynthOutput } = await import("../PolySynthOutput");
    PolySynthOutput.stop();
  });

  it("FEAT-057-01: start() crea synthInstance", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    await PolySynthOutput.start();
    expect(PolySynthOutput.synthInstance).not.toBeNull();
  });

  it("FEAT-057-02: start() dos veces no crea synth duplicado", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    await PolySynthOutput.start();
    const first = PolySynthOutput.synthInstance;
    await PolySynthOutput.start();
    expect(PolySynthOutput.synthInstance).toBe(first);
  });

  it("FEAT-057-03: stop() resetea synthInstance a null", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    await PolySynthOutput.start();
    PolySynthOutput.stop();
    expect(PolySynthOutput.synthInstance).toBeNull();
  });

  it("FEAT-057-04: setDelayEnabled actualiza delayEnabled", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    expect(PolySynthOutput.delayEnabled).toBe(false);
    PolySynthOutput.setDelayEnabled(true);
    expect(PolySynthOutput.delayEnabled).toBe(true);
    PolySynthOutput.setDelayEnabled(false);
    expect(PolySynthOutput.delayEnabled).toBe(false);
  });

  it("FEAT-057-05: setReverbEnabled actualiza reverbEnabled", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    expect(PolySynthOutput.reverbEnabled).toBe(false);
    PolySynthOutput.setReverbEnabled(true);
    expect(PolySynthOutput.reverbEnabled).toBe(true);
    PolySynthOutput.setReverbEnabled(false);
    expect(PolySynthOutput.reverbEnabled).toBe(false);
  });

  it("FEAT-057-07: stop() llama onLevel(0)", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    const cb = vi.fn();
    PolySynthOutput.onLevel = cb;
    await PolySynthOutput.start();
    cb.mockClear();
    PolySynthOutput.stop();
    expect(cb).toHaveBeenCalledWith(0);
    PolySynthOutput.onLevel = null;
  });

  it("FEAT-057-08: stop() sin start() no lanza error", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    expect(() => PolySynthOutput.stop()).not.toThrow();
  });
});
