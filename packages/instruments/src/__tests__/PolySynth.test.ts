import { describe, it, expect, vi } from "vitest";

type MockVoice = {
  on: boolean;
  note: number;
  vel: number;
  ph: number;
  age: number;
  env: number;
  envState: number;
  envT: number;
  envRl: number;
};

class MockPolySynth {
  _sr: number;
  _voices: MockVoice[] = [];
  _age = 0;
  _cfg: Record<string, unknown>;
  constructor(sr: number, polyphony = 8) {
    this._sr = sr;
    this._cfg = {
      oscillatorType: 1,
      filterCutoff: 8000,
      filterResonance: 0.1,
      ampEnvAttack: 0.01,
      ampEnvDecay: 0.1,
      ampEnvSustain: 0.7,
      ampEnvRelease: 0.3,
      volume: 0.5,
      polyphony,
      pitchEnvAmount: 0,
      pitchEnvAttack: 0,
      lfoRate: 0,
      lfoDepth: 0,
      lfoTarget: 0,
      fmModRatio: 1,
      fmModLevel: 0,
      fmCarRatio: 1,
      pluckDamping: 0.5,
    };
    const n = Math.max(1, polyphony | 0);
    for (let i = 0; i < n; i++) {
      this._voices.push({ on: false, note: 0, vel: 0, ph: 0, age: 0, env: 0, envState: 0, envT: 0, envRl: 0 });
    }
  }
  set_oscillator_type(kind: number) { this._cfg.oscillatorType = kind; }
  set_oscillator_detune(v: number) { this._cfg.oscillatorDetune = v; }
  set_filter_cutoff(v: number) { this._cfg.filterCutoff = v; }
  set_filter_resonance(v: number) { this._cfg.filterResonance = v; }
  set_amp_env(a: number, d: number, s: number, r: number) {
    this._cfg.ampEnvAttack = a; this._cfg.ampEnvDecay = d;
    this._cfg.ampEnvSustain = s; this._cfg.ampEnvRelease = r;
  }
  set_volume(v: number) { this._cfg.volume = v; }
  set_pitch_env(amount: number, attack: number) {
    this._cfg.pitchEnvAmount = amount; this._cfg.pitchEnvAttack = attack;
  }
  set_lfo(rate: number, depth: number, target: number) {
    this._cfg.lfoRate = rate; this._cfg.lfoDepth = depth; this._cfg.lfoTarget = target;
  }
  set_fm(mr: number, ml: number, cr: number) {
    this._cfg.fmModRatio = mr; this._cfg.fmModLevel = ml; this._cfg.fmCarRatio = cr;
  }
  set_pluck_damping(v: number) { this._cfg.pluckDamping = v; }
  _alloc(): MockVoice {
    const free = this._voices.find((v) => !v.on);
    if (free) return free;
    return this._voices.reduce((a, b) => (b.age < a.age ? b : a));
  }
  note_on(note: number, velocity: number) {
    const v = this._alloc();
    v.on = true;
    v.note = Math.max(0, Math.min(127, Math.round(note)));
    v.vel = Math.max(0, Math.min(127, velocity)) / 127;
    v.ph = 0;
    v.age = ++this._age;
    v.env = 0;
    v.envState = 1;
    v.envT = 0;
  }
  note_off(note: number) {
    const n = Math.round(note);
    for (const v of this._voices) {
      if (v.on && v.note === n && v.envState !== 4) {
        v.envState = 4;
        v.envT = 0;
        v.envRl = v.env;
      }
    }
  }
  all_notes_off() {
    for (const v of this._voices) {
      if (v.on) {
        v.envState = 4;
        v.envT = 0;
        v.envRl = v.env;
      }
    }
  }
  active_voices() {
    return this._voices.filter((v) => v.on).length;
  }
  is_active() {
    return this._voices.some((v) => v.on && v.envState !== 0);
  }
  process_sample() {
    const dt = 1 / this._sr;
    let sum = 0;
    for (const v of this._voices) {
      if (!v.on) continue;
      const attack = this._cfg.ampEnvAttack as number;
      const decay = this._cfg.ampEnvDecay as number;
      const sustain = this._cfg.ampEnvSustain as number;
      const release = this._cfg.ampEnvRelease as number;
      switch (v.envState) {
        case 1:
          v.envT += dt;
          if (v.envT >= attack) { v.env = 1; v.envState = 2; }
          else v.env = v.envT / attack;
          break;
        case 2:
          v.envT += dt;
          if (v.envT >= decay) { v.env = sustain; v.envState = 3; }
          else v.env = 1 - (v.envT / decay) * (1 - sustain);
          break;
        case 3:
          v.env = sustain;
          break;
        case 4:
          v.envT += dt;
          if (v.envT >= release) { v.env = 0; v.on = false; v.envState = 0; }
          else v.env = v.envRl * (1 - v.envT / release);
          break;
      }
      const freq = 440 * Math.pow(2, (v.note - 69) / 12);
      const inc = freq / this._sr;
      let raw: number;
      switch (this._cfg.oscillatorType as number) {
        case 0:
          raw = Math.sin(2 * Math.PI * v.ph);
          v.ph = (v.ph + inc) % 1;
          break;
        case 2:
          raw = v.ph < 0.5 ? 1 : -1;
          v.ph = (v.ph + inc) % 1;
          break;
        default:
          raw = 2 * (v.ph % 1) - 1;
          v.ph = (v.ph + inc) % 1;
      }
      sum += raw * v.env * v.vel * (this._cfg.volume as number);
    }
    return Math.max(-1, Math.min(1, sum));
  }
  process_block(n: number) {
    const buf = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const s = this.process_sample();
      buf[i * 2] = s;
      buf[i * 2 + 1] = s;
    }
    return buf;
  }
  free() {
    this._voices = [];
  }
}

const mockDsp = { PolySynth: MockPolySynth };

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
