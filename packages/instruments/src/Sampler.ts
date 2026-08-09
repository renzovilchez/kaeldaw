import type { Sampler as DspSampler } from "kaeldaw-dsp";

type DspModule = {
  Sampler: typeof DspSampler;
};

let _dsp: DspModule | null = null;

export function setDspModule(mod: DspModule): void {
  _dsp = mod;
}

function dsp(): DspModule {
  if (!_dsp) throw new Error("DSP module not set. Call setDspModule() first.");
  return _dsp;
}

export class Sampler {
  private _sampler: DspSampler;
  private _rootNote = 60;

  constructor(sampleRate: number) {
    const mod = dsp();
    this._sampler = new mod.Sampler(sampleRate);
  }

  setSample(data: Float32Array, sampleRate: number, rootNote = 60): void {
    this._rootNote = rootNote;
    this._sampler.set_sample(data, sampleRate, rootNote);
  }

  get rootNote(): number {
    return this._rootNote;
  }

  get hasSample(): boolean {
    return this._sampler.has_sample();
  }

  noteOn(note: number, velocity: number): void {
    this._sampler.note_on(note, velocity);
  }

  noteOff(note: number): void {
    this._sampler.note_off(note);
  }

  allNotesOff(): void {
    this._sampler.all_notes_off();
  }

  process(): [number, number] {
    const sample = this._sampler.process_sample();
    return [sample, sample];
  }

  processBlock(numSamples: number): Float32Array {
    return this._sampler.process_block(numSamples);
  }

  destroy(): void {
    this._sampler.free();
  }
}
