import { describe, it, expect, vi, beforeEach } from "vitest";

const mockWasm = {
  default: vi.fn(async () => {}),
  delay_init: vi.fn(() => 1),
  delay_set: vi.fn(),
  delay_process: vi.fn((_h: number, input: number) => input * 0.5),
  delay_free: vi.fn(),
  reverb_init: vi.fn(() => 2),
  reverb_set: vi.fn(),
  reverb_process: vi.fn((_h: number, input: number) => input * 0.3),
  reverb_free: vi.fn(),
  ladder_init: vi.fn(() => 3),
  ladder_set: vi.fn(() => 1),
  ladder_process: vi.fn((_h: number, input: number) => input * 0.7),
  ladder_free: vi.fn(),
};

vi.mock("kaeldaw-dsp", () => mockWasm);

describe("WasmEffects", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // ── Happy path ──

  it("FEAT-056-01: initWasmEffects() resuelve sin error", async () => {
    const { initWasmEffects } = await import("../WasmEffects");
    await expect(initWasmEffects()).resolves.toBeUndefined();
  });

  it("FEAT-056-02: createWasmDelay retorna handle numerico", async () => {
    const { initWasmEffects, createWasmDelay } = await import("../WasmEffects");
    await initWasmEffects();
    const handle = createWasmDelay(44100, 2);
    expect(handle).toBe(1);
    expect(mockWasm.delay_init).toHaveBeenCalledWith(44100, 2);
  });

  it("FEAT-056-03: processWasmDelay retorna numero", async () => {
    const { initWasmEffects, createWasmDelay, setWasmDelay, processWasmDelay } = await import("../WasmEffects");
    await initWasmEffects();
    const h = createWasmDelay(44100);
    setWasmDelay(h, 0.4, 0.4, 0.3);
    const result = processWasmDelay(h, 1.0);
    expect(typeof result).toBe("number");
    expect(mockWasm.delay_process).toHaveBeenCalledWith(h, 1.0);
  });

  it("FEAT-056-04: createWasmReverb retorna handle numerico", async () => {
    const { initWasmEffects, createWasmReverb } = await import("../WasmEffects");
    await initWasmEffects();
    const handle = createWasmReverb(44100);
    expect(handle).toBe(2);
    expect(mockWasm.reverb_init).toHaveBeenCalledWith(44100);
  });

  it("FEAT-056-05: processWasmReverb retorna numero", async () => {
    const { initWasmEffects, createWasmReverb, setWasmReverb, processWasmReverb } = await import("../WasmEffects");
    await initWasmEffects();
    const h = createWasmReverb(44100);
    setWasmReverb(h, 0.4, 0.3, 0.5);
    const result = processWasmReverb(h, 1.0);
    expect(typeof result).toBe("number");
    expect(mockWasm.reverb_process).toHaveBeenCalledWith(h, 1.0);
  });

  it("FEAT-056-06: createWasmLadder retorna handle numerico", async () => {
    const { initWasmEffects, createWasmLadder } = await import("../WasmEffects");
    await initWasmEffects();
    const handle = createWasmLadder(44100);
    expect(handle).toBe(3);
    expect(mockWasm.ladder_init).toHaveBeenCalledWith(44100);
  });

  it("FEAT-056-07: processWasmLadder retorna numero", async () => {
    const { initWasmEffects, createWasmLadder, setWasmLadder, processWasmLadder } = await import("../WasmEffects");
    await initWasmEffects();
    const h = createWasmLadder(44100);
    setWasmLadder(h, 1000, 0.5);
    const result = processWasmLadder(h, 1.0);
    expect(typeof result).toBe("number");
    expect(mockWasm.ladder_process).toHaveBeenCalledWith(h, 1.0);
  });

  // ── Pre-init ──

  it("FEAT-056-08: createWasmDelay sin init lanza Error", async () => {
    const { createWasmDelay } = await import("../WasmEffects");
    expect(() => createWasmDelay(44100)).toThrow("WASM not initialized");
  });

  it("FEAT-056-09: createWasmReverb sin init lanza Error", async () => {
    const { createWasmReverb } = await import("../WasmEffects");
    expect(() => createWasmReverb(44100)).toThrow("WASM not initialized");
  });

  it("FEAT-056-10: createWasmLadder sin init lanza Error", async () => {
    const { createWasmLadder } = await import("../WasmEffects");
    expect(() => createWasmLadder(44100)).toThrow("WASM not initialized");
  });

  it("FEAT-056-11: processWasmDelay sin init retorna input", async () => {
    const { processWasmDelay } = await import("../WasmEffects");
    expect(processWasmDelay(1, 0.5)).toBe(0.5);
  });

  it("FEAT-056-12: processWasmReverb sin init retorna input", async () => {
    const { processWasmReverb } = await import("../WasmEffects");
    expect(processWasmReverb(1, 0.5)).toBe(0.5);
  });

  it("FEAT-056-13: processWasmLadder sin init retorna input", async () => {
    const { processWasmLadder } = await import("../WasmEffects");
    expect(processWasmLadder(1, 0.5)).toBe(0.5);
  });

  // ── Free ──

  it("freeWasmDelay llama delay_free", async () => {
    const { initWasmEffects, createWasmDelay, freeWasmDelay } = await import("../WasmEffects");
    await initWasmEffects();
    const h = createWasmDelay(44100);
    freeWasmDelay(h);
    expect(mockWasm.delay_free).toHaveBeenCalledWith(h);
  });

  it("freeWasmReverb llama reverb_free", async () => {
    const { initWasmEffects, createWasmReverb, freeWasmReverb } = await import("../WasmEffects");
    await initWasmEffects();
    const h = createWasmReverb(44100);
    freeWasmReverb(h);
    expect(mockWasm.reverb_free).toHaveBeenCalledWith(h);
  });

  it("freeWasmLadder llama ladder_free", async () => {
    const { initWasmEffects, createWasmLadder, freeWasmLadder } = await import("../WasmEffects");
    await initWasmEffects();
    const h = createWasmLadder(44100);
    freeWasmLadder(h);
    expect(mockWasm.ladder_free).toHaveBeenCalledWith(h);
  });
});
