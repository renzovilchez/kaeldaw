import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@kaeldaw/instruments/PolySynthOutput", () => ({
  PolySynthOutput: { synthInstance: null },
}));

describe("InstrumentManager", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("FEAT-059-01: presets tiene 5 instrumentos", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    expect(instrumentManager.presets).toHaveLength(5);
  });

  it("FEAT-059-02: selectedId default es poly-saw", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    expect(instrumentManager.selectedId).toBe("poly-saw");
  });

  it("FEAT-059-03: collapsed vacio por defecto", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    expect(instrumentManager.collapsed).toEqual({});
  });

  it("FEAT-059-04: toggleCategory colapsa categoria", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    instrumentManager.toggleCategory("Synths");
    expect(instrumentManager.collapsed).toEqual({ Synths: true });
  });

  it("FEAT-059-05: toggleCategory expande categoria colapsada", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    instrumentManager.toggleCategory("Synths");
    instrumentManager.toggleCategory("Synths");
    expect(instrumentManager.collapsed).toEqual({ Synths: false });
  });

  it("FEAT-059-06: selectPreset cambia selectedId", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    instrumentManager.selectPreset("poly-sine");
    expect(instrumentManager.selectedId).toBe("poly-sine");
  });

  it("FEAT-059-07: subscribe notifica cambios", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    const fn = vi.fn();
    instrumentManager.subscribe(fn);
    instrumentManager.toggleCategory("Synths");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("selectPreset con ID invalido no cambia selectedId", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    instrumentManager.selectPreset("nonexistent");
    expect(instrumentManager.selectedId).toBe("poly-saw");
  });

  it("unsubscribe deja de recibir notificaciones", async () => {
    const { instrumentManager } = await import("../stores/useInstrumentStore");
    const fn = vi.fn();
    const unsub = instrumentManager.subscribe(fn);
    unsub();
    instrumentManager.toggleCategory("Synths");
    expect(fn).not.toHaveBeenCalled();
  });
});
