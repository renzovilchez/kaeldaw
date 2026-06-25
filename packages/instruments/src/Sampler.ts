interface SamplerVoice {
  on: boolean;
  note: number;
  velocity: number;
  position: number;
  released: boolean;
  age: number;
  envLevel: number;
  envState: number;
  envTime: number;
  envRl: number;
}

const MAX_VOICES = 8;

export class Sampler {
  private _sr: number;
  private _buf: Float32Array | null = null;
  private _bufSr = 44100;
  private _rootNote = 60;
  private _voices: SamplerVoice[] = [];
  private _ageCounter = 0;

  constructor(sampleRate: number) {
    this._sr = sampleRate;
    for (let i = 0; i < MAX_VOICES; i++) this._voices.push(this._mk());
  }

  setSample(data: Float32Array, sampleRate: number, rootNote = 60): void {
    this._buf = data;
    this._bufSr = sampleRate;
    this._rootNote = rootNote;
  }

  get rootNote(): number { return this._rootNote; }
  get hasSample(): boolean { return this._buf !== null; }

  private _mk(): SamplerVoice {
    return { on: false, note: 60, velocity: 0, position: 0, released: false, age: 0,
      envLevel: 0, envState: 0, envTime: 0, envRl: 0 };
  }

  private _alloc(): SamplerVoice {
    for (const v of this._voices) if (!v.on) return v;
    let oldest = this._voices[0];
    for (const v of this._voices) if (v.age < oldest.age) oldest = v;
    oldest.on = false;
    return oldest;
  }

  noteOn(note: number, velocity: number): void {
    if (!this._buf) return;
    const v = this._alloc();
    v.note = Math.max(0, Math.min(127, Math.round(note)));
    v.velocity = Math.max(0, Math.min(127, velocity)) / 127;
    v.position = 0;
    v.released = false;
    v.on = true;
    v.age = ++this._ageCounter;
    v.envLevel = 0;
    v.envState = 1;
    v.envTime = 0;
  }

  noteOff(note: number): void {
    for (const v of this._voices) {
      if (v.on && v.note === note && !v.released) {
        v.released = true;
        v.envRl = v.envLevel;
        v.envState = 4;
        v.envTime = 0;
      }
    }
  }

  allNotesOff(): void {
    for (const v of this._voices) {
      if (v.on) {
        v.released = true;
        v.envRl = v.envLevel;
        v.envState = 4;
        v.envTime = 0;
      }
    }
  }

  process(): [number, number] {
    let s = 0;
    let active = 0;
    const dt = 1 / this._sr;

    for (const v of this._voices) {
      if (!v.on) continue;

      const pitch = Math.pow(2, (v.note - this._rootNote) / 12);
      const step = pitch * (this._sr / this._bufSr);

      if (!this._buf || v.position >= this._buf.length) {
        v.on = false;
        continue;
      }

      const pos = Math.floor(v.position);
      const frac = v.position - pos;
      const s0 = this._buf[pos] || 0;
      const s1 = this._buf[Math.min(pos + 1, this._buf.length - 1)] || 0;
      const raw = s0 + frac * (s1 - s0);
      switch (v.envState) {
        case 1:
          v.envTime += dt;
          if (v.envTime >= 0.01) { v.envLevel = 1; v.envState = 2; v.envTime = 0; }
          else v.envLevel = v.envTime / 0.01;
          break;
        case 2:
          if (v.envTime >= 0.1) { v.envLevel = 1; v.envState = 3; }
          else { v.envTime += dt; v.envLevel = 1 + (v.envTime / 0.1) * (1 - 1); }
          break;
        case 3:
          v.envLevel = 1;
          break;
        case 4:
          v.envTime += dt;
          if (v.envTime >= 0.2) { v.envLevel = 0; v.on = false; }
          else v.envLevel = v.envRl * (1 - v.envTime / 0.2);
          break;
      }
      const amp = v.envLevel * v.velocity;
      s += raw * amp;
      active++;
      v.position += step;
    }

    if (active > 1) s /= Math.sqrt(active);
    s = s / (1 + Math.abs(s));
    return [s, s];
  }

  processBlock(numSamples: number): Float32Array {
    const out = new Float32Array(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const [l, r] = this.process();
      out[i * 2] = l;
      out[i * 2 + 1] = r;
    }
    return out;
  }

  destroy(): void {
    this._buf = null;
    this._voices = [];
  }
}