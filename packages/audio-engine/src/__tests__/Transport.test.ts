import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Transport", () => {
  let Transport: Awaited<typeof import("../Transport")>["Transport"];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../Transport");
    Transport = mod.Transport;
  });

  describe("defaults", () => {
    it("inicia con valores default: stopped, 120bpm, 4/4, 960ppqn", () => {
      expect(Transport.state).toBe("stopped");
      expect(Transport.bpm).toBe(120);
      expect(Transport.timeSignature).toEqual({ beats: 4, beatValue: 4 });
      expect(Transport.ppqn).toBe(960);
      expect(Transport.position).toBe(0);
    });
  });

  describe("play()", () => {
    it("cambia state a 'playing'", () => {
      Transport.play();
      expect(Transport.state).toBe("playing");
    });
  });

  describe("stop()", () => {
    it("stop() resetea state y posicion a 0", () => {
      Transport.play();
      Transport.stop();
      expect(Transport.state).toBe("stopped");
      expect(Transport.position).toBe(0);
    });

    it("stop() sin play() es no-op", () => {
      Transport.stop();
      expect(Transport.state).toBe("stopped");
      expect(Transport.position).toBe(0);
    });
  });

  describe("pause()", () => {
    it("pausa conserva posicion", () => {
      Transport.play();
      Transport.pause();
      expect(Transport.state).toBe("paused");
      expect(Transport.position).toBeGreaterThanOrEqual(0);
    });

    it("resume desde pausa mantiene posicion", () => {
      Transport.play();
      Transport.pause();
      const pos = Transport.position;
      Transport.play();
      expect(Transport.state).toBe("playing");
      expect(Transport.position).toBe(pos);
    });
  });

  describe("setBpm()", () => {
    it("setBpm(140) actualiza bpm", () => {
      Transport.setBpm(140);
      expect(Transport.bpm).toBe(140);
    });

    it("setBpm(-10) no cambia", () => {
      Transport.setBpm(-10);
      expect(Transport.bpm).toBe(120);
    });

    it("setBpm(0) no cambia", () => {
      Transport.setBpm(0);
      expect(Transport.bpm).toBe(120);
    });

    it("setBpm(500) cambia (max 999)", () => {
      Transport.setBpm(500);
      expect(Transport.bpm).toBe(500);
    });

    it("setBpm(1000) no cambia (max 999)", () => {
      Transport.setBpm(1000);
      expect(Transport.bpm).toBe(120);
    });
  });

  describe("setTimeSignature()", () => {
    it("cambia a 3/4", () => {
      Transport.setTimeSignature(3, 4);
      expect(Transport.timeSignature).toEqual({ beats: 3, beatValue: 4 });
    });

    it("beats 0 no cambia", () => {
      Transport.setTimeSignature(0, 4);
      expect(Transport.timeSignature).toEqual({ beats: 4, beatValue: 4 });
    });

    it("beatValue 0 no cambia", () => {
      Transport.setTimeSignature(4, 0);
      expect(Transport.timeSignature).toEqual({ beats: 4, beatValue: 4 });
    });
  });

  describe("ciclo completo play-stop-play", () => {
    it("play → pause → play → stop funciona correctamente", () => {
      Transport.play();
      expect(Transport.state).toBe("playing");
      Transport.pause();
      expect(Transport.state).toBe("paused");
      const pos = Transport.position;
      Transport.play();
      expect(Transport.state).toBe("playing");
      expect(Transport.position).toBe(pos);
      Transport.stop();
      expect(Transport.state).toBe("stopped");
      expect(Transport.position).toBe(0);
    });
  });
});
