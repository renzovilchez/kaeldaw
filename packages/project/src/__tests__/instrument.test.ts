import { describe, it, expect, vi } from "vitest";
import {
  SynthInstrument,
  SamplerInstrument,
  instrumentFromPreset,
  type EngineFactory,
  type InstrumentEngine,
} from "../core/instrument";

function mockEngine(): InstrumentEngine {
  return {
    noteOn: vi.fn(),
    noteOff: vi.fn(),
    allNotesOff: vi.fn(),
    setConfig: vi.fn(),
    processBlock: vi.fn(() => new Float32Array(0)),
    free: vi.fn(),
  };
}

describe("modelo de instrumentos", () => {
  it("SynthInstrument fija engine synth y guarda params", () => {
    const inst = new SynthInstrument({
      id: "poly-saw",
      name: "Saw Lead",
      category: "Synths",
      icon: "🎛",
      config: { oscillatorType: "saw", volume: 0.5 },
    });
    expect(inst.engine).toBe("synth");
    expect(inst.params.oscillatorType).toBe("saw");
    expect(inst.toPreset()).toMatchObject({
      id: "poly-saw",
      engine: "synth",
      config: { oscillatorType: "saw" },
    });
  });

  it("SamplerInstrument fija engine sampler y rootNote", () => {
    const inst = new SamplerInstrument({
      id: "drum",
      name: "Drum",
      category: "Samplers",
      icon: "🥁",
      config: {},
      sampleId: "kick.wav",
      rootNote: 60,
    });
    expect(inst.engine).toBe("sampler");
    expect(inst.sampleId).toBe("kick.wav");
    expect(inst.rootNote).toBe(60);
  });

  it("setParams actualiza sin mutar la config original", () => {
    const inst = new SynthInstrument({
      id: "p",
      name: "P",
      category: "Synths",
      icon: "🎛",
      config: { volume: 0.5 },
    });
    inst.setParams({ volume: 0.8, filterCutoff: 6000 });
    expect(inst.params).toEqual({ volume: 0.8, filterCutoff: 6000 });
    expect(inst.toPreset().config).toEqual({ volume: 0.8, filterCutoff: 6000 });
  });

  it("createEngine delega en la factory con engine, params y sampleRate", () => {
    const engine = mockEngine();
    const factory: EngineFactory = vi.fn(() => engine);
    const inst = new SynthInstrument({
      id: "p",
      name: "P",
      category: "Synths",
      icon: "🎛",
      config: { volume: 0.4 },
    });
    const created = inst.createEngine(48000, factory);
    expect(factory).toHaveBeenCalledWith("synth", { volume: 0.4 }, 48000);
    expect(created).toBe(engine);
  });

  it("instrumentFromPreset elige subclase segun engine", () => {
    const synth = instrumentFromPreset({
      id: "s",
      name: "S",
      category: "Synths",
      icon: "🎛",
      engine: "synth",
      config: {},
    });
    const sampler = instrumentFromPreset({
      id: "m",
      name: "M",
      category: "Samplers",
      icon: "🥁",
      engine: "sampler",
      config: {},
    });
    expect(synth).toBeInstanceOf(SynthInstrument);
    expect(sampler).toBeInstanceOf(SamplerInstrument);
  });
});
