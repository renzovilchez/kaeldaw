import { describe, it, expect } from "vitest";
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
