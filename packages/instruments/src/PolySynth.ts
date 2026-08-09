import type { PolySynth as DspPolySynth } from "kaeldaw-dsp";

type DspModule = {
  PolySynth: typeof DspPolySynth;
};

let _dsp: DspModule | null = null;

export function setDspModule(mod: DspModule): void {
  _dsp = mod;
}

function dsp(): DspModule {
  if (!_dsp) throw new Error("DSP module not set. Call setDspModule() first.");
  return _dsp;
}

export type OscillatorType = "sine" | "saw" | "square" | "triangle" | "noise" | "fm" | "pluck";

export type SynthVoiceConfig = {
  oscillatorType: OscillatorType;
  oscillatorDetune: number;
  filterCutoff: number;
  filterResonance: number;
  ampEnvAttack: number;
  ampEnvDecay: number;
  ampEnvSustain: number;
  ampEnvRelease: number;
  volume: number;
  polyphony: number;
  pitchEnvAmount: number;
  pitchEnvAttack: number;
  lfoRate: number;
  lfoDepth: number;
  lfoTarget: "none" | "pitch" | "filter" | "volume";
  fmModRatio: number;
  fmModLevel: number;
  fmCarRatio: number;
  pluckDamping: number;
};

const OSC_KIND: Record<OscillatorType, number> = {
  sine: 0,
  saw: 1,
  square: 2,
  triangle: 3,
  noise: 4,
  fm: 5,
  pluck: 6,
};

const DEFAULT_CONFIG: SynthVoiceConfig = {
  oscillatorType: "saw",
  oscillatorDetune: 0,
  filterCutoff: 8000,
  filterResonance: 0.1,
  ampEnvAttack: 0.01,
  ampEnvDecay: 0.1,
  ampEnvSustain: 0.7,
  ampEnvRelease: 0.3,
  volume: 0.5,
  polyphony: 8,
  pitchEnvAmount: 0,
  pitchEnvAttack: 0,
  lfoRate: 0,
  lfoDepth: 0,
  lfoTarget: "none",
  fmModRatio: 1,
  fmModLevel: 0,
  fmCarRatio: 1,
  pluckDamping: 0.5,
};

export class PolySynth {
  private _synth: DspPolySynth;
  private _config: SynthVoiceConfig;

  constructor(sampleRate: number, config?: Partial<SynthVoiceConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    const mod = dsp();
    this._synth = new mod.PolySynth(sampleRate, this._serializeConfig());
  }

  get activeVoices(): number {
    return this._synth.active_voices();
  }

  get isActive(): boolean {
    return this._synth.is_active();
  }

  noteOn(note: number, velocity: number) {
    this._synth.note_on(note, velocity);
  }

  noteOff(note: number) {
    this._synth.note_off(note);
  }

  allNotesOff() {
    this._synth.all_notes_off();
  }

  setConfig(config: Partial<SynthVoiceConfig>) {
    this._config = { ...this._config, ...config };
    this._synth.set_config(this._serializeConfig());
  }

  getConfig(): SynthVoiceConfig {
    return { ...this._config };
  }

  process(): [number, number] {
    const sample = this._synth.process_sample();
    return [sample, sample];
  }

  processBlock(numSamples: number): Float32Array {
    return this._synth.process_block(numSamples);
  }

  destroy() {
    this._synth.free();
  }

  private _serializeConfig(): string {
    return JSON.stringify({
      oscillatorType: OSC_KIND[this._config.oscillatorType],
      oscillatorDetune: this._config.oscillatorDetune,
      filterCutoff: this._config.filterCutoff,
      filterResonance: this._config.filterResonance,
      ampEnvAttack: this._config.ampEnvAttack,
      ampEnvDecay: this._config.ampEnvDecay,
      ampEnvSustain: this._config.ampEnvSustain,
      ampEnvRelease: this._config.ampEnvRelease,
      volume: this._config.volume,
      polyphony: this._config.polyphony,
      pitchEnvAmount: this._config.pitchEnvAmount,
      pitchEnvAttack: this._config.pitchEnvAttack,
      lfoRate: this._config.lfoRate,
      lfoDepth: this._config.lfoDepth,
      lfoTarget: this._config.lfoTarget,
      fmModRatio: this._config.fmModRatio,
      fmModLevel: this._config.fmModLevel,
      fmCarRatio: this._config.fmCarRatio,
      pluckDamping: this._config.pluckDamping,
    });
  }
}
