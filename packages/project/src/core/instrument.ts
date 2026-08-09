export type InstrumentEngineType = "synth" | "sampler";

export type InstrumentParams = Record<string, unknown>;

export interface InstrumentPresetData {
  id: string;
  name: string;
  category: string;
  icon: string;
  engine: InstrumentEngineType;
  config: InstrumentParams;
  sampleId?: string;
  rootNote?: number;
}

export interface InstrumentEngine {
  noteOn(note: number, velocity: number): void;
  noteOff(note: number): void;
  allNotesOff(): void;
  setConfig(config: InstrumentParams): void;
  processBlock(numSamples: number): Float32Array;
  free(): void;
}

export type EngineFactory = (
  engine: InstrumentEngineType,
  params: InstrumentParams,
  sampleRate: number,
) => InstrumentEngine;

export abstract class Instrument {
  readonly id: string;
  name: string;
  readonly engine: InstrumentEngineType;
  params: InstrumentParams;
  sampleId?: string;
  rootNote?: number;

  constructor(preset: InstrumentPresetData) {
    this.id = preset.id;
    this.name = preset.name;
    this.engine = preset.engine;
    this.params = { ...preset.config };
    this.sampleId = preset.sampleId;
    this.rootNote = preset.rootNote;
  }

  setParams(changes: InstrumentParams): void {
    this.params = { ...this.params, ...changes };
  }

  getConfig(): InstrumentParams {
    return { ...this.params, engine: this.engine };
  }

  toPreset(): InstrumentPresetData {
    return {
      id: this.id,
      name: this.name,
      category: "Custom",
      icon: "🎛",
      engine: this.engine,
      config: { ...this.params },
      ...(this.sampleId !== undefined ? { sampleId: this.sampleId } : {}),
      ...(this.rootNote !== undefined ? { rootNote: this.rootNote } : {}),
    };
  }

  createEngine(sampleRate: number, factory: EngineFactory): InstrumentEngine {
    return factory(this.engine, this.params, sampleRate);
  }
}

export class SynthInstrument extends Instrument {
  constructor(preset: Omit<InstrumentPresetData, "engine">) {
    super({ ...preset, engine: "synth" });
  }
}

export class SamplerInstrument extends Instrument {
  constructor(preset: Omit<InstrumentPresetData, "engine">) {
    super({ ...preset, engine: "sampler" });
  }
}

export function instrumentFromPreset(preset: InstrumentPresetData): Instrument {
  if (preset.engine === "sampler") return new SamplerInstrument(preset);
  return new SynthInstrument(preset);
}
