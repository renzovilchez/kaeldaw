import type { AdsrEnvelope as AdsrEnvelopeType, BandlimitedSaw as BandlimitedSawType, BandlimitedSquare as BandlimitedSquareType } from "kaeldaw-dsp";

type DspModule = {
  AdsrEnvelope: typeof AdsrEnvelopeType;
  BandlimitedSaw: typeof BandlimitedSawType;
  BandlimitedSquare: typeof BandlimitedSquareType;
  biquad_init: (sr: number) => number;
  biquad_set: (sr: number, type: number, cutoff: number, q: number, gain: number) => number;
  biquad_process: (handle: number, input: number) => number;
  biquad_free: (handle: number) => void;
};

let _dsp: DspModule | null = null;

export function setDspModule(mod: DspModule): void {
  _dsp = mod;
}

function dsp(): DspModule {
  if (!_dsp) throw new Error("DSP module not set. Call setDspModule() first.");
  return _dsp;
}

const TAU = Math.PI * 2;
const NOTES_PER_OCTAVE = 12;
const A4_MIDI = 69;
const A4_FREQ = 440;

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

function midiToFreq(note: number): number {
  return A4_FREQ * Math.pow(2, (note - A4_MIDI) / NOTES_PER_OCTAVE);
}

interface Voice {
  note: number;
  velocity: number;
  oscillator: BandlimitedSawType | BandlimitedSquareType | null;
  adsr: AdsrEnvelopeType | null;
  filterHandle: number;
  age: number;
  active: boolean;
  released: boolean;
  elapsed: number;
  lfoPhase: number;
  fmModPhase: number;
  fmCarPhase: number;
  pluckBuf: Float32Array | null;
  pluckIdx: number;
  pluckPrev: number;
}

export class PolySynth {
  private _dsp: DspModule;
  private _sampleRate: number;
  private _config: SynthVoiceConfig;
  private _voices: Voice[] = [];
  private _ageCounter = 0;

  constructor(sampleRate: number, config?: Partial<SynthVoiceConfig>) {
    this._dsp = dsp();
    this._sampleRate = sampleRate;
    this._config = { ...DEFAULT_CONFIG, ...config };
    for (let i = 0; i < this._config.polyphony; i++) {
      this._voices.push(this._createVoice());
    }
  }

  get activeVoices(): number {
    return this._voices.filter((v) => v.active).length;
  }

  get isActive(): boolean {
    return this._voices.some((v) => v.active && v.adsr && !v.adsr.is_finished());
  }

  noteOn(note: number, velocity: number) {
    const voice = this._allocateVoice();
    const m = this._dsp;
    voice.note = Math.max(0, Math.min(127, Math.round(note)));
    voice.velocity = Math.max(0, Math.min(127, velocity)) / 127;
    voice.age = ++this._ageCounter;
    voice.active = true;
    voice.released = false;
    voice.elapsed = 0;
    voice.lfoPhase = 0;
    voice.fmModPhase = 0;
    voice.fmCarPhase = 0;

    const sr = this._sampleRate;
    const c = this._config;
    if (c.oscillatorType === "pluck") {
      voice.oscillator?.free();
      voice.oscillator = null;
      const bufLen = Math.max(4, Math.round(sr / midiToFreq(note)));
      if (!voice.pluckBuf || voice.pluckBuf.length !== bufLen) {
        voice.pluckBuf = new Float32Array(bufLen);
      }
      for (let i = 0; i < bufLen; i++) {
        voice.pluckBuf[i] = Math.random() * 2 - 1;
      }
      voice.pluckIdx = 0;
      voice.pluckPrev = 0;
    } else {
      voice.pluckBuf = null;
      const useOsc = c.oscillatorType !== "noise" && c.oscillatorType !== "fm";
      if (useOsc) {
        const needSquare = c.oscillatorType === "square";
        const isSquare = voice.oscillator instanceof m.BandlimitedSquare;
        if (needSquare !== isSquare) {
          voice.oscillator?.free();
          voice.oscillator = needSquare ? new m.BandlimitedSquare(sr) : new m.BandlimitedSaw(sr);
        } else {
          voice.oscillator?.reset();
        }
      }
    }

    voice.adsr?.free();
    voice.adsr = new m.AdsrEnvelope(c.ampEnvAttack, c.ampEnvDecay, c.ampEnvSustain, c.ampEnvRelease);
    voice.adsr.note_on();

    m.biquad_free(voice.filterHandle);
    voice.filterHandle = m.biquad_set(sr, 0, c.filterCutoff, c.filterResonance, 0);
  }

  noteOff(note: number) {
    for (const v of this._voices) {
      if (v.active && v.note === note && !v.released) {
        v.released = true;
        v.adsr?.note_off();
      }
    }
  }

  allNotesOff() {
    for (const v of this._voices) {
      if (v.active) {
        v.released = true;
        v.adsr?.note_off();
      }
    }
  }

