const TAU = Math.PI * 2;
const NOTES_PER_OCTAVE = 12;
const A4_MIDI = 69;
const A4_FREQ = 440;

export type OscillatorType = "sine" | "saw" | "square";

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
};

const DEFAULT_CONFIG: SynthVoiceConfig = {
  oscillatorType: "saw",
  oscillatorDetune: 0,
  filterCutoff: 12000,
  filterResonance: 0.1,
  ampEnvAttack: 0.01,
  ampEnvDecay: 0.1,
  ampEnvSustain: 0.7,
  ampEnvRelease: 0.3,
  volume: 0.5,
  polyphony: 8,
};

function midiToFreq(note: number): number {
  return A4_FREQ * Math.pow(2, (note - A4_MIDI) / NOTES_PER_OCTAVE);
}

function oscSine(_freq: number, phase: number): number {
  return Math.sin(TAU * phase);
}

function oscSaw(_freq: number, phase: number): number {
  const p = phase % 1.0;
  return 2.0 * p - 1.0;
}

function oscSquare(_freq: number, phase: number): number {
  return phase % 1.0 < 0.5 ? 1.0 : -1.0;
}

const OSCILLATORS: Record<OscillatorType, (freq: number, phase: number) => number> = {
  sine: oscSine,
  saw: oscSaw,
  square: oscSquare,
};

const AdsrState = { Idle: 0, Attack: 1, Decay: 2, Sustain: 3, Release: 4 } as const;
type AdsrState = (typeof AdsrState)[keyof typeof AdsrState];

class Adsr {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  level = 0;
  state: AdsrState = 0;
  time = 0;

  constructor(attack: number, decay: number, sustain: number, release: number) {
    this.attack = Math.max(0, attack);
    this.decay = Math.max(0, decay);
    this.sustain = Math.max(0, Math.min(1, sustain));
    this.release = Math.max(0, release);
  }

  noteOn() {
    this.state = AdsrState.Attack;
    this.time = 0;
    this.level = this.attack <= 0 ? 1 : 0;
    if (this.attack <= 0) this.state = AdsrState.Decay;
  }

  noteOff() {
    if (this.state !== AdsrState.Idle) {
      this.state = AdsrState.Release;
      this.time = 0;
    }
  }

  process(dt: number): number {
    switch (this.state) {
      case AdsrState.Attack:
        this.time += dt;
        if (this.time >= this.attack) {
          this.level = 1;
          this.state = AdsrState.Decay;
          this.time = 0;
        } else {
          this.level = this.time / this.attack;
        }
        break;
      case AdsrState.Decay:
        if (this.decay <= 0) {
          this.level = this.sustain;
          this.state = AdsrState.Sustain;
        } else {
          this.time += dt;
          if (this.time >= this.decay) {
            this.level = this.sustain;
            this.state = AdsrState.Sustain;
          } else {
            const t = this.time / this.decay;
            this.level = 1 + t * (this.sustain - 1);
          }
        }
        break;
      case AdsrState.Sustain:
        this.level = this.sustain;
        break;
      case AdsrState.Release:
        if (this.release <= 0) {
          this.level = 0;
          this.state = AdsrState.Idle;
        } else {
          this.time += dt;
          if (this.time >= this.release) {
            this.level = 0;
            this.state = AdsrState.Idle;
          } else {
            const t = this.time / this.release;
            this.level = this.level * (1 - t);
          }
        }
        break;
    }
    return this.level;
  }

  isFinished(): boolean {
    return this.state === AdsrState.Idle;
  }
}

class Biquad {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  z1 = 0;
  z2 = 0;

  setLP(sampleRate: number, cutoff: number, q: number) {
    const fc = Math.max(20, Math.min(cutoff, sampleRate * 0.49));
    const qq = q <= 0 ? 0.001 : q;
    const omega = TAU * fc / sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * qq);
    const norm = 1 / (1 + alpha);
    this.b0 = (1 - cs) / 2 * norm;
    this.b1 = (1 - cs) * norm;
    this.b2 = (1 - cs) / 2 * norm;
    this.a1 = -2 * cs * norm;
    this.a2 = (1 - alpha) * norm;
  }

  process(input: number): number {
    const out = this.b0 * input + this.z1;
    this.z1 = this.b1 * input + this.z2 - this.a1 * out;
    this.z2 = this.b2 * input - this.a2 * out;
    return out;
  }

  reset() {
    this.z1 = 0;
    this.z2 = 0;
  }
}

interface Voice {
  note: number;
  velocity: number;
  phase: number;
  age: number;
  ampAdsr: Adsr;
  filter: Biquad;
  active: boolean;
  released: boolean;
}

export class PolySynth {
  private _sampleRate: number;
  private _config: SynthVoiceConfig;
  private _voices: Voice[] = [];
  private _ageCounter = 0;

  constructor(sampleRate: number, config?: Partial<SynthVoiceConfig>) {
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
    return this._voices.some((v) => v.active && !v.ampAdsr.isFinished());
  }

  noteOn(note: number, velocity: number) {
    const voice = this._allocateVoice();
    voice.note = Math.max(0, Math.min(127, Math.round(note)));
    voice.velocity = Math.max(0, Math.min(127, velocity)) / 127;
    voice.phase = 0;
    voice.age = ++this._ageCounter;
    voice.active = true;
    voice.released = false;
    voice.ampAdsr = new Adsr(this._config.ampEnvAttack,
      this._config.ampEnvDecay, this._config.ampEnvSustain,
      this._config.ampEnvRelease);
    voice.ampAdsr.noteOn();
    voice.filter.reset();
    voice.filter.setLP(this._sampleRate, this._config.filterCutoff, this._config.filterResonance);
  }

  noteOff(note: number) {
    for (const v of this._voices) {
      if (v.active && v.note === note && !v.released) {
        v.released = true;
        v.ampAdsr.noteOff();
      }
    }
  }

  allNotesOff() {
    for (const v of this._voices) {
      if (v.active) {
        v.released = true;
        v.ampAdsr.noteOff();
      }
    }
  }

  setConfig(config: Partial<SynthVoiceConfig>) {
    this._config = { ...this._config, ...config };
  }

  getConfig(): SynthVoiceConfig {
    return { ...this._config };
  }

  process(): [number, number] {
    let left = 0;
    let right = 0;
    const dt = 1 / this._sampleRate;
    const oscFn = OSCILLATORS[this._config.oscillatorType];
    const vol = this._config.volume;

    for (const v of this._voices) {
      if (!v.active) continue;

      const freq = midiToFreq(v.note) * Math.pow(2, this._config.oscillatorDetune / 1200);
      const amp = v.ampAdsr.process(dt);
      const raw = oscFn(freq, v.phase);
      const filtered = v.filter.process(raw);
      const sample = filtered * amp * v.velocity * vol;

      left += sample;
      right += sample;

      v.phase = (v.phase + freq * dt) % 1.0;

      if (v.ampAdsr.isFinished()) {
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
    this._voices = [];
  }

  private _createVoice(): Voice {
    return {
      note: 0,
      velocity: 0,
      phase: 0,
      age: 0,
      ampAdsr: new Adsr(0, 0, 0, 0),
      filter: new Biquad(),
      active: false,
      released: false,
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
