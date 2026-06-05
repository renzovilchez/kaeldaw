import { describe, it, expect, vi, beforeEach } from "vitest";

class MockAudioContext {
  private _state: AudioContextState = "suspended";
  get state() {
    return this._state;
  }
  resume = vi.fn(async () => {
    this._state = "running";
  });
  suspend = vi.fn(async () => {
    this._state = "suspended";
  });
  close = vi.fn(async () => {
    this._state = "closed";
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("AudioContext", MockAudioContext as unknown as typeof AudioContext);
});

describe("AudioContextManager", () => {
  describe("init()", () => {
    it("crea el AudioContext y state es 'suspended' tras init", async () => {
      const { AudioContextManager } = await import("../AudioContextManager");
      AudioContextManager.init();
      expect(AudioContextManager.state).toBe("suspended");
    });

    it("getInstance() devuelve la misma referencia en llamadas multiples", async () => {
      const { AudioContextManager } = await import("../AudioContextManager");
      AudioContextManager.init();
      const a = AudioContextManager.getInstance();
      const b = AudioContextManager.getInstance();
      expect(a).toBe(b);
    });

    it("init() dos veces no crea un nuevo contexto", async () => {
      const { AudioContextManager } = await import("../AudioContextManager");
      AudioContextManager.init();
      const first = AudioContextManager.getInstance();
      AudioContextManager.init();
      const second = AudioContextManager.getInstance();
      expect(first).toBe(second);
    });
  });

  describe("resume()", () => {
    it("cambia state a 'running'", async () => {
      const { AudioContextManager } = await import("../AudioContextManager");
      AudioContextManager.init();
      await AudioContextManager.resume();
      expect(AudioContextManager.state).toBe("running");
    });

    it("lanza error si se llama sin init()", async () => {
      const { AudioContextManager } = await import("../AudioContextManager");
      await expect(AudioContextManager.resume()).rejects.toThrow(
        "AudioContext no inicializado"
      );
    });
  });

  describe("suspend()", () => {
    it("cambia state a 'suspended'", async () => {
      const { AudioContextManager } = await import("../AudioContextManager");
      AudioContextManager.init();
      await AudioContextManager.resume();
      await AudioContextManager.suspend();
      expect(AudioContextManager.state).toBe("suspended");
    });

    it("lanza error si se llama sin init()", async () => {
      const { AudioContextManager } = await import("../AudioContextManager");
      await expect(AudioContextManager.suspend()).rejects.toThrow(
        "AudioContext no inicializado"
      );
    });
  });

  describe("ciclo completo", () => {
    it("init → resume → suspend → resume mantiene sync de state", async () => {
      const { AudioContextManager } = await import("../AudioContextManager");
      AudioContextManager.init();
      expect(AudioContextManager.state).toBe("suspended");
      await AudioContextManager.resume();
      expect(AudioContextManager.state).toBe("running");
      await AudioContextManager.suspend();
      expect(AudioContextManager.state).toBe("suspended");
      await AudioContextManager.resume();
      expect(AudioContextManager.state).toBe("running");
    });
  });
});