  setConfig(config: Partial<SynthVoiceConfig>) {
    const prevType = this._config.oscillatorType;
    this._config = { ...this._config, ...config };
    const typeChanged = prevType !== this._config.oscillatorType;
    const cutoffChanged = config.filterCutoff !== undefined || config.filterResonance !== undefined;
    const m = this._dsp;
    for (const v of this._voices) {
      if (typeChanged) {
        v.oscillator?.free();
        v.oscillator = null;
      } else if (cutoffChanged && v.active) {
        m.biquad_free(v.filterHandle);
        v.filterHandle = m.biquad_set(this._sampleRate, 0, this._config.filterCutoff, this._config.filterResonance, 0);
      }
    }
  }

  getConfig(): SynthVoiceConfig {
    return { ...this._config };
  }

  process(): [number, number] {
    let left = 0;
    let right = 0;
    const dt = 1 / this._sampleRate;
    const c = this._config;
    const m = this._dsp;

    for (const v of this._voices) {
      if (!v.active || !v.adsr) continue;

      // Pitch envelope
      let pitchOffset = 0;
      if (c.pitchEnvAmount !== 0 && v.elapsed < c.pitchEnvAttack) {
        const t = v.elapsed / c.pitchEnvAttack;
        pitchOffset = c.pitchEnvAmount * (1 - t);
      }
      v.elapsed += dt;

      // LFO
      let lfoVal = 0;
      if (c.lfoRate > 0 && c.lfoDepth > 0) {
        v.lfoPhase += c.lfoRate * dt * TAU;
        lfoVal = Math.sin(v.lfoPhase) * c.lfoDepth;
      }

      let freq = midiToFreq(v.note + pitchOffset) * Math.pow(2, c.oscillatorDetune / 1200);
      // LFO → pitch
      if (c.lfoTarget === "pitch") freq *= 1 + lfoVal * 0.05;

      let raw: number;

      if (c.oscillatorType === "noise") {
        raw = Math.random() * 2 - 1;
      } else if (c.oscillatorType === "pluck" && v.pluckBuf) {
        const bufLen = v.pluckBuf.length;
        const out = v.pluckBuf[v.pluckIdx];
        const avg = (out + v.pluckPrev) * 0.5;
        v.pluckPrev = out;
        v.pluckBuf[v.pluckIdx] = avg * (1 - c.pluckDamping * 0.5);
        v.pluckIdx = (v.pluckIdx + 1) % bufLen;
        raw = out;
      } else if (c.oscillatorType === "fm") {
        const modFreq = freq * c.fmModRatio;
        v.fmModPhase += modFreq * dt * TAU;
        const mod = Math.sin(v.fmModPhase) * c.fmModLevel * modFreq;
        v.fmCarPhase += (freq * c.fmCarRatio + mod) * dt * TAU;
        raw = Math.sin(v.fmCarPhase);
      } else if (!v.oscillator) {
        raw = 0;
      } else if (c.oscillatorType === "sine") {
        raw = Math.sin(TAU * v.oscillator.get_phase());
        v.oscillator.process(freq);
      } else if (c.oscillatorType === "triangle") {
        const phase = v.oscillator.get_phase();
        raw = 1 - 4 * Math.abs(phase - 0.5);
        v.oscillator.process(freq);
      } else {
        raw = v.oscillator.process(freq);
      }

      let filtered = m.biquad_process(v.filterHandle, raw);
      // LFO → filter
      if (c.lfoTarget === "filter") filtered *= 1 + lfoVal * 0.5;

      let amp = v.adsr.process(dt);
      // LFO → volume
      if (c.lfoTarget === "volume") amp *= Math.max(0, 1 + lfoVal);

      const sample = filtered * amp * v.velocity * c.volume;

      left += sample;
      right += sample;

      if (v.adsr.is_finished()) {
        v.active = false;
      }
    }

    return [Math.max(-1, Math.min(1, left)), Math.max(-1, Math.min(1, right))];
  }

  processBlock(numSamples: number): Float32Array {
    const buffer = new Float32Array(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const [l, r] = this.process();
      buffer[i * 2] = l;
      buffer[i * 2 + 1] = r;
    }
    return buffer;
  }

  destroy() {
    const m = this._dsp;
    for (const v of this._voices) {
      v.oscillator?.free();
      v.adsr?.free();
      m.biquad_free(v.filterHandle);
      v.pluckBuf = null;
    }
    this._voices = [];
  }

  private _createVoice(): Voice {
    const m = this._dsp;
    return {
      note: 0,
      velocity: 0,
      oscillator: new m.BandlimitedSaw(this._sampleRate),
      adsr: new m.AdsrEnvelope(0, 0, 0, 0),
      filterHandle: m.biquad_init(this._sampleRate),
      age: 0,
      active: false,
      released: false,
      elapsed: 0,
      lfoPhase: 0,
      fmModPhase: 0,
      fmCarPhase: 0,
      pluckBuf: null,
      pluckIdx: 0,
      pluckPrev: 0,
    };
  }

  private _allocateVoice(): Voice {
    const free = this._voices.find((v) => !v.active);
    if (free) return free;
    let oldest = this._voices[0];
    for (const v of this._voices) {
      if (v.age < oldest.age) oldest = v;
    }
    return oldest;
  }
}
