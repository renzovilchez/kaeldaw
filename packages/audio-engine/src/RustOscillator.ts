import { osc_sine, osc_saw, osc_square } from "kaeldaw-dsp";

export type OscType = "sine" | "saw" | "square";

const FREQ_MIN = 20;
const FREQ_MAX = 8000;

export class RustOscillator {
  readonly type: OscType;
  private _frequency: number;
  readonly sampleRate: number;
  private phase = 0;

  constructor(type: OscType, frequency: number, sampleRate: number) {
    this.type = type;
    this._frequency = Math.max(FREQ_MIN, Math.min(FREQ_MAX, frequency));
    this.sampleRate = sampleRate;
  }

  get frequency(): number {
    return this._frequency;
  }

  setFrequency(value: number): void {
    this._frequency = Math.max(FREQ_MIN, Math.min(FREQ_MAX, value));
  }

  generate(numSamples: number): Float32Array {
    const buf = new Float32Array(numSamples);
    const sr = this.sampleRate;
    const freq = this._frequency;
    const phaseInc = freq / sr;

    for (let i = 0; i < numSamples; i++) {
      this.phase = (this.phase + phaseInc) % 1.0;
      switch (this.type) {
        case "sine":
          buf[i] = osc_sine(freq, this.phase, sr);
          break;
        case "saw":
          buf[i] = osc_saw(freq, this.phase, sr);
          break;
        case "square":
          buf[i] = osc_square(freq, this.phase, sr);
          break;
      }
    }

    return buf;
  }
}
