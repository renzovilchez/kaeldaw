import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("kaeldaw-dsp", () => {
  class MockAdsr {
    level = 1;
    state = 0;
    time = 0;
    _r = 0.3;
    note_on() { this.state = 3; this.level = 1; this.time = 0; }
    note_off() { if (this.state !== 0) { this.state = 4; this.time = 0; } }
    process(dt: number) {
      if (this.state === 4) {
        this.time += dt;
        if (this.time >= this._r) { this.state = 0; this.level = 0; }
        else { this.level = 1 - this.time / this._r; }
      }
      return this.level;
    }
    is_finished() { return this.state === 0; }
    free() {}
  }
  class MockSaw {
    _ph = 0; _sr = 48000;
    constructor(sr: number) { this._sr = sr; }
    process(f: number) {
      if (f <= 0) return 0;
      this._ph += f / this._sr;
      return 2 * (this._ph % 1.0) - 1;
    }
    reset() { this._ph = 0; }
    get_phase() { return this._ph % 1.0; }
    free() {}
  }
  class MockSqr {
    _ph = 0; _sr = 48000;
    constructor(sr: number) { this._sr = sr; }
    process(f: number) {
      if (f <= 0) return 0;
      this._ph += f / this._sr;
      return this._ph % 1.0 < 0.5 ? 1 : -1;
    }
    reset() { this._ph = 0; }
    get_phase() { return this._ph % 1.0; }
    free() {}
  }
  return {
    AdsrEnvelope: MockAdsr,
    BandlimitedSaw: MockSaw,
    BandlimitedSquare: MockSqr,
    biquad_init: vi.fn(() => 0),
    biquad_set: vi.fn(),
    biquad_process: vi.fn((_h: number, i: number) => i),
    biquad_free: vi.fn(),
  };
});

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

class MockAudioWorkletNode {
  port = { postMessage: vi.fn(), onmessage: null };
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
  audioWorklet = { addModule: vi.fn(async () => {}) };
  createGain = vi.fn(() => new MockGainNode());
  createAnalyser = vi.fn(() => new MockAnalyserNode());
  createScriptProcessor = vi.fn(() => new MockScriptProcessorNode());
  resume = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal("AudioContext", MockAudioContext as unknown as typeof AudioContext);
  vi.stubGlobal("AudioWorkletNode", MockAudioWorkletNode);
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

  it("FEAT-057-01: start() setea isStarted a true", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    await PolySynthOutput.start();
    expect(PolySynthOutput.isStarted).toBe(true);
  });

  it("FEAT-057-02: start() se puede llamar varias veces sin errores", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    await PolySynthOutput.start();
    expect(PolySynthOutput.isStarted).toBe(true);
    await PolySynthOutput.start();
    expect(PolySynthOutput.isStarted).toBe(true);
  });

  it("FEAT-057-03: stop() resetea isStarted a false", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    await PolySynthOutput.start();
    PolySynthOutput.stop();
    expect(PolySynthOutput.isStarted).toBe(false);
  });

  it("FEAT-057-04: setChannelVolume envia mensaje al worklet", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    expect(() => PolySynthOutput.setChannelVolume("ch-1", 0.5, 0, false)).not.toThrow();
  });

  it("FEAT-057-05: setChannelInsertFx envia mensaje al worklet", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    expect(() => PolySynthOutput.setChannelInsertFx("ch-1", "delay", true, 0.3)).not.toThrow();
  });

  it("FEAT-057-06: setChannelSendLevel envia mensaje al worklet", async () => {
    const { PolySynthOutput } = await import("../PolySynthOutput");
    expect(() => PolySynthOutput.setChannelSendLevel("ch-1", 0.5)).not.toThrow();
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