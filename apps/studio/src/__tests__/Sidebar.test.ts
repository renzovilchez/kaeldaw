import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@kaeldaw/instruments/PolySynthOutput", () => ({
  PolySynthOutput: { synthInstance: null, setConfig: vi.fn(), loadSample: vi.fn() },
}));

vi.mock("@kaeldaw/instruments/SampleCache", () => ({
  SampleCache: { get: vi.fn(), getMeta: vi.fn() },
}));

describe("InstrumentManager", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("FEAT-059-01: presets tiene 4 instrumentos por defecto", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    expect(instrumentManager.presets.length).toBeGreaterThanOrEqual(4);
  });

  it("FEAT-059-02: selectedId default es poly-saw", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    expect(instrumentManager.selectedId).toBe("poly-saw");
  });

  it("FEAT-059-03: selectPreset cambia selectedId", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    instrumentManager.selectPreset("poly-sine");
    expect(instrumentManager.selectedId).toBe("poly-sine");
  });

  it("FEAT-059-04: subscribe notifica cambios", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    const fn = vi.fn();
    instrumentManager.subscribe(fn);
    instrumentManager.selectPreset("poly-square");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("FEAT-059-05: selectPreset con ID invalido no cambia selectedId", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    instrumentManager.selectPreset("nonexistent");
    expect(instrumentManager.selectedId).toBe("poly-saw");
  });

  it("FEAT-059-06: unsubscribe deja de recibir notificaciones", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    const fn = vi.fn();
    const unsub = instrumentManager.subscribe(fn);
    unsub();
    instrumentManager.selectPreset("poly-sine");
    expect(fn).not.toHaveBeenCalled();
  });

  it("FEAT-059-07: saveCustomPreset agrega preset y lo selecciona", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    const count = instrumentManager.presets.length;
    instrumentManager.saveCustomPreset("Test", "synth");
    expect(instrumentManager.presets).toHaveLength(count + 1);
    expect(instrumentManager.selectedId).toBe(instrumentManager.presets[count].id);
  });
});