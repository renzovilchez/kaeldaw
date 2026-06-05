import { describe, it, expect, beforeEach, vi } from "vitest";

class MockOscillatorNode {
  type = "sine";
  frequency = { value: 440 };
  connect = vi.fn(() => this);
  start = vi.fn();
  stop = vi.fn();
}

class MockGainNode {
  gain = { value: 0.3 };
  connect = vi.fn(() => this);
}

class MockAudioContext {
  state = "running";
  destination = "dest";
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
  resume = vi.fn();
  suspend = vi.fn();
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("AudioContext", MockAudioContext as unknown as typeof AudioContext);
});

describe("SineOscillator", () => {
  async function init() {
    const { AudioContextManager } = await import("../AudioContextManager");
    AudioContextManager.init();
    const { SineOscillator } = await import("../SineOscillator");
    return SineOscillator;
  }

  it("crea oscilador con frecuencia 440, gain 0.3, started false", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();

    expect(osc.frequency).toBe(440);
    expect(osc.gain).toBe(0.3);
    expect(osc.started).toBe(false);
  });

  it("start() cambia started a true", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();
    osc.start();

    expect(osc.started).toBe(true);
  });

  it("start() + stop() cambia started a false", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();
    osc.start();
    osc.stop();

    expect(osc.started).toBe(false);
  });

  it("set frequency(880) actualiza frecuencia", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();
    osc.frequency = 880;

    expect(osc.frequency).toBe(880);
  });

  it("set gain(0.5) actualiza gain", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();
    osc.gain = 0.5;

    expect(osc.gain).toBe(0.5);
  });

  it("start() dos veces es no-op", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();
    osc.start();
    osc.start();

    expect(osc.started).toBe(true);
  });

  it("stop() sin start() es no-op", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();
    osc.stop();

    expect(osc.started).toBe(false);
  });

  it("frequency fuera de rango se clamp al rango 20-8000", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();

    osc.frequency = 10;
    expect(osc.frequency).toBe(20);

    osc.frequency = 10000;
    expect(osc.frequency).toBe(8000);
  });

  it("gain fuera de rango se clamp a 0-1", async () => {
    const SineOscillator = await init();
    const osc = new SineOscillator();

    osc.gain = -1;
    expect(osc.gain).toBe(0);

    osc.gain = 2;
    expect(osc.gain).toBe(1);
  });
});
