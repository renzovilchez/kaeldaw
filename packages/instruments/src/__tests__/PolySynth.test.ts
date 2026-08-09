import { describe, it, expect, vi } from "vitest";

const mockDsp = {
  AdsrEnvelope: class {
    level = 1;
    state = 0;
    time = 0;
    _r = 0.3;
    note_on() { this.state = 3; this.level = 1; this.time = 0; }
    note_off() { if (this.state !== 0) { this.state = 4; this.time = 0; } }
    process(dt: number) {
      if (this.state === 4) {
        this.time += dt;
        if (this.time >= this._r) { this.state = 0; this.level = 0; }
        else { this.level = 1 - this.time / this._r; }
      }
      return this.level;
    }
    is_finished() { return this.state === 0; }
    free() {}
  },
  Oscillator: class {
    _ph = 0; _modPh = 0; _sr = 48000; _kind = 1; _noise = 0; _ks: Float32Array | null = null; _ksi = 0;
    constructor(kind: number, sr: number, seed: number) {
      this._kind = kind; this._sr = sr; this._noise = seed || 0x9e3779b9;
    }
    process(f: number, mr = 1, ml = 0, cr = 1, pd = 0.5) {
      if (f <= 0) return 0;
      const inc = f / this._sr;
      switch (this._kind) {
        case 0: { const o = Math.sin(2 * Math.PI * this._ph); this._ph = (this._ph + inc) % 1; return o; }
        case 1: { const o = 2 * (this._ph % 1) - 1; this._ph = (this._ph + inc) % 1; return o; }
        case 2: { const o = this._ph % 1 < 0.5 ? 1 : -1; this._ph = (this._ph + inc) % 1; return o; }
        case 3: { const o = 2 * Math.abs(2 * (this._ph % 1) - 1) - 1; this._ph = (this._ph + inc) % 1; return o; }
        case 4: {
          let x = this._noise; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this._noise = x >>> 0;
          return (x / 0xffffffff) * 2 - 1;
        }
        case 5: {
          const modI = (f * mr) / this._sr;
          this._modPh = (this._modPh + modI) % 1;
          const mod = Math.sin(2 * Math.PI * this._modPh) * ml * f * mr;
          this._ph = (this._ph + (f * cr + mod) / this._sr) % 1;
          return Math.sin(2 * Math.PI * this._ph);
        }
        default: {
          if (!this._ks) {
            const len = Math.max(2, Math.round(this._sr / f));
            this._ks = new Float32Array(len);
            for (let i = 0; i < len; i++) {
              let x = this._noise; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this._noise = x >>> 0;
              this._ks[i] = (x / 0xffffffff) * 2 - 1;
            }
            this._ksi = 0;
          }
          const idx = this._ksi; const cur = this._ks[idx]; const nxt = this._ks[(idx + 1) % this._ks.length];
          this._ks[idx] = (cur + pd * (nxt - cur)) * 0.996; this._ksi = (idx + 1) % this._ks.length;
          return cur;
        }
      }
    }
    reset() { this._ph = 0; this._modPh = 0; this._ks = null; this._noise = this._noise || 0x9e3779b9; }
    get_phase() { return this._ph % 1.0; }
    free() {}
  },
  biquad_init: () => 0,
  biquad_set: () => {},
  biquad_process: (_h: number, i: number) => i,
  biquad_free: () => {},
};

vi.mock("kaeldaw-dsp", () => mockDsp);

import { setDspModule } from "../PolySynth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
setDspModule(mockDsp as any);

import { PolySynth } from "../PolySynth";

const SR = 48000;

describe("PolySynth", () => {
  it("instancia con config por defecto", () => {
    const synth = new PolySynth(SR);
    expect(synth.activeVoices).toBe(0);
    expect(synth.isActive).toBe(false);
  });

  it("noteOn produce audio en process() (sample no-zero)", () => {
    const synth = new PolySynth(SR);
    synth.noteOn(69, 100);
    expect(synth.activeVoices).toBe(1);
    expect(synth.isActive).toBe(true);
    const [l, r] = synth.process();
    expect(l).not.toBe(0);
    expect(r).toBe(l);
  });

  it("noteOff inicia release (volumen decrece)", () => {
    const synth = new PolySynth(SR);
    synth.noteOn(69, 100);
    for (let i = 0; i < 100; i++) synth.process();
    synth.noteOff(69);
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const [l] = synth.process();
      samples.push(l);
    }
    const firstHalf = Math.max(...samples.slice(0, 100).map(Math.abs));
    const lastHalf = Math.max(...samples.slice(-100).map(Math.abs));
    expect(lastHalf).toBeLessThanOrEqual(firstHalf + 0.001);
  });

  it("polifonia respeta max voices", () => {
    const synth = new PolySynth(SR, { polyphony: 4 });
    for (let i = 0; i < 8; i++) {
      synth.noteOn(60 + i, 100);
    }
    expect(synth.activeVoices).toBe(4);
  });

  it("allNotesOff silencia todas las voces", () => {
    const synth = new PolySynth(SR);
    synth.noteOn(60, 100);
    synth.noteOn(64, 100);
    synth.noteOn(67, 100);
    expect(synth.activeVoices).toBe(3);
    synth.allNotesOff();
    for (let i = 0; i < 20000; i++) synth.process();
    expect(synth.isActive).toBe(false);
  });

  it("setConfig actualiza parametros", () => {
    const synth = new PolySynth(SR);
    synth.setConfig({ volume: 1, oscillatorType: "sine" });
    const cfg = synth.getConfig();
    expect(cfg.volume).toBe(1);
    expect(cfg.oscillatorType).toBe("sine");
  });

  it("processBlock retorna buffer de 2*n floats", () => {
    const synth = new PolySynth(SR);
    synth.noteOn(69, 100);
    const buf = synth.processBlock(64);
    expect(buf.length).toBe(128);
    expect(buf[0]).not.toBe(0);
    expect(buf[buf.length - 1]).toBeDefined();
  });

  it("activeVoices refleja cantidad correcta", () => {
    const synth = new PolySynth(SR);
    expect(synth.activeVoices).toBe(0);
    synth.noteOn(60, 100);
    expect(synth.activeVoices).toBe(1);
    synth.noteOn(64, 100);
    expect(synth.activeVoices).toBe(2);
  });

  it("destroy libera recursos", () => {
    const synth = new PolySynth(SR);
    synth.noteOn(60, 100);
    synth.destroy();
    expect(synth.activeVoices).toBe(0);
  });

  it("misma nota multiple veces (retrigger)", () => {
    const synth = new PolySynth(SR);
    synth.noteOn(60, 100);
    synth.noteOff(60);
    synth.noteOn(60, 100);
    const samples: number[] = [];
    for (let i = 0; i < 10; i++) {
      const [l] = synth.process();
      samples.push(l);
    }
    const hasAudio = samples.some((s) => Math.abs(s) > 0.001);
    expect(hasAudio).toBe(true);
  });

  it("noteOn/Off ciclos repetidos no crashean", () => {
    const synth = new PolySynth(SR);
    for (let i = 0; i < 20; i++) {
      synth.noteOn(60 + (i % 12), 100);
      synth.process();
      synth.noteOff(60 + (i % 12));
    }
    for (let i = 0; i < 50000; i++) synth.process();
    expect(synth.isActive).toBe(false);
  });
});
