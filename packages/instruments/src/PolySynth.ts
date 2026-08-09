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

const LFO_TARGET: Record<SynthVoiceConfig["lfoTarget"], number> = {
  none: 0,
  pitch: 1,
  filter: 2,
  volume: 3,
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
    this._synth = new mod.PolySynth(sampleRate, this._config.polyphony);
    this._applyConfig();
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
    this._applyConfig();
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

  private _applyConfig() {
    const c = this._config;
    this._synth.set_oscillator_type(OSC_KIND[c.oscillatorType]);
    this._synth.set_oscillator_detune(c.oscillatorDetune);
    this._synth.set_filter_cutoff(c.filterCutoff);
    this._synth.set_filter_resonance(c.filterResonance);
    this._synth.set_amp_env(
      c.ampEnvAttack,
      c.ampEnvDecay,
      c.ampEnvSustain,
      c.ampEnvRelease,
    );
    this._synth.set_volume(c.volume);
    this._synth.set_pitch_env(c.pitchEnvAmount, c.pitchEnvAttack);
    this._synth.set_lfo(c.lfoRate, c.lfoDepth, LFO_TARGET[c.lfoTarget]);
    this._synth.set_fm(c.fmModRatio, c.fmModLevel, c.fmCarRatio);
    this._synth.set_pluck_damping(c.pluckDamping);
  }
}
