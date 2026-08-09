import { describe, it, expect, vi } from "vitest";

class MockSampler {
  _sr: number;
  _buf: Float32Array | null = null;
  _root = 60;
  _pos = 0;
  _on = false;
  _freed = false;
  constructor(sr: number) {
    this._sr = sr;
  }
  set_sample(data: Float32Array, _sr: number, rootNote: number) {
    this._buf = data;
    this._root = rootNote;
  }
  has_sample() {
    return this._buf !== null;
  }
  note_on() {
    if (this._buf) this._on = true;
  }
  note_off() {}
  all_notes_off() {
    this._on = false;
  }
  process_sample() {
    if (!this._on || !this._buf) return 0;
    const v = this._buf[Math.floor(this._pos)] ?? 0;
    this._pos += 1;
    return v;
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
    this._freed = true;
  }
}

const mockDsp = { Sampler: MockSampler };

vi.mock("kaeldaw-dsp", () => mockDsp);

import { setDspModule } from "../Sampler";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
setDspModule(mockDsp as any);

import { Sampler } from "../Sampler";

describe("Sampler (wrapper Rust)", () => {
  it("setSample activa hasSample", () => {
    const sampler = new Sampler(48000);
    expect(sampler.hasSample).toBe(false);
    sampler.setSample(new Float32Array([1, 0.5, 0]), 44100, 60);
    expect(sampler.hasSample).toBe(true);
    expect(sampler.rootNote).toBe(60);
  });

  it("noteOn produce audio en process()", () => {
    const sampler = new Sampler(48000);
    sampler.setSample(new Float32Array([0.5, 0.25, 0]), 44100, 60);
    sampler.noteOn(60, 100);
    const [l, r] = sampler.process();
    expect(l).toBe(r);
  });

  it("processBlock retorna buffer de 2*n floats", () => {
    const sampler = new Sampler(48000);
    sampler.setSample(new Float32Array([0.5, 0.25, 0]), 44100, 60);
    sampler.noteOn(60, 100);
    const buf = sampler.processBlock(64);
    expect(buf.length).toBe(128);
  });

  it("destroy libera el motor", () => {
    const sampler = new Sampler(48000);
    sampler.destroy();
    const mock = (sampler as unknown as { _sampler: MockSampler })._sampler;
    expect(mock._freed).toBe(true);
  });
});
